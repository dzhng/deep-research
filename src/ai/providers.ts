import { createOpenAI } from '@ai-sdk/openai';
import { getEncoding } from 'js-tiktoken';

import { RecursiveCharacterTextSplitter } from './text-splitter';

// Providers
const hasOpenAIKey = !!process.env.OPENAI_KEY;
const hasRequestyKey = !!process.env.REQUESTY_API_KEY;

if (!hasOpenAIKey && !hasRequestyKey) {
  throw new Error('No API keys found. Please provide either OPENAI_KEY or REQUESTY_API_KEY in your environment variables.');
}

// Initialize providers based on available keys
const openai = hasOpenAIKey ? createOpenAI({
  apiKey: process.env.OPENAI_KEY,
}) : null;

const requesty = hasRequestyKey ? createOpenAI({
  apiKey: process.env.REQUESTY_API_KEY,
  baseURL: 'https://router.requesty.ai/v1',
}) : null;

// Get the active provider
const activeProvider = openai || requesty;
if (!activeProvider) {
  throw new Error('No active provider found. This should never happen due to the previous check.');
}

// Create and export base models using the active provider
export const gpt4Model = activeProvider(hasOpenAIKey ? 'gpt-4o' : 'openai/gpt-4o', {
  structuredOutputs: true,
});

export const gpt4MiniModel = activeProvider('gpt-4o-mini', {
  structuredOutputs: true,
});

export const o3MiniModel = activeProvider(hasOpenAIKey ? 'o3-mini' : 'cline/o3-mini:medium', {
  ...(hasOpenAIKey ? { reasoningEffort: 'medium' } : {}),
  structuredOutputs: true,
});

// Create Requesty-specific models if both providers are available
let requestyGPT4Model;
let requestyGPT4MiniModel;
let requestyO3MiniModel;

if (hasRequestyKey && hasOpenAIKey && requesty) {
  requestyGPT4Model = requesty('openai/gpt-4o', {
    structuredOutputs: true,
  });

  requestyGPT4MiniModel = requesty('openai/gpt-4o-mini', {
    structuredOutputs: true,
  });

  requestyO3MiniModel = requesty('cline/o3-mini:medium', {
    structuredOutputs: true,
  });
}

export { requestyGPT4Model, requestyGPT4MiniModel, requestyO3MiniModel };

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
