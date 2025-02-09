import { createOpenAI, type OpenAIProviderSettings } from '@ai-sdk/openai';
import { getEncoding } from 'js-tiktoken';
import { z } from 'zod';
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from '@google/generative-ai';
import { RecursiveCharacterTextSplitter } from './text-splitter';

interface CustomOpenAIProviderSettings extends OpenAIProviderSettings {
  baseURL?: string;
}

// Provider Interface
export interface AIProvider {
  generateObject<T extends z.ZodType>(params: {
    system: string;
    prompt: string;
    schema: T;
    abortSignal?: AbortSignal;
    provider?: any;
  }): Promise<{ object: z.infer<T> }>;
}

// OpenAI Provider Implementation
class OpenAIProvider implements AIProvider {
  private static openai = createOpenAI({
    apiKey: process.env.OPENAI_KEY!,
    baseURL: process.env.OPENAI_ENDPOINT || 'https://api.openai.com/v1',
  } as CustomOpenAIProviderSettings);

  private static model = OpenAIProvider.openai(
    process.env.OPENAI_MODEL || 'o3-mini',
    {
      reasoningEffort: (process.env.OPENAI_MODEL || 'o3-mini').startsWith('o')
        ? 'medium'
        : undefined,
      structuredOutputs: true,
    }
  ) as any;

  async generateObject<T extends z.ZodType>(params: {
    system: string;
    prompt: string;
    schema: T;
    abortSignal?: AbortSignal;
    provider?: any;
  }): Promise<{ object: z.infer<T> }> {
    try {
      const { provider: _, ...rest } = params;
      return await OpenAIProvider.model(rest);
    } catch (error) {
      throw new Error(`OpenAI model error: ${error}`);
    }
  }
}

// Gemini Provider Implementation
class GeminiProvider implements AIProvider {
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor(apiKey: string) {
    const googleAI = new GoogleGenerativeAI(apiKey);
    this.model = googleAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-thinking-exp-01-21',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });
  }

  private generateExampleForSchema(schema: z.ZodType): string {
    if (!(schema instanceof z.ZodObject)) return "{}";

    const shape = schema._def.shape();
    const example: any = {};

    for (const [key, value] of Object.entries(shape)) {
      if (value instanceof z.ZodArray) {
        const elementType = value._def.type;
        if (elementType instanceof z.ZodObject) {
          // For arrays of objects, create a basic example
          example[key] = [{
            query: "example query",
            researchGoal: "example goal"
          }];
        } else {
          // For simple arrays (questions, learnings, etc)
          example[key] = ["first example", "second example"];
        }
      } else if (value instanceof z.ZodString) {
        example[key] = "sample content";
      }
    }

    return JSON.stringify(example, null, 2);
  }

  async generateObject<T extends z.ZodType>(params: {
    system: string;
    prompt: string;
    schema: T;
    abortSignal?: AbortSignal;
    provider?: any;
  }): Promise<{ object: z.infer<T> }> {
    // For report generation, use tagged format instead of JSON
    const isReportGeneration = Object.keys((params.schema as any)._def.shape() || {}).includes('reportMarkdown');
    
    const fullPrompt = isReportGeneration 
      ? `${params.system}

Follow these steps:

1. First, think about this request and analyze it carefully:
${params.prompt}

2. Format your response using the tags shown below.
   The reasoning section helps organize your thoughts.
   The report section contains the actual content.

Format your response EXACTLY like this, using these exact tags:

<REASONING>
Step 1: [Initial analysis]
Step 2: [Key points considered]
Step 3: [Final reasoning]
</REASONING>

<REPORT>
[Your markdown report here]
</REPORT>

IMPORTANT INSTRUCTIONS:
- The <REPORT> section must contain properly formatted markdown content
- Format the report professionally with clear sections and headings
- Include all relevant information from the research
- Make the report as detailed and comprehensive as possible`
      : `${params.system}

Follow these steps:

1. First, think about this request and analyze it carefully:
${params.prompt}

2. Format your complete response in TWO parts as shown below.
   The reasoning section helps organize your thoughts.
   The JSON section MUST match the schema structure EXACTLY.

Format your response EXACTLY like this, using these exact tags:

<REASONING>
Step 1: [Initial analysis]
Step 2: [Key points considered]
Step 3: [Final reasoning]
</REASONING>

<JSON>
${this.generateExampleForSchema(params.schema)}
</JSON>

IMPORTANT INSTRUCTIONS:
- The <JSON> section must contain ONLY valid JSON
- Your response must match this exact structure with fields: ${Object.keys((params.schema as any)._def.shape() || {}).join(', ')}
- Follow the example format precisely, replacing example values with real content
- No additional fields or different structure allowed
- No markdown formatting or code blocks
- Ensure all JSON syntax is valid`;

    const result = await this.model.generateContent(fullPrompt);
    const response = result.response;
    const content = response.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error('No content generated from Gemini');
    }

    try {
      const isReportGeneration = Object.keys((params.schema as any)._def.shape() || {}).includes('reportMarkdown');
      
      if (isReportGeneration) {
        // Extract report content for report generation
        const reportMatch = content?.match(/<REPORT>\s*([\s\S]*?)\s*<\/REPORT>/);
        if (!reportMatch?.[1]) {
          console.error('Full Gemini response:', content);
          throw new Error('Could not extract valid report content');
        }
        
        const reportContent = reportMatch[1].trim();
        return { 
          object: {
            reportMarkdown: reportContent
          } 
        } as any;
      } else {
        // Handle regular JSON responses
        const jsonMatch = content?.match(/<JSON>\s*([\s\S]*?)\s*<\/JSON>/);
        if (!jsonMatch?.[1]) {
          console.error('Full Gemini response:', content);
          throw new Error('Could not extract valid JSON section from response');
        }

        // Extract and clean up JSON content
        let jsonContent = jsonMatch[1]
          .trim()
          // Remove code block markers
          .replace(/```[a-z]*\n?/g, '')
          // Clean up structural issues
          .replace(/,(\s*[}\]])/g, '$1');

        const parsedContent = JSON.parse(jsonContent);
        const validatedObject = params.schema.parse(parsedContent);
        return { object: validatedObject };
      }
    } catch (error) {
      console.error('Full Gemini response:', content); // For debugging
      throw new Error(`Failed to parse Gemini response: ${error}`);
    }
  }
}

class ModelProvider {
  private static instance: ModelProvider;
  private currentProvider: AIProvider;

  private constructor() {
    this.currentProvider = new OpenAIProvider();
  }

  static getInstance(): ModelProvider {
    if (!ModelProvider.instance) {
      ModelProvider.instance = new ModelProvider();
    }
    return ModelProvider.instance;
  }

  setProvider(type: 'openai' | 'gemini'): void {
    if (type === 'openai') {
      this.currentProvider = new OpenAIProvider();
    } else {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY environment variable is required for Gemini');
      }
      this.currentProvider = new GeminiProvider(apiKey);
    }
  }

  getCurrentProvider(): AIProvider {
    return this.currentProvider;
  }
}

export const modelProvider = ModelProvider.getInstance();

const encoder = getEncoding('o200k_base');

const MinChunkSize = 140;

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
