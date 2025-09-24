import { AnalysisController } from './analysis-controller';
import { ConsoleLogger, Logger } from './logger';
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
  logger?: Logger;
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
    this.ctx.logger?.info('Incoming WS message', {
      socketId,
      type: message.type,
      sessionId: message.sessionId,
    });
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
    this.ctx.logger?.info('Handling CONNECT message', { socketId, sessionId: msg.sessionId });
    const existing = msg.payload?.sessionId;
    const sessionId = existing || this.ctx.sessions.createSession(socketId);
    this.ctx.logger?.info('Session connected', { socketId, sessionId, reconnected: !!existing });
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
    this.ctx.logger?.info('Handling START_ANALYSIS message', { socketId, sessionId: msg.sessionId });
    try {
      this.ctx.logger?.info('Start analysis requested', {
        socketId,
        sessionId: msg.sessionId,
        hasRequirement: !!msg.payload?.requirement,
      });
      const result = await this.ctx.analysis.start({
        askQuestion: async (value: string) => {
          this.ctx.logger?.info('Asking user a question', { socketId, sessionId: msg.sessionId, question: value });
          this.ctx.send(socketId, {
            type: MessageType.USER_INPUT,
            payload: { value },
            timestamp: this.ctx.now(),
          });

          const answer = await new Promise<string>((resolve, reject) => {
            this.userQuestions[socketId] = { resolve, reject };
          });
          this.ctx.logger?.info('Received user answer (via USER_ANSWER)', { socketId, sessionId: msg.sessionId });

          return answer || '';
        },
        requirement: msg.payload?.requirement || '',
        sessionId: msg.sessionId,
      });
      this.ctx.logger?.info('Sending analysis results', { socketId, sessionId: msg.sessionId });
      this.ctx.send(socketId, {
        type: MessageType.RESULTS,
        sessionId: msg.sessionId,
        payload: result,
        timestamp: this.ctx.now(),
      });
    } catch (error: any) {
      this.ctx.logger?.error('Analysis error', { socketId, sessionId: msg.sessionId, error: error?.message });
      this.sendError(
        socketId,
        'ANALYSIS_ERROR',
        error?.message || 'Failed to start analysis',
      );
    }
  }

  private handleUserInput(socketId: string, msg: UserInputMessage): void {
    this.ctx.logger?.info('Handling USER_INPUT message', { socketId, sessionId: msg.sessionId });
    this.ctx.logger?.debug('Echoing USER_INPUT to client', { socketId, sessionId: msg.sessionId });
    this.ctx.send(socketId, {
      type: MessageType.USER_INPUT,
      sessionId: msg.sessionId,
      payload: msg.payload,
      timestamp: this.ctx.now(),
    });
  }

  private handleUserAnswer(socketId: string, msg: UserAnswerMessage): void {
    this.ctx.logger?.info('Handling USER_ANSWER message', { socketId, sessionId: msg.sessionId });
    this.ctx.logger?.info('Handling USER_ANSWER', { socketId, sessionId: msg.sessionId });
    this.userQuestions[socketId]?.resolve(msg.payload?.response || '');
  }

  private handleDisconnect(socketId: string, msg: DisconnectMessage): void {
    this.ctx.logger?.info('Handling DISCONNECT message', { socketId, sessionId: msg.sessionId });
    this.ctx.logger?.info('Socket disconnected', { socketId, reason: msg.payload?.reason });
    this.ctx.send(socketId, {
      type: MessageType.DISCONNECT,
      payload: { reason: msg.payload?.reason || 'client_requested' },
      timestamp: this.ctx.now(),
    });
  }

  private sendError(socketId: string, code: string, message: string, recoverable: boolean = false): void {
    this.ctx.logger?.error('Sending WS error', { socketId, code, message, recoverable });
    const err: ErrorMessage = {
      type: MessageType.ERROR,
      payload: { code, message, recoverable },
      timestamp: this.ctx.now(),
    };
    this.ctx.send(socketId, err);
  }
}
