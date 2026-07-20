import cors from 'cors';
import express, { Request, Response } from 'express';

import { deepResearch, writeFinalAnswer, writeFinalReport } from './deep-research';

const app = express();
const port = process.env.PORT || 3051;

// --- Configuration ---
const apiKey = process.env.API_KEY;
const allowedOrigins = process.env.ALLOWED_ORIGINS;
const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '30', 10);

// In-memory request store for rate limiting
const requestLog = new Map<string, { count: number; resetAt: number }>();

// --- Middleware ---

// CORS: restrict to configured origins, or allow all
const corsOptions: cors.CorsOptions = {
  methods: ['POST'],
};
if (allowedOrigins) {
  corsOptions.origin = allowedOrigins.split(',').map(s => s.trim());
}
app.use(cors(corsOptions));

app.use(express.json());

// Optional API key authentication
if (apiKey) {
  app.use('/api', (req, res, next) => {
    const provided = req.headers['x-api-key'];
    if (provided === apiKey) return next();
    return res.status(401).json({ error: 'Unauthorized' });
  });
}

// Rate limiting per IP
app.use('/api', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = requestLog.get(ip);

  if (!entry || now > entry.resetAt) {
    requestLog.set(ip, { count: 1, resetAt: now + rateLimitWindow });
    return next();
  }

  if (entry.count >= rateLimitMax) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  entry.count++;
  return next();
});

// Helper function for consistent logging
function log(...args: any[]) {
  console.log(...args);
}

// API endpoint to run research
app.post('/api/research', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    const depth = Math.min(Math.max(parseInt(req.body.depth) || 3, 1), 5);
    const breadth = Math.min(Math.max(parseInt(req.body.breadth) || 3, 1), 10);

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    log('\nStarting research...\n');

    const { learnings, visitedUrls } = await deepResearch({
      query,
      breadth,
      depth,
    });

    log(`\n\nLearnings:\n\n${learnings.join('\n')}`);
    log(
      `\n\nVisited URLs (${visitedUrls.length}):\n\n${visitedUrls.join('\n')}`,
    );

    const answer = await writeFinalAnswer({
      prompt: query,
      learnings,
    });

    // Return the results
    return res.json({
      success: true,
      answer,
      learnings,
      visitedUrls,
    });
  } catch (error: unknown) {
    console.error('Error in research API:', error);
    return res.status(500).json({
      error: 'An error occurred during research',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// generate report API
app.post('/api/generate-report',async(req:Request,res:Response)=>{
  try{
    const {query} = req.body;
    const depth = Math.min(Math.max(parseInt(req.body.depth) || 3, 1), 5);
    const breadth = Math.min(Math.max(parseInt(req.body.breadth) || 3, 1), 10);
    if(!query){
      return res.status(400).json({error:'Query is required'});
    }
    log('\n Starting research...\n')
    const {learnings,visitedUrls} = await deepResearch({
      query,
      breadth,
      depth
    });
    log(`\n\nLearnings:\n\n${learnings.join('\n')}`);
    log(
      `\n\nVisited URLs (${visitedUrls.length}):\n\n${visitedUrls.join('\n')}`,
    );
    const report = await writeFinalReport({
      prompt:query,
      learnings,
      visitedUrls
    });

    return res.json({success:true,report})
    
  }catch(error:unknown){
    console.error("Error in generate report API:",error)
    return res.status(500).json({
      error:'An error occurred during research',
      message:error instanceof Error? error.message: String(error),
    })
  }
})



// Start the server
app.listen(port, () => {
  console.log(`Deep Research API running on port ${port}`);
  if (apiKey) console.log('[config] API key authentication enabled');
  if (allowedOrigins) console.log(`[config] CORS restricted to: ${allowedOrigins}`);
  console.log(`[config] Rate limit: ${rateLimitMax} requests per ${rateLimitWindow / 1000}s window`);
});

export default app;
