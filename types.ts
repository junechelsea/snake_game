
export enum AppStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  ERROR = 'ERROR',
}

export interface ConversationTurn {
  id: number;
  user: string;
  model: string;
}

export interface CurrentTurn {
  user: string;
  model: string;
}
