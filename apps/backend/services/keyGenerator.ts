import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// Generate a user ID and API key
export function generateUserId(username: string): string {
  const shortUuid = uuidv4().split('-')[0]; // Take first 8 characters of UUID
  const userId = `${username}_${shortUuid}`;
  console.log('Generated User ID:', userId);
  return userId;
}

export function generateApiKey(): string {
  // Generate a secure API key with a prefix for easy identification
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 characters in base64
  const apiKey = `sk_${randomBytes.toString('base64').replace(/[+/=]/g, '')}`;
  console.log('Generated API Key:', apiKey);
  return apiKey;
} 