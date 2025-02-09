import { z } from 'zod';
import { modelProvider } from './providers';

export type GenerateObjectParams<T extends z.ZodType> = {
  system: string;
  prompt: string;
  schema: T;
  abortSignal?: AbortSignal;
  model?: any; 
  provider?: any; 
};

export async function generateObject<T extends z.ZodType>(
  params: GenerateObjectParams<T>
): Promise<{ object: z.infer<T> }> {
  const enhancedParams = {
    ...params,
    provider: params.provider || { id: 'openai' },
  };
  return modelProvider.getCurrentProvider().generateObject(enhancedParams);
}

export { modelProvider, trimPrompt } from './providers';
