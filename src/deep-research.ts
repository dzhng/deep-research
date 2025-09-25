import FirecrawlApp, { SearchResponse } from '@mendable/firecrawl-js';
import { generateObject, generateText } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';

import { getModel, trimPrompt } from './ai/providers';
import { systemJSONPrompt, systemPrompt } from './prompt';
import { throttler } from './throttle';
import { Messages } from './understand-requirment';

function log(...args: any[]) {
  console.log(...args);
}

export type ResearchProgress = {
  currentDepth: number;
  totalDepth: number;
  currentBreadth: number;
  totalBreadth: number;
  currentQuery?: string;
  totalQueries: number;
  completedQueries: number;
};

type ResearchResult = {
  learnings: string[];
  visitedUrls: string[];
};

// increase this if you have higher API rate limits
const ConcurrencyLimit = Number(process.env.FIRECRAWL_CONCURRENCY) || 2;

// Initialize Firecrawl with optional API key and optional base url

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_KEY ?? '',
  apiUrl: process.env.FIRECRAWL_BASE_URL,
});

// take en user query, return a list of SERP queries
async function generateSerpQueries({
  query,
  numQueries = 3,
  learnings,
}: {
  query: string;
  numQueries?: number;

  // optional, if provided, the research will continue from the last learning
  learnings?: string[];
}) {
  const res = await throttler(() =>
    generateObject({
      model: getModel(),
      output: 'object',
      system: systemPrompt(),
      prompt: `Given the following prompt from the user, generate a list of SERP queries to research the topic. Return a maximum of ${numQueries} queries, but feel free to return less if the original prompt is clear. Make sure each query is unique and not similar to each other: <prompt>${query}</prompt>\n\n${
        learnings
          ? `Here are some learnings from previous research, use them to generate more specific queries: ${learnings.join(
              '\n',
            )}`
          : ''
      }`,
      schema: z.object({
        queries: z
          .array(
            z.object({
              query: z.string().describe('The SERP query'),
              researchGoal: z
                .string()
                .describe(
                  'First talk about the goal of the research that this query is meant to accomplish, then go deeper into how to advance the research once the results are found, mention additional research directions. Be as specific as possible, especially for additional research directions.',
                ),
            }),
          )
          .describe(`List of SERP queries, max of ${numQueries}`),
      }),
    }),
  );
  log(`Created ${res.object.queries.length} queries`, res.object.queries);

  return res.object.queries.slice(0, numQueries);
}

async function processSerpResult({
  query,
  result,
  numLearnings = 3,
  numFollowUpQuestions = 3,
}: {
  query: string;
  result: SearchResponse;
  numLearnings?: number;
  numFollowUpQuestions?: number;
}) {
  const contents = compact(result.data.map(item => item.markdown)).map(
    content => trimPrompt(content, 25_000),
  );
  log(`Ran ${query}, found ${contents.length} contents`);

  const res = await throttler(() =>
    generateObject({
      model: getModel(),
      mode: 'json',
      abortSignal: AbortSignal.timeout(60_000),
      system: systemPrompt(),
      prompt: trimPrompt(
        `Given the following contents from a SERP search for the query <query>${query}</query>, generate a list of learnings from the contents. Return a maximum of ${numLearnings} learnings, but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. The learnings should be concise and to the point, as detailed and information dense as possible. Make sure to include any entities like people, places, companies, products, things, etc in the learnings, as well as any exact metrics, numbers, or dates. The learnings will be used to research the topic further.\n\n<contents>${contents
          .map(content => `<content>\n${content}\n</content>`)
          .join('\n')}</contents>`,
      ),
      schema: z.object({
        learnings: z
          .array(z.string())
          .describe(`List of learnings, max of ${numLearnings}`),
        followUpQuestions: z
          .array(z.string())
          .describe(
            `List of follow-up questions to research the topic further, max of ${numFollowUpQuestions}`,
          ),
      }),
    }),
  );
  log(`Created ${res.object.learnings.length} learnings`, res.object.learnings);

  return res.object;
}

export async function writeFinalReport({
  prompt,
  learnings,
  visitedUrls,
  messages,
}: {
  prompt: string;
  learnings: string[] | string;
  visitedUrls: string[];
  messages: Messages;
}) {
  const learningsString = Array.isArray(learnings)
    ? learnings
        .map(learning => `<learning>\n${learning}\n</learning>`)
        .join('\n')
    : learnings;
  const reportChunks: string[] = [];

  messages?.push({
    content:
      systemJSONPrompt() ??
      `You are a Business Analyst Agent with strong understanding of system flows, data modeling, and software architecture.  
Your job is to research and analyze the my topic deeply, then present a well-structured, detailed breakdown from both a business and technical perspective.  

Response Guidelines:  
1. **Think like a business analyst** — break down the topic into modules, flows, data entities, and stakeholders.  
2. Include **technical considerations** when relevant (system integration points, APIs, performance implications, scalability, data handling).  
3. Provide a **clear, comprehensive, and logically structured explanation** — but never force the entire answer into one response if it’s too long.  
4. If the full answer is long, **stop at a natural section break** (not mid-sentence).  
5. At the end of partial responses, include this exact marker:  
   '--continue-response'  
   to signal that more content is available.  
6. When all parts have been delivered, end with:  
   '--end-response'  
7. Maintain context and flow across messages so the explanation feels continuous and complete.  
8. Each part should be **meaningful, not too small**, but readable enough for easy comprehension.  
9. If the topic is short, send the full response in one message and end with '--end-response'.  

Your goal is to break down the requirments, and explain complex systems in a progressive.`,
    role: 'user',
  });
  let runInTheLoop = false;
  do {
    const res = await throttler(() =>
      generateText({
        model: getModel(),
        // system: systemJSONPrompt(),
        messages: messages as any,
        prompt: messages
          ? undefined
          : trimPrompt(
              `Given the following prompt from the user, write a final report on the topic using the learnings from research. Make it as as detailed as possible, aim for 3 or more pages, include ALL the learnings from research:\n\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from previous research:\n\n<learnings>\n${learningsString}\n</learnings>`,
            ),
      }),
    );
    let responseString = res.text;
    const lastLengthResponseTrim = responseString
      .slice(responseString.length - 50)
      .toLowerCase();
    runInTheLoop = lastLengthResponseTrim.includes('--continue-response');
    console.log(responseString, 'responseString');
    responseString = responseString.replace(
      /(^json|--continue-response|--end-response)/gi,
      '',
    );
    messages.push({
      content: responseString,
      role: 'assistant',
    });
    if (runInTheLoop) {
      messages.push({
        role: 'user',
        content: 'continue',
      });
    }
    reportChunks.push(responseString);
  } while (runInTheLoop);

  return JSON.stringify(combineJSON(reportChunks));
}

export async function writeFinalAnswer({
  prompt,
  learnings,
}: {
  prompt: string;
  learnings: string[] | string;
}) {
  const learningsString = Array.isArray(learnings)
    ? learnings
        .map(learning => `<learning>\n${learning}\n</learning>`)
        .join('\n')
    : learnings;

  const res = await throttler(() =>
    generateObject({
      model: getModel(),
      mode: 'json',
      system: systemPrompt(),
      prompt: trimPrompt(
        `Given the following prompt from the user, write a final answer on the topic using the learnings from research. Follow the format specified in the prompt. Do not yap or babble or include any other text than the answer besides the format specified in the prompt. Keep the answer as concise as possible - usually it should be just a few words or maximum a sentence. Try to follow the format specified in the prompt (for example, if the prompt is using Latex, the answer should be in Latex. If the prompt gives multiple answer choices, the answer should be one of the choices).\n\n<prompt>${prompt}</prompt>\n\nHere are all the learnings from research on the topic that you can use to help answer the prompt:\n\n<learnings>\n${learningsString}\n</learnings>`,
      ),
      schema: z.object({
        exactAnswer: z
          .string()
          .describe(
            'The final answer, make it short and concise, just the answer, no other text',
          ),
      }),
    }),
  );

  return res.object.exactAnswer;
}

export async function deepResearch({
  query,
  breadth,
  depth,
  learnings = [],
  visitedUrls = [],
  onProgress,
}: {
  query: string;
  breadth: number;
  depth: number;
  learnings?: string[];
  visitedUrls?: string[];
  onProgress?: (progress: ResearchProgress) => void;
}): Promise<ResearchResult> {
  const progress: ResearchProgress = {
    currentDepth: depth,
    totalDepth: depth,
    currentBreadth: breadth,
    totalBreadth: breadth,
    totalQueries: 0,
    completedQueries: 0,
  };

  const reportProgress = (update: Partial<ResearchProgress>) => {
    Object.assign(progress, update);
    onProgress?.(progress);
  };

  // generate query for the requirment geather
  const serpQueries = await generateSerpQueries({
    query,
    learnings,
    numQueries: breadth,
  });

  reportProgress({
    totalQueries: serpQueries.length,
    currentQuery: serpQueries[0]?.query,
  });

  const limit = pLimit(ConcurrencyLimit);

  const results = await Promise.all(
    serpQueries.map(serpQuery =>
      limit(async () => {
        try {
          const result = await throttler(() =>
            firecrawl
              .search(serpQuery.query, {
                timeout: 15000,
                limit: 5,
                scrapeOptions: { formats: ['markdown'] },
              })
              .catch(e => {
                const errorResult: SearchResponse = {
                  data: [],
                  success: false,
                  error: e?.message ?? 'No result found',
                };
                return errorResult;
              }),
          );

          // Collect URLs from this search
          const newUrls = compact(result.data.map(item => item.url));
          const newBreadth = Math.ceil(breadth / 2);
          const newDepth = depth - 1;

          const newLearnings = await processSerpResult({
            query: serpQuery.query,
            result,
            numFollowUpQuestions: newBreadth,
          });
          const allLearnings = [...learnings, ...newLearnings.learnings];
          const allUrls = [...visitedUrls, ...newUrls];

          if (newDepth > 0) {
            log(
              `Researching deeper, breadth: ${newBreadth}, depth: ${newDepth}`,
            );

            reportProgress({
              currentDepth: newDepth,
              currentBreadth: newBreadth,
              completedQueries: progress.completedQueries + 1,
              currentQuery: serpQuery.query,
            });

            const nextQuery = `
            Previous research goal: ${serpQuery.researchGoal}
            Follow-up research directions: ${newLearnings.followUpQuestions.map(q => `\n${q}`).join('')}
          `.trim();

            return deepResearch({
              query: nextQuery,
              breadth: newBreadth,
              depth: newDepth,
              learnings: allLearnings,
              visitedUrls: allUrls,
              onProgress,
            });
          } else {
            reportProgress({
              currentDepth: 0,
              completedQueries: progress.completedQueries + 1,
              currentQuery: serpQuery.query,
            });
            return {
              learnings: allLearnings,
              visitedUrls: allUrls,
            };
          }
        } catch (e: any) {
          if (e.message && e.message.includes('Timeout')) {
            log(`Timeout error running query: ${serpQuery.query}: `, e);
          } else {
            log(`Error running query: ${serpQuery.query}: `, e);
          }
          return {
            learnings: [],
            visitedUrls: [],
          };
        }
      }),
    ),
  );

  return {
    learnings: [...new Set(results.flatMap(r => r.learnings))],
    visitedUrls: [...new Set(results.flatMap(r => r.visitedUrls))],
  };
}

type Node = {
  id: string;
  label: string;
  descriptions?: string[];
};

type Edge = {
  source: string;
  target: string;
  relations?: string[];
};

type CombinedGraph = {
  nodes: Node[];
  edges: Edge[];
};

function combineJSON(arr: string[]): CombinedGraph {
  return JSON.parse(arr.join(''));
  return arr.reduce<CombinedGraph>(
    (acc, str) => {
      // Remove the "json" prefix and parse
      const cleaned = str.replace(/^json/, '');
      const parsed = JSON.parse(cleaned) as CombinedGraph;

      acc.nodes.push(...parsed.nodes);
      acc.edges.push(...parsed.edges);

      return acc;
    },
    { nodes: [], edges: [] },
  );
}
