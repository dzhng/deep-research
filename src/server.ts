import 'dotenv/config';
import express, { Request, Response, RequestHandler } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { deepResearch, writeFinalReport, type ResearchProgress } from './deep-research';
import { generateFeedback } from './feedback';

// Load environment variables from .env.local
import { config } from 'dotenv';
config({ path: '.env.local' });

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Handle upgrade requests
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

// WebSocket client sessions
const wsClients = new Map<string, Set<WebSocket>>();

// Types for API requests/responses
const InitiateResearchSchema = z.object({
  query: z.string(),
  breadth: z.number().int().min(1).max(10).default(4),
  depth: z.number().int().min(1).max(5).default(2),
});

const AnswerQuestionsSchema = z.object({
  researchId: z.string(),
  answers: z.array(z.string()),
});

// WebSocket message types
type WSMessage = {
  type: 'subscribe';
  researchId: string;
} | {
  type: 'unsubscribe';
  researchId: string;
};

// Handle WebSocket connections
wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as WSMessage;
      
      if (message.type === 'subscribe') {
        // Add client to research session subscribers
        if (!wsClients.has(message.researchId)) {
          wsClients.set(message.researchId, new Set());
        }
        wsClients.get(message.researchId)?.add(ws);
        
        // Send initial state if session exists
        const session = sessions.get(message.researchId);
        if (session) {
          ws.send(JSON.stringify({
            type: 'state',
            data: {
              status: session.status,
              progress: session.progress,
              result: session.result,
              error: session.error,
            },
          }));
        }
      } else if (message.type === 'unsubscribe') {
        // Remove client from research session subscribers
        wsClients.get(message.researchId)?.delete(ws);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    // Remove client from all research sessions
    for (const clients of wsClients.values()) {
      clients.delete(ws);
    }
  });
});

// Helper function to broadcast updates to subscribers
function broadcastUpdate(researchId: string, data: any) {
  const clients = wsClients.get(researchId);
  if (clients) {
    const message = JSON.stringify({
      type: 'update',
      data,
    });
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

// In-memory storage for research sessions
type ResearchSession = {
  id: string;
  query: string;
  breadth: number;
  depth: number;
  followUpQuestions: string[];
  answers?: string[];
  status: 'awaiting_answers' | 'in_progress' | 'completed' | 'error';
  progress?: ResearchProgress;
  result?: {
    learnings: string[];
    visitedUrls: string[];
    report: string;
  };
  error?: string;
};

const sessions = new Map<string, ResearchSession>();

// Generate a simple unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Initiate research endpoint
const initiateResearch: RequestHandler = async (req, res) => {
  try {
    const { query, breadth, depth } = InitiateResearchSchema.parse(req.body);
    
    // Generate follow-up questions
    const followUpQuestions = await generateFeedback({ query });
    
    // Create new research session
    const sessionId = generateId();
    const session: ResearchSession = {
      id: sessionId,
      query,
      breadth,
      depth,
      followUpQuestions,
      status: 'awaiting_answers',
    };
    
    sessions.set(sessionId, session);
    
    res.json({
      researchId: sessionId,
      followUpQuestions,
    });
  } catch (error) {
    console.error('Error initiating research:', error);
    res.status(400).json({ error: 'Invalid request parameters' });
  }
};

// Submit answers and start research
const submitAnswers: RequestHandler = async (req, res) => {
  try {
    const { researchId, answers } = AnswerQuestionsSchema.parse(req.body);
    
    const session = sessions.get(researchId);
    if (!session) {
      res.status(404).json({ error: 'Research session not found' });
      return;
    }
    
    if (session.status !== 'awaiting_answers') {
      res.status(400).json({ error: 'Invalid session status' });
      return;
    }
    
    // Update session with answers and start research
    session.answers = answers;
    session.status = 'in_progress';
    sessions.set(researchId, session);
    
    // Broadcast status update
    broadcastUpdate(researchId, {
      status: session.status,
      progress: session.progress,
    });
    
    // Start research process asynchronously
    startResearch(session).catch(error => {
      console.error('Error during research:', error);
      session.status = 'error';
      session.error = error instanceof Error ? error.message : 'Unknown error';
      sessions.set(researchId, session);
      
      // Broadcast error update
      broadcastUpdate(researchId, {
        status: session.status,
        error: session.error,
      });
    });
    
    res.json({ status: 'research_started' });
  } catch (error) {
    console.error('Error submitting answers:', error);
    res.status(400).json({ error: 'Invalid request parameters' });
  }
};

// Get research status endpoint
const getResearchStatus: RequestHandler<{ researchId: string }> = (req, res) => {
  const session = sessions.get(req.params.researchId);
  if (!session) {
    res.status(404).json({ error: 'Research session not found' });
    return;
  }
  
  res.json({
    status: session.status,
    progress: session.progress,
    result: session.result,
    error: session.error,
  });
};

// Register routes
app.post('/api/research/initiate', initiateResearch);
app.post('/api/research/submit-answers', submitAnswers);
app.get('/api/research/:researchId/status', getResearchStatus);

async function startResearch(session: ResearchSession) {
  try {
    // Combine initial query with follow-up questions and answers
    const combinedQuery = `
Initial Query: ${session.query}
Follow-up Questions and Answers:
${session.followUpQuestions.map((q, i) => `Q: ${q}\nA: ${session.answers?.[i] || ''}`).join('\n')}
`.trim();

    // Start deep research
    const { learnings, visitedUrls } = await deepResearch({
      query: combinedQuery,
      breadth: session.breadth,
      depth: session.depth,
      onProgress: (progress) => {
        session.progress = progress;
        sessions.set(session.id, session);
        
        // Broadcast progress update
        broadcastUpdate(session.id, {
          status: session.status,
          progress: session.progress,
        });
      },
    });

    // Generate final report
    const report = await writeFinalReport({
      prompt: combinedQuery,
      learnings,
      visitedUrls,
    });

    // Update session with results
    session.status = 'completed';
    session.result = {
      learnings,
      visitedUrls,
      report,
    };
    sessions.set(session.id, session);
    
    // Broadcast completion update
    broadcastUpdate(session.id, {
      status: session.status,
      result: session.result,
    });
  } catch (error) {
    session.status = 'error';
    session.error = error instanceof Error ? error.message : 'Unknown error';
    sessions.set(session.id, session);
    
    // Broadcast error update
    broadcastUpdate(session.id, {
      status: session.status,
      error: session.error,
    });
    throw error;
  }
}

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 