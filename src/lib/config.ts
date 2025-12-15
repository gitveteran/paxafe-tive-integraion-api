/**
 * Validate and export configuration
 * Provides graceful degradation in development, strict validation in production
 */

import { logger } from './logger';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    const error = new Error(`Missing required environment variable: ${key}`);
    // Only throw in production - allow graceful degradation in dev
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    logger.warn('Missing environment variable - using placeholder', {
      key,
      message: error.message,
    });
    return `placeholder-${key}`;
  }
  return value;
}

let config: {
  apiKey: string;
  databaseUrl: string;
  inngestEventKey?: string;
  inngestSigningKey?: string;
  tiveErrorWebhookUrl?: string;
  nodeEnv: string;
};

try {
  config = {
    apiKey: requireEnv('API_KEY'),
    databaseUrl: requireEnv('DATABASE_URL'),
    inngestEventKey: process.env.INNGEST_EVENT_KEY,
    inngestSigningKey: process.env.INNGEST_SIGNING_KEY,
    tiveErrorWebhookUrl: process.env.TIVE_ERROR_WEBHOOK_URL,
    nodeEnv: process.env.NODE_ENV || 'development',
  } as const;
} catch (error) {
  // This should only happen in production if required vars are missing
  logger.error('Configuration validation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  throw error;
}

export { config };
