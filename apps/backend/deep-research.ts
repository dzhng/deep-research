import FirecrawlApp, { SearchResponse } from '@mendable/firecrawl-js';
import { generateObject } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';

import { o3MiniModel, trimPrompt } from '../../libs/shared/providers';
import { systemPrompt } from './prompt';
import { OutputManager } from '../../libs/shared/output-manager';

// Initialize output manager for coordinated console/progress output
const output = new OutputManager();

// Replace console.log with output.log
function log(...args: any[]) {
  output.log(...args);
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
const ConcurrencyLimit = 2;

// Initialize Firecrawl with optional API key and optional base url

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_KEY ?? '',
  apiUrl: process.env.FIRECRAWL_BASE_URL,
});

interface FirecrawlError {
  response?: {
    status: number;
  };
}

// Retry configuration
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

// Rate limit configuration
const RATE_LIMIT_DELAY = 6000; // 6 seconds between requests

async function searchWithRetry(query: string): Promise<SearchResponse> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Add delay before each request
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      return await firecrawl.search(query);
    } catch (error) {
      const fcError = error as FirecrawlError;
      if (fcError.response?.status === 429) { // Rate limit error
        const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        log(`Rate limit hit, retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
}

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
  const res = await generateObject({
    model: o3MiniModel,
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
  });
  log(
    `Created ${res.object.queries.length} queries`,
    res.object.queries,
  );

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

  const res = await generateObject({
    model: o3MiniModel,
    abortSignal: AbortSignal.timeout(60_000),
    system: systemPrompt(),
    prompt: `Given the following contents from a SERP search for the query <query>${query}</query>, generate a list of learnings from the contents. Return a maximum of ${numLearnings} learnings, but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. The learnings should be concise and to the point, as detailed and information dense as possible. Make sure to include any entities like people, places, companies, products, things, etc in the learnings, as well as any exact metrics, numbers, or dates. The learnings will be used to research the topic further.\n\n<contents>${contents
      .map(content => `<content>\n${content}\n</content>`)
      .join('\n')}</contents>`,
    schema: z.object({
      learnings: z
        .array(z.string())
        .describe('List of learnings extracted from the contents.'),
    }),
  });
  log(
    `Created ${res.object.learnings.length} learnings`,
    res.object.learnings,
  );

  return res.object.learnings.slice(0, numLearnings);
}

export async function deepResearch({
  query,
  breadth = 4,
  depth = 2,
  onProgress,
}: {
  query: string;
  breadth?: number;
  depth?: number;
  onProgress?: (progress: ResearchProgress) => void;
}): Promise<ResearchResult> {
  const allLearnings: string[] = [];
  const visitedUrls: string[] = [];
  const limit = pLimit(ConcurrencyLimit);

  let currentQueries = [{ query, researchGoal: 'Initial research' }];
  let totalQueries = 0;
  let completedQueries = 0;

  for (let d = 0; d < depth; d++) {
    // Process queries sequentially
    const queries = [];
    for (const q of currentQueries) {
      const result = await generateSerpQueries({
        query: q.query,
        numQueries: breadth,
        learnings: allLearnings,
      });
      queries.push(result);
    }

    const flatQueries = queries.flat();
    totalQueries += flatQueries.length;

    // Process search queries sequentially
    const results = [];
    for (const q of flatQueries) {
      onProgress?.({
        currentDepth: d + 1,
        totalDepth: depth,
        currentBreadth: completedQueries + 1,
        totalBreadth: totalQueries,
        currentQuery: q.query,
        totalQueries,
        completedQueries,
      });

      const result = await searchWithRetry(q.query);
      completedQueries++;

      results.push({
        query: q,
        result,
      });
    }

    // Process results sequentially
    const newLearnings = [];
    for (const { query, result } of results) {
      visitedUrls.push(...compact(result.data.map(item => item.url)));
      const learning = await processSerpResult({
        query: query.query,
        result,
        numLearnings: 3,
      });
      newLearnings.push(learning);
    }

    currentQueries = flatQueries;
    allLearnings.push(...newLearnings.flat());
  }

  return {
    learnings: allLearnings,
    visitedUrls: [...new Set(visitedUrls)],
  };
}

export async function writeFinalReport({
  prompt,
  learnings,
  visitedUrls,
}: {
  prompt: string;
  learnings: string[];
  visitedUrls: string[];
}): Promise<string> {
  const res = await generateObject({
    model: o3MiniModel,
    system: systemPrompt(),
    prompt: `Given the following research prompt and learnings, write a comprehensive research report. The report should be well-structured with sections and subsections. Make sure to include all relevant information from the learnings, and organize them in a logical way. Use markdown formatting.\n\nResearch Prompt: ${prompt}\n\nLearnings:\n${learnings.join(
      '\n',
    )}\n\nSources:\n${visitedUrls.join('\n')}`,
    schema: z.object({
      report: z.string().describe('The final research report in markdown format'),
    }),
  });

  return res.object.report;
}
