import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import { MessageDispatcher } from './message-dispatcher';
import { AnalysisController } from './analysis-controller';
import { SessionManager } from './session-manager';
import { MessageType, WebSocketMessage } from './types';
import { ConsoleLogger } from './logger';

export interface WebSocketServerOptions {
  port?: number;
  enableLogging?: boolean;
}

export class SimpleWebSocketServer {
  private wss: WSServer | null = null;
  private connections = new Map<string, WebSocket>();
  private sessions = new SessionManager();
  private logger = new ConsoleLogger(true);
  private dispatcher = new MessageDispatcher({
    sessions: this.sessions,
    analysis: new AnalysisController(this.sessions),
    send: this.send.bind(this),
    now: () => Date.now(),
    logger: this.logger,
  });

  constructor(private options: WebSocketServerOptions = {}) {}

  start(port?: number): void {
    const p = port ?? this.options.port ?? 8080;
    this.wss = new WSServer({ port: p });

    this.wss.on('connection', socket => this.handleConnection(socket));
    if (this.options.enableLogging) {
      this.logger.info(`WebSocket server listening on ws://localhost:${p}`);
    }
  }

  private handleConnection(socket: WebSocket): void {
    const socketId = randomUUID();
    this.connections.set(socketId, socket);
    this.logger.info('New WebSocket connection', { socketId });

    socket.on('message', async data => {
      const text = data.toString();
      this.logger.info('Raw WS message received', { socketId, text });
      try {
        const msg = JSON.parse(text) as WebSocketMessage;
        await this.dispatcher.dispatch(socketId, msg);
      } catch (err) {
        this.logger.error('Failed to parse WS message JSON', { socketId, error: (err as any)?.message });
        this.send(socketId, {
          type: MessageType.ERROR,
          payload: {
            code: 'INVALID_MESSAGE',
            message: 'Invalid JSON or message format',
            recoverable: true,
          },
          timestamp: Date.now(),
        });
      }
    });

    socket.on('close', () => {
      this.logger.info('WebSocket connection closed', { socketId });
      this.connections.delete(socketId);
    });

    // Acknowledge connection (client should send CONNECT with optional sessionId next)
    this.send(socketId, {
      type: MessageType.CONNECT,
      payload: { socketId },
      timestamp: Date.now(),
    });
  }

  private send(socketId: string, message: WebSocketMessage): void {
    const socket = this.connections.get(socketId);
    if (!socket || socket.readyState !== socket.OPEN) return;
    this.logger.info('Sending WS message', { socketId, type: message.type, sessionId: message.sessionId });
    socket.send(JSON.stringify(message));
  }

  stop(): void {
    if (!this.wss) return;
    for (const [, socket] of this.connections) socket.close();
    this.connections.clear();
    this.wss.close();
    this.wss = null;
  }
}
