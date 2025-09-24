import { AnalysisSession, AnalysisState, Messages } from './types';
import { randomUUID } from 'crypto';

export interface SessionManagerInterface {
  createSession(socketId: string): string;
  getSession(sessionId: string): AnalysisSession | null;
  updateSession(sessionId: string, data: Partial<AnalysisSession>): void;
  deleteSession(sessionId: string): void;
  getSessionsBySocketId(socketId: string): AnalysisSession[];
}

export class SessionManager implements SessionManagerInterface {
  private sessions = new Map<string, AnalysisSession>();

  createSession(socketId: string): string {
    const id = randomUUID();
    const now = new Date();
    const session: AnalysisSession = {
      id,
      socketId,
      state: AnalysisState.IDLE,
      messages: [],
      createdAt: now,
      lastActivity: now,
    };
    this.sessions.set(id, session);
    return id;
  }

  getSession(sessionId: string): AnalysisSession | null {
    return this.sessions.get(sessionId) || null;
  }

  updateSession(sessionId: string, data: Partial<AnalysisSession>): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const updated = { ...session, ...data, lastActivity: new Date() };
    this.sessions.set(sessionId, updated);
  }

  deleteSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getSessionsBySocketId(socketId: string): AnalysisSession[] {
    return Array.from(this.sessions.values()).filter(s => s.socketId === socketId);
  }
}
