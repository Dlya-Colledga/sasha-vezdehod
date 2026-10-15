import type { ClientMessage, ServerMessage } from '../types';

type MessageListener = (msg: ServerMessage) => void;
type CloseListener = () => void;

const CONNECT_ATTEMPTS = 6;
const PER_ATTEMPT_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 2000;

export class RelayClient {
  private ws: WebSocket | null = null;
  private messageListeners = new Set<MessageListener>();
  private closeListeners = new Set<CloseListener>();

  // Бесплатный сервер на Render засыпает без активности и может просыпаться
  // до ~50 секунд — поэтому пробуем несколько раз, а не падаем с первой ошибки.
  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tryOnce = (attemptsLeft: number) => {
        let settled = false;
        const ws = new WebSocket(url);

        const timeoutId = setTimeout(() => {
          if (settled) return;
          settled = true;
          ws.close();
          if (attemptsLeft > 1) setTimeout(() => tryOnce(attemptsLeft - 1), RETRY_DELAY_MS);
          else reject(new Error('connect-failed'));
        }, PER_ATTEMPT_TIMEOUT_MS);

        ws.onopen = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          this.ws = ws;
          ws.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data as string) as ServerMessage;
              this.messageListeners.forEach((l) => l(msg));
            } catch {
              // malformed message, ignore
            }
          };
          ws.onclose = () => {
            this.closeListeners.forEach((l) => l());
          };
          resolve();
        };
        ws.onerror = () => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutId);
          if (attemptsLeft > 1) setTimeout(() => tryOnce(attemptsLeft - 1), RETRY_DELAY_MS);
          else reject(new Error('connect-failed'));
        };
      };

      tryOnce(CONNECT_ATTEMPTS);
    });
  }

  onMessage(listener: MessageListener) {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onClose(listener: CloseListener) {
    this.closeListeners.add(listener);
    return () => this.closeListeners.delete(listener);
  }

  send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close() {
    this.ws?.close();
    this.ws = null;
  }
}
