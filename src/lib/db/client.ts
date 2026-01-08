/**
 * Prisma Client initialization and configuration
 * Singleton pattern for Next.js to prevent multiple instances in development
 */

import { PrismaClient } from '@prisma/client';

// Prisma Client singleton pattern for Next.js
// Prevents multiple instances in development with hot reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Export prisma as 'db' for convenience
export { prisma as db };
