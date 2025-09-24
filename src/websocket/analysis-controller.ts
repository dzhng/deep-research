import { understandRequirementNew } from '../understand-requirment';
import { SessionManagerInterface } from './session-manager';
import { AnalysisState, Messages, ResultsPayload } from './types';

export interface AnalysisControllerInterface {
  start(options: {
    sessionId: string;
    requirement: string;
    askQuestion: (value: string) => Promise<string>;
  }): Promise<ResultsPayload>;
}

export class AnalysisController implements AnalysisControllerInterface {
  constructor(private sessions: SessionManagerInterface) {}

  async start({
    requirement,
    sessionId,
    askQuestion,
  }: {
    sessionId: string;
    requirement: string;
    askQuestion: (value: string) => Promise<string>;
  }): Promise<ResultsPayload> {
    const session = this.sessions.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    this.sessions.updateSession(sessionId, { state: AnalysisState.ANALYZING });

    session.messages.push({
      role: 'system',
      content:
        'You are a requirement analysis agent. Your task is to deeply understand complex requirements and keep track of context across multiple inputs.',
    });

    this.sessions.updateSession(sessionId, { messages: session.messages });

    // Use your existing analysis function
    const flowChart = await understandRequirementNew({
      fullRequirement: requirement,
      messages: session.messages,
      askQuestion: askQuestion,
    });

    this.sessions.updateSession(sessionId, {
      state: AnalysisState.COMPLETED,
      messages: session.messages,
    });

    return {
      insights: session.messages
        .filter(m => m.role === 'assistant')
        .map(m => m.content)
        .filter(c => c && c.length > 0),
      conversationHistory: session.messages,
      visitedUrls: [],
      flowChart: flowChart,
    };
  }
}
