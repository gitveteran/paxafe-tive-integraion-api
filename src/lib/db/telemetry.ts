/**
 * Telemetry database operations
 * Functions for managing telemetry table
 */

import { PaxafeSensorPayload } from '@/types/paxafe';
import { logger } from '@/lib/logger';
import { prisma } from './client';

/**
 * Save telemetry reading to normalized table
 * Stores all readings as historical data (allows duplicates with same timestamp)
 */
export async function saveTelemetry(payload: PaxafeSensorPayload): Promise<number> {
  try {
    const result = await prisma.telemetry.create({
      data: {
        deviceId: payload.device_id,
        deviceImei: payload.device_imei,
        ts: BigInt(payload.timestamp),
        provider: payload.provider,
        type: payload.type,
        temperature: payload.temperature !== null ? payload.temperature : null,
        humidity: payload.humidity !== null ? payload.humidity : null,
        lightLevel: payload.light_level !== null ? payload.light_level : null,
        accelerometerX: payload.accelerometer?.x ?? null,
        accelerometerY: payload.accelerometer?.y ?? null,
        accelerometerZ: payload.accelerometer?.z ?? null,
        accelerometerMagnitude: payload.accelerometer?.magnitude ?? null,
      },
    });
    return result.id;
  } catch (error) {
    logger.error('Error saving telemetry', {
      error: error instanceof Error ? error.message : 'Unknown',
      payload: JSON.stringify(payload),
    });
    throw new Error(`Failed to save telemetry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
