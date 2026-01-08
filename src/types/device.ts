/**
 * Device state types
 * Automatically derived from Prisma schema - no manual updates needed!
 * 
 * When you update the Prisma schema, run `prisma generate` and these types
 * will automatically update to match.
 */

import { Prisma } from '@prisma/client';

/**
 * Type helper: Convert Prisma types to JSON-serializable types
 * - Decimal → number
 * - BigInt → number  
 * - Date → string (ISO)
 */
type SerializePrisma<T> = {
  [K in keyof T]: T[K] extends Prisma.Decimal | null
    ? number | null
    : T[K] extends Prisma.Decimal
    ? number
    : T[K] extends bigint
    ? number
    : T[K] extends Date
    ? string
    : T[K] extends Date | null
    ? string | null
    : T[K];
};

/**
 * Device state type - automatically derived from Prisma DeviceLatest model
 * This matches what the API returns (serialized Prisma entities)
 * 
 * Type is automatically synced with Prisma schema - no manual updates needed!
 */
export type DeviceState = SerializePrisma<Prisma.DeviceLatestGetPayload<{}>>;
