import FirecrawlApp, { SearchResponse } from '@mendable/firecrawl-js';
import { generateObject } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';

import { getModel, trimPrompt } from './ai/providers';
import { writeFinalReport } from './deep-research';
import { generateFeedback } from './feedback';
import { searchWithSerper } from './googleSearch';
import { systemPrompt } from './prompt';
import { askQuestion } from './run';
import { throttler } from './throttle';

export type Messages = {
  role: 'system' | 'user' | 'assistant';
  content: string;
}[];

function log(...args: any[]) {
  console.log(...args);
}

export type UnderstandingProgress = {
  currentDepth: number;
  totalDepth: number;
  currentQuery?: string;
  totalQueries: number;
  completedQueries: number;
};

type UnderstandingResult = {
  insights: string[]; // renamed from "learnings" to clarify intent
  visitedUrls: string[];
};

// Keep concurrency limit same
const ConcurrencyLimit = Number(process.env.FIRECRAWL_CONCURRENCY) || 2;

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_KEY ?? '',
  apiUrl: process.env.FIRECRAWL_BASE_URL,
});

// ⬇️ This function now focuses on refining and deepening a single requirement, not generating diverse queries.
async function generateRequirementClarifications({
  messages,
  depthLevel,
  previousInsights,
}: {
  messages: Messages;
  depthLevel: number;
  previousInsights?: string[];
}) {
  messages.push({
    role: 'user',
    content: `You are a senior business analyst.
    Your task is to deeply understand and clarify the following requirement step-by-step.
    Focus on edge cases, dependencies, hidden constraints, risks, and stakeholder needs.
    Do not generate new unrelated queries; instead, make the current requirement clearer and more actionable.
    
    Provide detailed clarifications and follow-up questions to further understand the requirement.`,
  });
  const res = await throttler(() =>
    generateObject({
      model: getModel(),
      output: 'object',
      system: systemPrompt(),
      messages: messages,
      // prompt:messages,
      schema: z.object({
        clarifications: z
          .array(z.string())
          .describe('List of clarified insights or breakdown points'),
        followUpQuestions: z
          .array(z.string())
          .describe(
            'Deepening questions to further understand the requirement',
          ),
      }),
    }),
  );

  log(
    `Generated ${res.object.clarifications.length} clarifications`,
    res.object.clarifications,
  );
  messages.push({
    role: 'assistant',
    content: `clarifications\n ${res.object.clarifications.join('\n')} \n\n followUpQuestions\n ${res.object.followUpQuestions.join('\n')}`,
  });
  return res.object;
}

async function processRequirementContent({
  requirement,
  result,
  depthLevel,
  messages,
}: {
  requirement: string;
  result: SearchResponse;
  depthLevel: number;
  messages?: Messages;
}) {
  const contents = compact(result.data.map(item => item.markdown)).map(
    content => trimPrompt(content, 25_000),
  );
  log(`Analyzing ${requirement}, found ${contents.length} relevant documents`);

  messages?.push({
    content: trimPrompt(
      `Given the following documents, extract and summarize information specifically helpful for understanding the requirement: <requirement>${requirement}</requirement>.
      Focus on dependencies, constraints, examples, risks, and technical considerations.
  
      <documents>
      ${contents.map(c => `<doc>\n${c}\n</doc>`).join('\n')}
      </documents>
  
      Return insights that will help clarify or refine the requirement for a business/engineering team.`,
    ),
    role: 'user',
  });
  // CHANGED: Focused prompt for extracting insights from documents specifically for requirement understanding
  const res = await throttler(() =>
    generateObject({
      model: getModel(),
      mode: 'json',
      abortSignal: AbortSignal.timeout(60_000),
      system: systemPrompt(),
      messages: messages as any,
      prompt: messages
        ? undefined
        : trimPrompt(
            `Given the following documents, extract and summarize information specifically helpful for understanding the requirement: <requirement>${requirement}</requirement>.
    Focus on dependencies, constraints, examples, risks, and technical considerations.

    <documents>
    ${contents.map(c => `<doc>\n${c}\n</doc>`).join('\n')}
    </documents>

    Return insights that will help clarify or refine the requirement for a business/engineering team.`,
          ),
      schema: z.object({
        insights: z
          .array(z.string())
          .describe('List of insights to clarify the requirement'),
      }),
    }),
  );
  messages?.push({
    content: res.object.insights.join('\n'),
    role: 'assistant',
  });

  return res.object;
}

export async function understandRequirement({
  requirement,
  depth = 1,
  previousInsights = [],
  visitedUrls = [],
  onProgress,
  messages,
}: {
  requirement?: string;
  depth?: number;
  previousInsights?: string[];
  visitedUrls?: string[];
  onProgress?: (progress: UnderstandingProgress) => void;
  messages: Messages;
}): Promise<UnderstandingResult> {
  const progress: UnderstandingProgress = {
    currentDepth: depth,
    totalDepth: depth,
    totalQueries: 1, // we focus on 1 main requirement, not multiple queries
    completedQueries: 0,
  };

  const reportProgress = (update: Partial<UnderstandingProgress>) => {
    Object.assign(progress, update);
    onProgress?.(progress);
  };

  // 🔑 Instead of generating multiple queries, we clarify the same requirement repeatedly (depth-wise)
  const clarifications = await generateRequirementClarifications({
    messages: messages,
    depthLevel: depth,
    previousInsights,
  });

  reportProgress({
    currentDepth: depth,
    currentQuery: requirement,
  });

  const limit = pLimit(ConcurrencyLimit);
  const results = await Promise.all(
    clarifications.followUpQuestions.splice(0, 1).map((followUp, index) =>
      limit(async () => {
        try {
          const result = await throttler(() =>
            // firecrawl
            //   .search(followUp, {
            //     timeout: 15000,
            //     limit: 5,
            //     scrapeOptions: { formats: ['markdown'] },
            //   })
            searchWithSerper(followUp).catch(e => {
              const errorResult: SearchResponse = {
                data: [],
                success: false,
                error: e?.message ?? 'No result found',
              };
              return errorResult;
            }),
          );

          const newUrls = compact(result.data.map(item => item.url));
          const newDepth = depth - 1;

          const newInsights = await processRequirementContent({
            requirement: followUp,
            result,
            depthLevel: newDepth,
            messages,
          });

          const allInsights = [
            ...previousInsights,
            ...clarifications.clarifications,
            ...newInsights.insights,
          ];
          const allUrls = [...visitedUrls, ...newUrls];

          if (newDepth > 0) {
            log(
              `Going deeper for requirement understanding, depth: ${newDepth}`,
            );

            reportProgress({
              currentDepth: newDepth,
              completedQueries: progress.completedQueries + 1,
              currentQuery: followUp,
            });

            return understandRequirement({
              requirement: followUp,
              depth: newDepth,
              previousInsights: allInsights,
              visitedUrls: allUrls,
              onProgress,
              messages: messages,
            });
          } else {
            return { insights: allInsights, visitedUrls: allUrls };
          }
        } catch (e: any) {
          log(`Error analyzing follow-up: ${followUp}`, e);
          return { insights: [], visitedUrls: [] };
        }
      }),
    ),
  );

  return {
    insights: [...new Set(results.flatMap(r => r.insights))],
    visitedUrls: [...new Set(results.flatMap(r => r.visitedUrls))],
  };
}

// Utility function to split text
function splitRequirementIntoChunks(text: string, chunkSize: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let current: string[] = [];

  for (const word of words) {
    if (current.join(' ').length + word.length > chunkSize) {
      chunks.push(current.join(' '));
      current = [];
    }
    current.push(word);
  }
  if (current.length) chunks.push(current.join(' '));
  return chunks;
}

export async function understandRequirementNew({
  fullRequirement,
  messages,
  askQuestion,
}: {
  fullRequirement: string;
  messages: Messages;
  askQuestion: (question: string) => Promise<string>;
}) {
  try {
    // 1. Split the requirement into manageable chunks.
    //    This prevents hitting token limits and allows step-by-step analysis.
    const chunks = splitRequirementIntoChunks(fullRequirement, 30000);

    // 3. Process each chunk sequentially, adding it to the conversation.
    for (let i = 0; i < chunks.length; i++) {
      messages.push({
        role: 'user',
        content: `
        This is part ${i + 1} of ${chunks.length} of a large requirement document. 
        Analyze and extract the key functional and non-functional requirements, dependencies, constraints, and scope.
        Keep the output self-contained and detailed, as this will be combined with other parts later.

        <requirement>${chunks[i]}</requirement>
      `,
      });

      const res = await throttler(() =>
        generateObject({
          model: getModel(),
          mode: 'json',
          messages,
          schema: z.object({
            insights: z
              .string()
              .describe(
                'Detailed understanding of this part of the requirement, considering prior context if available.',
              ),
          }),
        }),
      );

      // Add assistant response to conversation for future context
      messages.push({
        role: 'assistant',
        content: res.object.insights,
      });
    }

    // disable feed back for the reduce query
    const followUpQuestions = await generateFeedback({
      messages,
    });

    const answers: string[] = [];
    for (const question of followUpQuestions) {
      const answer = await askQuestion(`\n${question}\nYour answer: `);
      answers.push(answer);
    }

    messages.push({
      role: 'user',
      content: `
   Follow-up Questions and Answers:
   ${followUpQuestions.map((q: string, i: number) => `Q: ${q}\nA: ${answers[i]}`).join('\n')}
    `,
    });
    messages.push({
      role: 'assistant',
      content: `okay`,
    });

    await understandRequirement({
      depth: 2,
      messages,
    });

    const report = await writeFinalReport({
      messages: messages,
      prompt: fullRequirement,
      learnings: JSON.stringify(messages),
      visitedUrls: [],
    });
    return report;
  } catch (e) {
    console.log(e, 'error bro here');
  }
}

/**
 * 
 1. i want to manage chat into single chat window for the context awareness how can i able to it for use gemini model
 2. ask user question for the depth any doubt are there and also ask for the confirmation
 3. generate a JSON for the summerise and the requirement flow in the agent mode

 */
