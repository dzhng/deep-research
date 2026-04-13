import { createFireworks } from '@ai-sdk/fireworks';
import { createOpenAI } from '@ai-sdk/openai';
import {
  extractReasoningMiddleware,
  LanguageModelV1,
  wrapLanguageModel,
} from 'ai';
import { getEncoding } from 'js-tiktoken';

import { RecursiveCharacterTextSplitter } from './text-splitter';

// Providers
const openai = process.env.OPENAI_KEY
  ? createOpenAI({
      apiKey: process.env.OPENAI_KEY,
      baseURL: process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1',
    })
  : undefined;

const nvidia = process.env.NVIDIA_API_KEY
  ? createOpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1',
    })
  : undefined;

const fireworks = process.env.FIREWORKS_KEY
  ? createFireworks({
      apiKey: process.env.FIREWORKS_KEY,
    })
  : undefined;

const customModel = process.env.CUSTOM_MODEL
  ? openai?.(process.env.CUSTOM_MODEL, {
      structuredOutputs: true,
    })
  : undefined;

// Models

// NVIDIA models
const nvidiaLlama405bModel = nvidia?.('meta/llama-3.1-405b-instruct');
const nvidiaLlama70bModel = nvidia?.('meta/llama-3.1-70b-instruct');
const nvidiaLlama8bModel = nvidia?.('meta/llama-3.1-8b-instruct');
const nvidiaNemotron70bModel = nvidia?.('nvidia/llama-3.1-nemotron-70b-instruct');
// Commenting out problematic DeepSeek R1 model for now
// const nvidiaDeepSeekR1Model = nvidia?.('deepseek-ai/deepseek-r1');

const gpt4oMiniModel = openai?.('gpt-4o-mini', {
  structuredOutputs: true,
});

const gpt4oModel = openai?.('gpt-4o', {
  structuredOutputs: true,
});

const deepSeekR1Model = fireworks
  ? wrapLanguageModel({
      model: fireworks(
        'accounts/fireworks/models/deepseek-r1',
      ) as LanguageModelV1,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    })
  : undefined;

export function getModel(): LanguageModelV1 {
  if (customModel) {
    return customModel;
  }

  // Priority order: Start with smaller, more stable NVIDIA models, then fallback to other providers
  const model = nvidiaLlama70bModel ??
                nvidiaLlama8bModel ??
                nvidiaNemotron70bModel ?? 
                nvidiaLlama405bModel ??
                deepSeekR1Model ??
                gpt4oMiniModel ??
                gpt4oModel;
  
  if (!model) {
    throw new Error('No model found');
  }

  return model as LanguageModelV1;
}

const MinChunkSize = 140;
const encoder = getEncoding('o200k_base');

// trim prompt to maximum context size
export function trimPrompt(
  prompt: string,
  contextSize = Number(process.env.CONTEXT_SIZE) || 128_000,
) {
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
