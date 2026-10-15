import type { SyncAction } from '../types';

export interface VideoStageHandle {
  applySync: (action: SyncAction, time: number, playing: boolean) => void;
}

export interface VideoStageProps {
  url: string;
  isHost: boolean;
  onHostEvent?: (action: SyncAction, time: number, playing: boolean) => void;
}
