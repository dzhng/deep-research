import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading environment variables from:', envPath);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env.local file:', result.error);
  process.exit(1);
}

// Validate required environment variables
const requiredEnvVars = ['FIRECRAWL_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Log available AI providers
const availableProviders = [
  { name: 'OpenAI', key: 'OPENAI_KEY' },
  { name: 'Google AI', key: 'GOOGLE_KEY' },
  { name: 'Azure OpenAI', key: ['AZURE_KEY', 'AZURE_RESOURCE_NAME'] },
  { name: 'Mistral AI', key: 'MISTRAL_KEY' }
].filter(provider => 
  Array.isArray(provider.key) 
    ? provider.key.every(k => process.env[k])
    : process.env[provider.key]
);

console.log('\nAvailable AI providers:');
availableProviders.forEach(provider => {
  console.log(`- ${provider.name}`);
}); 