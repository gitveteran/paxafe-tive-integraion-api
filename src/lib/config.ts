/**
 * Validate and export configuration
 * Provides graceful degradation in development, strict validation in production
 */
function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    const error = new Error(`Missing required environment variable: ${key}`);
    // Only throw in production - allow graceful degradation in dev
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
    console.warn(`⚠️  ${error.message} - using placeholder value`);
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
  console.error('❌ Configuration validation failed:', error);
  throw error;
}

export { config };
