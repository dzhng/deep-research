// WebSocket message and analysis types

export enum MessageType {
  CONNECT = 'connect',
  START_ANALYSIS = 'start_analysis',
  USER_INPUT = 'user_input',
  USER_ANSWER = 'user_answer',
  PROGRESS_UPDATE = 'progress_update',
  RESULTS = 'results',
  ERROR = 'error',
  DISCONNECT = 'disconnect',
}

export interface WebSocketMessage<T = any> {
  type: MessageType;
  sessionId?: string;
  payload?: T;
  timestamp: number;
}

export interface ConnectMessage
  extends WebSocketMessage<{ clientId?: string; sessionId?: string }> {
  type: MessageType.CONNECT;
}

export interface StartAnalysisMessage
  extends WebSocketMessage<{ requirement: string }> {
  type: MessageType.START_ANALYSIS;
  sessionId: string;
}

export interface UserInputMessage
  extends WebSocketMessage<{ response: string }> {
  type: MessageType.USER_INPUT;
  sessionId: string;
}

export interface UserAnswerMessage
  extends WebSocketMessage<{ response: string }> {
  type: MessageType.USER_ANSWER;
  sessionId: string;
}

export interface ProgressPayload {
  stage: 'initialization' | 'understanding' | 'completion';
  progress: number; // 0-100
  message?: string;
}

export interface ProgressUpdateMessage
  extends WebSocketMessage<ProgressPayload> {
  type: MessageType.PROGRESS_UPDATE;
  sessionId: string;
}

export interface ResultsPayload {
  insights: string[];
  conversationHistory: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  visitedUrls?: string[];
  flowChart?: string;
}

export interface ResultsMessage extends WebSocketMessage<ResultsPayload> {
  type: MessageType.RESULTS;
  sessionId: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  recoverable?: boolean;
  details?: any;
}

export interface ErrorMessage extends WebSocketMessage<ErrorPayload> {
  type: MessageType.ERROR;
}

export interface DisconnectMessage
  extends WebSocketMessage<{ reason?: string }> {
  type: MessageType.DISCONNECT;
}

export type Messages = {
  role: 'system' | 'user' | 'assistant';
  content: string;
}[];

export enum AnalysisState {
  IDLE = 'idle',
  ANALYZING = 'analyzing',
  WAITING_FOR_INPUT = 'waiting_for_input',
  PROCESSING_INPUT = 'processing_input',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface AnalysisSession {
  id: string;
  socketId: string;
  state: AnalysisState;
  messages: Messages;
  createdAt: Date;
  lastActivity: Date;
}
