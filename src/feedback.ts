import { z } from 'zod';

import { geminiModel } from './ai/providers';
import { systemPrompt } from './prompt';

export async function generateFeedback({
  query,
  numQuestions = 3,
}: {
  query: string;
  numQuestions?: number;
}) {
  const userFeedback = await geminiModel.generate({
    system: systemPrompt(),
    prompt: `Given the following query from the user, ask some follow-up questions to clarify the research direction.
Return your response in JSON format with a key "questions" which is an array of strings.
Ensure the response includes a maximum of ${numQuestions} questions, but feel free to return fewer if the query is clear:
<query>${query}</query>`,
    schema: z.object({
      questions: z
        .array(z.string())
        .describe(`Follow up questions to clarify the research direction, max of ${numQuestions}`),
    }),
  });

  return userFeedback.object.questions.slice(0, numQuestions);
}
