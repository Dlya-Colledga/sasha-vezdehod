export type VideoKind = 'direct' | 'youtube' | 'other';

export interface RoomState {
  url: string;
  kind: VideoKind | null;
  playing: boolean;
  time: number;
}

export type SyncAction = 'play' | 'pause' | 'seek' | 'timeupdate';

export type ServerMessage =
  | { type: 'created'; room: string; names: string[] }
  | { type: 'joined'; room: string; names: string[]; state: RoomState }
  | { type: 'error'; message: string }
  | { type: 'peers'; names: string[] }
  | { type: 'chat'; name: string; text: string }
  | { type: 'video-set'; url: string; kind: VideoKind }
  | { type: 'sync'; action: SyncAction; time: number; playing: boolean }
  | { type: 'system'; text: string }
  | { type: 'host-left'; reason: string };

export type ClientMessage =
  | { type: 'create'; name: string }
  | { type: 'join'; room: string; name: string }
  | { type: 'chat'; text: string }
  | { type: 'video-set'; url: string; kind: VideoKind }
  | { type: 'sync'; action: SyncAction; time: number; playing?: boolean };

export interface ChatMessage {
  id: string;
  name?: string;
  text: string;
  system?: boolean;
  self?: boolean;
}

export interface RoomSession {
  roomCode: string;
  isHost: boolean;
  myName: string;
  initialNames: string[];
  initialState: RoomState;
}
