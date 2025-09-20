import { generateObject } from 'ai';
import { z } from 'zod';

import { getModel } from './ai/providers';
import { systemPrompt } from './prompt';
import { Messages } from './understand-requirment';

export async function generateFeedback({
  query,
  numQuestions = 3,
  messages,
}: {
  query?: string;
  numQuestions?: number;
  messages?: Messages;
}) {
  const prompt = `
  Now synthesize everything discussed so far into one unified, detailed understanding of the entire requirement document.
  Preserve relationships, dependencies, and scope across all parts. 
  Make the final result comprehensive and well-structured.
  ask some follow up questions to clarify the research direction. Return a maximum of ${numQuestions} questions, but feel free to return less if the original context is clear`;
  messages?.push({
    content: prompt,
    role: 'user',
  });
  const userFeedback = await generateObject({
    model: getModel(),
    mode: 'json',
    system: systemPrompt(),
    messages: messages as any,
    prompt: messages ? undefined : prompt,
    schema: z.object({
      questions: z
        .array(z.string())
        .describe(
          `Follow up questions to clarify the research direction, max of ${numQuestions}`,
        ),
    }),
  });

  messages?.push({
    content: userFeedback.object.questions.slice(0, numQuestions).join(' \n'),
    role: 'assistant',
  });

  return userFeedback.object.questions.slice(0, numQuestions);
}
