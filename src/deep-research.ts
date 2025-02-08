import FirecrawlApp, { SearchResponse } from '@mendable/firecrawl-js';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';

import { geminiModel, trimPrompt } from './ai/providers';
import { systemPrompt } from './prompt';

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

const model = geminiModel;

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
  const res = await geminiModel.generate({
    system: systemPrompt(),
    prompt: `Given the following prompt from the user, generate a list of SERP queries to research the topic.
Return your response in JSON format wrapped in an object with a key "queries" whose value is an array. Use a maximum of ${numQueries} queries, but feel free to provide fewer if the prompt is clear.
Make sure each query is unique:
<prompt>${query}</prompt>
${learnings ? `Here are some learnings from previous research: ${learnings.join('\n')}` : ''}`,
    schema: z.object({
      queries: z.array(
        z.union([
          z.object({
            query: z.string().describe('The SERP query'),
            researchGoal: z.string().describe('The research goal for the query'),
          }),
          z.object({
            query: z.string().describe('The SERP query'),
            type: z.string().describe('Type information for the query'),
          }),
          z.string(),
        ])
      ).describe(`List of SERP queries, max of ${numQueries}`),
    }),
  });
  console.log(`Created ${res.object.queries.length} queries`, res.object.queries);
  const fixedQueries = res.object.queries.map(item => {
    if (typeof item === 'string') {
      return { query: item, researchGoal: '' };
    } else if ('type' in item && !('researchGoal' in item)) {
      return { query: item.query, researchGoal: item.type };
    } else {
      return item;
    }
  });
  return fixedQueries.slice(0, numQueries);
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
  console.log(`Ran ${query}, found ${contents.length} contents`);

  const res = await geminiModel.generate({
    system: systemPrompt(),
    prompt: `Given the following contents from a SERP search for the query <query>${query}</query>, generate a list of learnings from the contents. Return a maximum of ${numLearnings} learnings, but feel free to return less if the contents are clear. Make sure each learning is unique and not similar to each other. The learnings should be concise and to the point, as detailed and information dense as possible. Make sure to include any entities like people, places, companies, products, things, etc in the learnings, as well as any exact metrics, numbers, or dates. The learnings will be used to research the topic further.\n\n<contents>${contents
      .map(content => `<content>\n${content}\n</content>`)
      .join('\n')}</contents>`,
    schema: z.object({
      learnings: z.union([
        z.array(z.string()),
        z.string()
      ]).describe(`List of learnings, max of ${numLearnings}`),
      followUpQuestions: z.union([
        z.array(z.string()),
        z.string()
      ]).describe(`List of follow-up questions to research the topic further, max of ${numFollowUpQuestions}`),
    }),
  });
  const fixedLearnings = Array.isArray(res.object.learnings) ? res.object.learnings : [res.object.learnings];
  const fixedFollowUpQuestions = Array.isArray(res.object.followUpQuestions) ? res.object.followUpQuestions : [res.object.followUpQuestions];
  console.log(`Created ${fixedLearnings.length} learnings`, fixedLearnings);

  return { learnings: fixedLearnings, followUpQuestions: fixedFollowUpQuestions };
}

export async function writeFinalReport({
  prompt,
  learnings,
  visitedUrls,
}: {
  prompt: string;
  learnings: string[];
  visitedUrls: string[];
}) {
  const learningsString = trimPrompt(
    learnings
      .map(learning => `<learning>\n${learning}\n</learning>`)
      .join('\n'),
    150_000,
  );

  const res = await geminiModel.generate({
    system: systemPrompt(),
    prompt: `Given the following prompt from the user, write a final report on the topic using the learnings from research. Make it as detailed as possible, aim for 3 or more pages, include ALL the learnings from research. Your response must be a valid JSON object with a single key "reportMarkdown" that contains the complete final report in Markdown format. Do not include any additional text, explanations, or formatting outside the JSON object.

<prompt>${prompt}</prompt>

Here are all the learnings from previous research:

<learnings>
${learningsString}
</learnings>`,
    schema: z.object({
      reportMarkdown: z.string().describe('Final report on the topic in Markdown'),
    }),
  });

  // Append the visited URLs section to the report
  const urlsSection = `\n\n## Sources\n\n${visitedUrls.map(url => `- ${url}`).join('\n')}`;

  const finalReport = res.object.reportMarkdown + urlsSection;
  return finalReport;
}

export async function deepResearch({
  query,
  breadth,
  depth,
  learnings = [],
  visitedUrls = [],
}: {
  query: string;
  breadth: number;
  depth: number;
  learnings?: string[];
  visitedUrls?: string[];
}): Promise<ResearchResult> {
  const serpQueries = await generateSerpQueries({
    query,
    learnings,
    numQueries: breadth,
  });
  const limit = pLimit(ConcurrencyLimit);

  const results = await Promise.all(
    serpQueries.map((serpQuery) =>
      limit(async () => {
        try {
          const result = await firecrawl.search(serpQuery.query, {
            timeout: 15000,
            limit: 5,
            scrapeOptions: { formats: ['markdown'] },
          });

          const newUrls = compact(result.data.map((item) => item.url));
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
            console.log(`Researching deeper, breadth: ${newBreadth}, depth: ${newDepth}`);
            const nextQuery = `
              Previous research goal: ${serpQuery.researchGoal}
              Follow-up research directions: ${newLearnings.followUpQuestions.map((q) => `\n${q}`).join('')}
            `.trim();

            return deepResearch({
              query: nextQuery,
              breadth: newBreadth,
              depth: newDepth,
              learnings: allLearnings,
              visitedUrls: allUrls,
            });
          } else {
            return {
              learnings: allLearnings,
              visitedUrls: allUrls,
            };
          }
        } catch (e) {
          console.error(`Error running query: ${serpQuery.query}: `, e);
          return {
            learnings: [],
            visitedUrls: [],
          };
        }
      })
    )
  );

  return {
    learnings: [...new Set(results.flatMap((r) => r.learnings))],
    visitedUrls: [...new Set(results.flatMap((r) => r.visitedUrls))],
  };
}