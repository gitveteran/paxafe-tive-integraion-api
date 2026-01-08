/**
 * Database helper functions
 * Uses Prisma ORM for type-safe database operations
 */

import { logger } from '@/lib/logger';

import { checkDatabaseHealth, disconnect } from './utils';

export { prisma, prisma as db } from './client';
export { checkDatabaseHealth, disconnect, withTransaction } from './utils';

// Re-export DeviceLatest operations for backward compatibility
export {
  updateDeviceLatestCritical,
  updateDeviceLatestReferences,
  getDeviceLatestList,
} from './device-latest';

// Re-export RawPayload operations for backward compatibility
export {
  storeRawPayload,
  updateRawPayloadStatus,
  updateRawPayloadInngestEventId,
} from './raw-payload';

// Re-export Telemetry operations for backward compatibility
export { saveTelemetry } from './telemetry';

// Re-export Location operations for backward compatibility
export { saveLocation } from './location';

/**
 * Startup database health check
 * Verifies database connection when server starts
 * Terminates the process if connection fails (fail-fast)
 * 
 * This runs when the database module is first imported (server startup)
 */
async function startupDatabaseCheck() {
  // Skip during build time - only run at runtime
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return;
  }

  // Only run in production or when explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_STARTUP_DB_CHECK === 'true') {
    try {
      // Wait a bit for the server to fully initialize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        throw new Error('Database health check returned false');
      }
      
      logger.info('Database connection verified on startup');
    } catch (error) {
      logger.error('Database connection failed on startup - terminating server', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Disconnect and exit
      await disconnect();
      process.exit(1);
    }
  }
}

// Run startup check asynchronously (non-blocking)
// This allows the server to start while checking the connection
// Only run on server-side (not in browser)
if (typeof window === 'undefined') {
  // Use setImmediate to defer execution until after module initialization
  setImmediate(() => {
    startupDatabaseCheck().catch((error) => {
      logger.error('Startup database check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    });
  });
}

