import { AnalysisController } from './analysis-controller';
import { SessionManager, SessionManagerInterface } from './session-manager';
import {
  ConnectMessage,
  DisconnectMessage,
  ErrorMessage,
  MessageType,
  StartAnalysisMessage,
  UserAnswerMessage,
  UserInputMessage,
  WebSocketMessage,
} from './types';

export interface DispatcherContext {
  sessions: SessionManagerInterface;
  analysis: AnalysisController;
  send: (socketId: string, message: WebSocketMessage) => void;
  now: () => number;
}

export class MessageDispatcher {
  constructor(private ctx: DispatcherContext) {}

  userQuestions: Record<
    string,
    {
      resolve: (value: string) => void;
      reject: (reason: string) => void;
    }
  > = {};

  async dispatch(socketId: string, message: WebSocketMessage): Promise<void> {
    switch (message.type) {
      case MessageType.CONNECT:
        return this.handleConnect(socketId, message as ConnectMessage);
      case MessageType.START_ANALYSIS:
        return this.handleStart(socketId, message as StartAnalysisMessage);
      case MessageType.USER_INPUT:
        return this.handleUserInput(socketId, message as UserInputMessage);
      case MessageType.USER_ANSWER:
        return this.handleUserAnswer(socketId, message as UserAnswerMessage);
      case MessageType.DISCONNECT:
        return this.handleDisconnect(socketId, message as DisconnectMessage);
      default:
        return this.sendError(
          socketId,
          'UNSUPPORTED_TYPE',
          `Unsupported message type: ${message.type}`,
        );
    }
  }

  private handleConnect(socketId: string, msg: ConnectMessage): void {
    const existing = msg.payload?.sessionId;
    const sessionId = existing || this.ctx.sessions.createSession(socketId);
    this.ctx.send(socketId, {
      type: MessageType.CONNECT,
      sessionId,
      payload: { socketId, sessionId, reconnected: !!existing },
      timestamp: this.ctx.now(),
    });
  }

  private async handleStart(
    socketId: string,
    msg: StartAnalysisMessage,
  ): Promise<void> {
    try {
      const result = await this.ctx.analysis.start({
        askQuestion: async (value: string) => {
          this.ctx.send(socketId, {
            type: MessageType.USER_INPUT,
            payload: { value },
            timestamp: this.ctx.now(),
          });

          const answer = await new Promise<string>((resolve, reject) => {
            this.userQuestions[socketId] = { resolve, reject };
          });

          return answer || '';
        },
        requirement: msg.payload?.requirement || '',
        sessionId: msg.sessionId,
      });
      this.ctx.send(socketId, {
        type: MessageType.RESULTS,
        sessionId: msg.sessionId,
        payload: result,
        timestamp: this.ctx.now(),
      });
    } catch (error: any) {
      this.sendError(
        socketId,
        'ANALYSIS_ERROR',
        error?.message || 'Failed to start analysis',
      );
    }
  }

  private handleUserInput(socketId: string, msg: UserInputMessage): void {
    this.ctx.send(socketId, {
      type: MessageType.USER_INPUT,
      sessionId: msg.sessionId,
      payload: msg.payload,
      timestamp: this.ctx.now(),
    });
  }

  private handleUserAnswer(socketId: string, msg: UserAnswerMessage): void {
    this.userQuestions[socketId]?.resolve(msg.payload?.response || '');
  }

  private handleDisconnect(socketId: string, msg: DisconnectMessage): void {
    // Optional: clean up sessions for this socket
    // Keeping sessions in memory can help support reconnection patterns
    this.ctx.send(socketId, {
      type: MessageType.DISCONNECT,
      payload: { reason: msg.payload?.reason || 'client_requested' },
      timestamp: this.ctx.now(),
    });
  }

  private sendError(socketId: string, code: string, message: string): void {
    const err: ErrorMessage = {
      type: MessageType.ERROR,
      payload: { code, message, recoverable: false },
      timestamp: this.ctx.now(),
    };
    this.ctx.send(socketId, err);
  }
}
