import { GoogleGenerativeAI } from '@google/generative-ai';
import { getEncoding } from 'js-tiktoken';
import { z } from 'zod';
import { appendFileSync } from 'fs';

import { RecursiveCharacterTextSplitter } from './text-splitter';
import { RateLimiter } from '../utils/RateLimiter';

// Ensure that GOOGLE_API_KEY is provided
if (!process.env.GOOGLE_API_KEY) {
  throw new Error('Missing GOOGLE_API_KEY. Please set GOOGLE_API_KEY in your environment (e.g., in .env.local).');
}

// --- Rate Limiting Setup ---
// Configure the maximum calls per minute and rate limit interval.
const MAX_CALLS_PER_MINUTE = 10; // Adjust this value per your model's limit.
const RATE_LIMIT_INTERVAL_MS = 60000; // 60,000 ms = 1 minute.
const modelCallTimestamps: number[] = [];

// Create a RateLimiter instance for Gemini API (10 calls per minute)
const geminiLimiter = new RateLimiter(10, 60000);

// Helper function to enforce the rate limit.
// It removes outdated timestamps, then waits if we've reached the maximum allowed calls.
async function checkRateLimit() {
  await geminiLimiter.schedule(() => Promise.resolve());
}

// --- End of Rate Limiting Setup ---

// Providers
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Models
const geminiPro = genAI.getGenerativeModel({ model: "gemini-2.0-flash-thinking-exp-01-21" });

function logDebug(...args: any[]) {
  const timestamp = new Date().toISOString();
  // Only log non-object arguments or small object summaries
  const message = args.map(a => {
    if (typeof a === 'object') {
      if (a instanceof Error) return a.message;
      return '[Object]'; // Don't log raw content
    }
    return String(a);
  }).join(' ');
  const logMessage = `${timestamp} ${message}`;
  appendFileSync('debug.log', logMessage + '\n', { encoding: 'utf8', flag: 'a' });
  console.debug(message);
}

function logError(...args: any[]) {
  const timestamp = new Date().toISOString();
  const message = args.map(a => {
    if (typeof a === 'object') {
      if (a instanceof Error) return a.message;
      return '[Object]'; // Don't log raw content
    }
    return String(a);
  }).join(' ');
  const logMessage = `${timestamp} ERROR: ${message}`;
  appendFileSync('debug.log', logMessage + '\n', { encoding: 'utf8', flag: 'a' });
  console.error(message);
}

// Wrapper for Gemini to handle structured outputs with rate limiting.
export async function generateWithGemini<T>({ 
  prompt, 
  system = '', 
  schema 
}: { 
  prompt: string;
  system?: string;
  schema: z.ZodType<T>;
}) {
  const fullPrompt = `${system ? system + '\n\n' : ''}${prompt}

CRITICAL INSTRUCTIONS FOR RESPONSE FORMAT:
1. You MUST respond with ONLY pure JSON
2. NO markdown formatting (no \`\`\`json or \`\`\`)
3. NO explanations or additional text
4. The JSON must EXACTLY match this schema (pay special attention to array vs string types):
${schema.toString()}

Example of correct response format:
{
  "learnings": ["learning 1", "learning 2"],
  "followUpQuestions": ["question 1", "question 2"]
}

Example of incorrect response format:
{
  "learnings": [{ "learning": "learning 1" }],
  "followUpQuestions": "question 1"
}

IMPORTANT: Make sure arrays contain strings, not objects, unless explicitly required by the schema.`;
  
  // Enforce the model's rate limit.
  await checkRateLimit();
  logDebug("Sending request to API");

  let result;
  try {
    result = await geminiPro.generateContent(fullPrompt);
    logDebug("API request successful");
  } catch (apiError) {
    logError("API call failed", apiError);
    throw apiError;
  }

  const response = result.response;
  logDebug("Processing API response");

  let text;
  try {
    text = await response.text();
    logDebug("Successfully extracted response text");
  } catch (err) {
    logError("Failed to extract response text", err);
    throw err;
  }
  
  try {
    // Clean the response text - remove any markdown formatting
    const cleanedText = text
      .replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1') // Remove any markdown code fences with optional language tag
      .replace(/`/g, '') // Remove any residual backticks
      .trim() // Trim whitespace and newlines
      .replace(/\\n/g, ' ') // Replace escaped newlines with spaces
      .replace(/,\s*\]/g, ']') // Remove trailing commas in arrays
      .replace(/,\s*\}/g, '}'); // Remove trailing commas in objects
    
    try {
      // First try direct JSON parse
      const json = JSON.parse(cleanedText);
      const finalJson = Array.isArray(json) ? { ...json } : json;
      return { object: schema.parse(finalJson) };
    } catch (parseError) {
      // Fallback: try to extract JSON if still needed
      const jsonMatch = cleanedText.match(/[\{\[][\s\S]*[\}\]]/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const json = JSON.parse(jsonMatch[0]);
      const finalJson = Array.isArray(json) ? { ...json } : json;
      return { object: schema.parse(finalJson) };
    }
  } catch (e: any) {
    // Add more context to the error
    const errorMessage = e.message || '';
    const schemaContext = `Expected schema: ${schema.toString()}\n`;
    const responseContext = `Full response: ${text}`;
    throw new Error(`Failed to parse response as JSON: ${errorMessage}\n${schemaContext}${responseContext}`);
  }
}

export const geminiModel = {
  generate: generateWithGemini,
};

const MinChunkSize = 140;
const encoder = getEncoding('o200k_base');

// trim prompt to maximum context size
export function trimPrompt(prompt: string, contextSize = 120_000) {
  if (!prompt) {
    return '';
  }

  const length = encoder.encode(prompt).length;
  if (length <= contextSize) {
    return prompt;
  }

  const overflowTokens = length - contextSize;
  // on average it's 3 characters per token, so multiply by 3 to get a rough estimate of the number of characters
  const chunkSize = prompt.length - overflowTokens * 3;
  if (chunkSize < MinChunkSize) {
    return prompt.slice(0, MinChunkSize);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: 0,
  });
  const trimmedPrompt = splitter.splitText(prompt)[0] ?? '';

  // last catch, there's a chance that the trimmed prompt is same length as the original prompt, due to how tokens are split & innerworkings of the splitter, handle this case by just doing a hard cut
  if (trimmedPrompt.length === prompt.length) {
    return trimPrompt(prompt.slice(0, chunkSize), contextSize);
  }

  // recursively trim until the prompt is within the context size
  return trimPrompt(trimmedPrompt, contextSize);
}
