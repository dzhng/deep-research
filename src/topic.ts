import { generateObject } from 'ai';
import { z } from 'zod';

import { getModel, trimPrompt } from './ai/providers';
import { systemPrompt } from './prompt';
import { firecrawl } from './deep-research'
import { compact } from 'lodash-es';

export async function generateTopic({
    combinedQuery,
  }: {
    combinedQuery: string;
  }) {
    const topic = await generateObject({
      model: getModel(),
      system: systemPrompt(),
      prompt: `Given the following prompt from the user, generate a researchable and professional topic. <prompt>${combinedQuery}</prompt>`,
      schema: z.object({
        topic: z
          .string()
          .describe('research topic for user'),
      }),
    });
    return topic.object.topic
  }

  export async function generateSummary({
    topic,
  }: {
    topic: string;
  }) {
    const result = await firecrawl.search(topic, {
    timeout: 15000,
    limit: 5,
    scrapeOptions: { formats: ['markdown'] },
    });

    const contents = compact(result.data.map(item => item.markdown)).map(
    content => trimPrompt(content, 25_000),
    );

    const summary = await generateObject({
      model: getModel(),
      system: systemPrompt(),
      prompt: `Given the following prompt from the user, generate a summary about this topic from content. <topic>${topic}</topic><content>${contents.join('\n')}</content>`,
      schema: z.object({
        summary: z
          .string()
          .describe('research summary'),
      }),
    });
    return summary.object.summary
  }