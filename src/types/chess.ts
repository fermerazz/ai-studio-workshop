export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface PlayerInfo {
  id: string;
  name: string;
  color: PieceColor | null;
  connected: boolean;
  timeLeftMs: number;
}

export interface TimeControl {
  initialMinutes: number;
  incrementSeconds: number;
}

export type GameStatus =
  | 'waiting'
  | 'in_progress'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'resigned'
  | 'timeout';

export interface MoveRecord {
  from: string;
  to: string;
  san: string;
  piece: string;
  color: PieceColor;
  captured?: string;
  fen: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  color?: PieceColor;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface RoomState {
  code: string;
  fen: string;
  isCheck: boolean;
  isGameOver: boolean;
  status: GameStatus;
  winner: PieceColor | 'draw' | null;
  turn: PieceColor;
  timeControl: TimeControl;
  whitePlayer: PlayerInfo | null;
  blackPlayer: PlayerInfo | null;
  spectatorsCount: number;
  activeTimerColor: PieceColor | null;
  drawOffer: PieceColor | null;
  rematchOffer: PieceColor | null;
  messages: ChatMessage[];
  history: MoveRecord[];
}

export type BoardTheme = 'classic-wood' | 'tournament-green' | 'midnight-slate';
