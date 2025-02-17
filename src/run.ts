// Load environment variables first
import './env';

import * as fs from 'fs/promises';
import * as path from 'path';
import * as readline from 'readline';
import { LanguageModel } from 'ai';

import { deepResearch, writeFinalReport } from './deep-research';
import { generateFeedback } from './feedback';
import { OutputManager } from './output-manager';
import { getSelectedModel } from './ai/providers';

declare global {
  var selectedModel: LanguageModel;
}

const output = new OutputManager();

// Helper function for consistent logging
function log(...args: any[]) {
  output.log(...args);
}

// Helper function to sanitize filename
function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 100); // Limit length
}

// Helper function to ensure directory exists
async function ensureDir(dir: string) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to get user input
function askQuestion(query: string): Promise<string> {
  return new Promise(resolve => {
    rl.question(query, answer => {
      resolve(answer);
    });
  });
}

type ModelType = 'openai' | 'google' | 'azure' | 'mistral';

// Get available models
const getAvailableModels = () => {
  const models: { [key in ModelType]: boolean } = {
    openai: Boolean(process.env.OPENAI_KEY),
    google: Boolean(process.env.GOOGLE_KEY),
    azure: Boolean(process.env.AZURE_KEY && process.env.AZURE_RESOURCE_NAME),
    mistral: Boolean(process.env.MISTRAL_KEY),
  };

  return Object.entries(models)
    .filter(([_, available]) => available)
    .map(([name]) => name as ModelType);
};

// run the agent
async function run() {
  const availableModels = getAvailableModels();
  
  if (availableModels.length === 0) {
    console.error('No AI providers configured. Please add at least one provider\'s API key to .env.local');
    process.exit(1);
  }

  // Get model selection
  const modelOptions = availableModels.join('/');
  const defaultModel = availableModels[0];
  const modelType = await askQuestion(`Which model would you like to use? (${modelOptions}) [default: ${defaultModel}]: `);
  const selectedModelType = (modelType || defaultModel) as ModelType;
  
  if (!availableModels.includes(selectedModelType)) {
    console.error(`Invalid model type. Please choose one of: ${modelOptions}`);
    rl.close();
    return;
  }

  // Set the selected model in global scope
  global.selectedModel = getSelectedModel(selectedModelType);

  // Get initial query
  const initialQuery = await askQuestion('What would you like to research? ');

  // Get breath and depth parameters
  const breadth =
    parseInt(
      await askQuestion(
        'Enter research breadth (recommended 2-10, default 4): ',
      ),
      10,
    ) || 4;
  const depth =
    parseInt(
      await askQuestion('Enter research depth (recommended 1-5, default 2): '),
      10,
    ) || 2;

  log(`Creating research plan...`);

  // Generate follow-up questions
  const followUpQuestions = await generateFeedback({
    query: initialQuery,
  });

  log(
    '\nTo better understand your research needs, please answer these follow-up questions:',
  );

  // Collect answers to follow-up questions
  const answers: string[] = [];
  for (const question of followUpQuestions) {
    const answer = await askQuestion(`\n${question}\nYour answer: `);
    answers.push(answer);
  }

  // Combine all information for deep research
  const combinedQuery = `
Initial Query: ${initialQuery}
Follow-up Questions and Answers:
${followUpQuestions.map((q: string, i: number) => `Q: ${q}\nA: ${answers[i]}`).join('\n')}
`;

  log('\nResearching your topic...');

  log('\nStarting research with progress tracking...\n');
  
  const { learnings, visitedUrls } = await deepResearch({
    query: combinedQuery,
    breadth,
    depth,
    onProgress: (progress) => {
      output.updateProgress(progress);
    },
  });

  log(`\n\nLearnings:\n\n${learnings.join('\n')}`);
  log(
    `\n\nVisited URLs (${visitedUrls.length}):\n\n${visitedUrls.join('\n')}`,
  );
  log('Writing final report...');

  const report = await writeFinalReport({
    prompt: combinedQuery,
    learnings,
    visitedUrls,
  });

  // Create reports directory if it doesn't exist
  const reportsDir = 'deep-research-reports';  // Fixed directory for all research reports
  await ensureDir(reportsDir);
  log(`\nCreating research report in directory: ${reportsDir}`);

  // Generate filename from initial query and timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sanitizedQuery = sanitizeFilename(initialQuery);
  const filename = `${sanitizedQuery}-${timestamp}.md`;
  const filepath = path.join(reportsDir, filename);

  // Save report to file
  await fs.writeFile(filepath, report, 'utf-8');

  console.log(`\n\nFinal Report:\n\n${report}`);
  console.log(`\nReport has been saved to ${filepath}`);
  rl.close();
}

run().catch(console.error);
