import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { getEncoding } from 'js-tiktoken';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

import { RecursiveCharacterTextSplitter } from './text-splitter';

// Providers

const openai = createOpenAI({
  apiKey: process.env.OPENAI_KEY!,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const openaiCompatible = createOpenAICompatible({
  apiKey: process.env.PROVIDER_API_KEY!,
});

// Models

export const gpt4Model = openai('gpt-4o', {
  structuredOutputs: true,
});
export const gpt4MiniModel = openai('gpt-4o-mini', {
  structuredOutputs: true,
});
// Using openai for o3-mini & o3-preview
export const o3MiniModel = openai('o3-mini', {
  reasoningEffort: 'medium',
  structuredOutputs: true,
});
export const o3Model = openai('o3-preview', {
  reasoningEffort: 'medium',
  structuredOutputs: true,
});

// Using Anthropic's Claude Sonnet 3.5 model via direct API shas a rate limit of 40k input tokens per minute (for tier 1 users),
// which is too restrictive for our deep research use case
export const claudeSonnetModel = anthropic('claude-3-5-sonnet-20241022', {
  structuredOutputs: true,
});

// Using openrouter, claude sonnet 3.5 one working so far, other models need more adjustments & testing
export const openrouterSonnetModel = openrouter('anthropic/claude-3.5-sonnet', {
  structuredOutputs: true,
});

// Using openai-compatible provider, replace provider-name & baseURL with the provider's name & base URL
export const openAICompatible = createOpenAICompatible({
  name: 'provider-name',
  apiKey: process.env.PROVIDER_API_KEY,
  baseURL: 'https://api.provider.com/v1',
});


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

  // last catch, there's a chance that the trimmed prompt is same length as the original prompt, handle by hard cutting
  if (trimmedPrompt.length === prompt.length) {
    return trimPrompt(prompt.slice(0, chunkSize), contextSize);
  }

  // recursively trim until the prompt is within the context size
  return trimPrompt(trimmedPrompt, contextSize);
}
