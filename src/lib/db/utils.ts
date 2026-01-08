/**
 * Database utility functions
 * Helper functions for database operations, health checks, and transactions
 */

import { PrismaClient } from '@prisma/client';
import { prisma } from './client';

/**
 * Health check function
 * Verifies database connection is working
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Disconnect Prisma Client (for cleanup)
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

/**
 * Execute multiple operations in a transaction
 */
export async function withTransaction<T>(
  callback: (
    tx: Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >
  ) => Promise<T>
): Promise<T> {
  return (await prisma.$transaction(callback)) as T;
}
