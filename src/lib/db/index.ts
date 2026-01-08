/**
 * Database helper functions
 * Uses Prisma ORM for type-safe database operations
 */

import { PaxafeSensorPayload, PaxafeLocationPayload } from '@/types/paxafe';
import { TivePayload } from '@/types/tive';
import { logger } from '@/lib/logger';

import { prisma } from './client';
import { checkDatabaseHealth, disconnect } from './utils';

export { prisma, prisma as db } from './client';
export { checkDatabaseHealth, disconnect, withTransaction } from './utils';

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

/**
 * Store raw webhook payload for audit trail
 */
export async function storeRawPayload(
  payload: TivePayload,
  validationErrors?: Array<{ field: string; message: string }>,
  status: 'pending' | 'failed' = 'pending',
  inngestEventId?: string
): Promise<number> {
  try {
    const result = await prisma.rawWebhookPayload.create({
      data: {
        payload: payload as any, // Prisma Json type accepts any
        source: 'Tive',
        status,
        validationErrors: validationErrors ? (validationErrors as any) : null,
        inngestEventId: inngestEventId || null,
      },
    });
    return result.id;
  } catch (error) {
    logger.error('Error storing raw payload', {
      error: error instanceof Error ? error.message : 'Unknown',
      payload: JSON.stringify(payload),
    });
    throw new Error(`Failed to store raw payload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update raw payload status after processing
 * Preserves inngest_event_id if it was already set
 */
export async function updateRawPayloadStatus(
  payloadId: number,
  status: 'processing' | 'completed' | 'failed',
  processingError?: string
): Promise<void> {
  try {
    await prisma.rawWebhookPayload.update({
      where: { id: payloadId },
      data: {
        status,
        processedAt: new Date(),
        processingError: processingError || null,
        // inngestEventId is preserved (not updated, keeps existing value)
      },
    });
  } catch (error) {
    logger.error('Error updating raw payload status', {
      error: error instanceof Error ? error.message : 'Unknown',
      payloadId,
      status,
    });
    throw error;
  }
}

/**
 * Update inngest_event_id for a raw payload
 * Used when Inngest event is created after initial payload storage
 */
export async function updateRawPayloadInngestEventId(
  payloadId: number,
  inngestEventId: string
): Promise<void> {
  try {
    await prisma.rawWebhookPayload.update({
      where: { id: payloadId },
      data: { inngestEventId },
    });
  } catch (error) {
    logger.error('Error updating raw payload inngest_event_id', {
      error: error instanceof Error ? error.message : 'Unknown',
      payloadId,
      inngestEventId,
    });
    throw error;
  }
}

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

/**
 * Save location reading to normalized table
 * Stores all readings as historical data (allows duplicates with same timestamp)
 */
export async function saveLocation(payload: PaxafeLocationPayload): Promise<number> {
  try {
    const result = await prisma.location.create({
      data: {
        deviceId: payload.device_id,
        deviceImei: payload.device_imei,
        ts: BigInt(payload.timestamp),
        provider: payload.provider,
        type: payload.type,
        latitude: payload.latitude,
        longitude: payload.longitude,
        altitude: payload.altitude ?? null,
        locationAccuracy: payload.location_accuracy ?? null,
        locationAccuracyCategory: payload.location_accuracy_category ?? null,
        locationSource: payload.location_source ?? null,
        addressStreet: payload.address?.street ?? null,
        addressLocality: payload.address?.locality ?? null,
        addressState: payload.address?.state ?? null,
        addressCountry: payload.address?.country ?? null,
        addressPostalCode: payload.address?.postal_code ?? null,
        addressFullAddress: payload.address?.full_address ?? null,
        batteryLevel: payload.battery_level ?? null,
        cellularDbm: payload.cellular_dbm ?? null,
        cellularNetworkType: payload.cellular_network_type ?? null,
        cellularOperator: payload.cellular_operator ?? null,
        wifiAccessPoints: payload.wifi_access_points ?? null,
      },
    });
    return result.id;
  } catch (error) {
    logger.error('Error saving location', {
      error: error instanceof Error ? error.message : 'Unknown',
      payload: JSON.stringify(payload),
    });
    throw new Error(`Failed to save location: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update device_latest table with critical fields synchronously
 * This is called during webhook processing for real-time dashboard updates
 * Critical fields are stored directly (no JOIN needed for dashboard queries)
 */
export async function updateDeviceLatestCritical(
  deviceImei: string,
  deviceId: string,
  timestamp: number,
  sensorPayload: PaxafeSensorPayload,
  locationPayload: PaxafeLocationPayload
): Promise<void> {
  try {
    await prisma.deviceLatest.upsert({
      where: { deviceImei },
      create: {
        deviceImei,
        deviceId,
        provider: sensorPayload.provider,
        lastTs: BigInt(timestamp),
        // Critical sensor fields (updated synchronously)
        lastTemperature: sensorPayload.temperature ?? null,
        lastHumidity: sensorPayload.humidity ?? null,
        lastLightLevel: sensorPayload.light_level ?? null,
        lastAccelerometerX: sensorPayload.accelerometer?.x ?? null,
        lastAccelerometerY: sensorPayload.accelerometer?.y ?? null,
        lastAccelerometerZ: sensorPayload.accelerometer?.z ?? null,
        lastAccelerometerMagnitude: sensorPayload.accelerometer?.magnitude ?? null,
        // Critical location fields (updated synchronously)
        lastLat: locationPayload.latitude ?? null,
        lastLon: locationPayload.longitude ?? null,
        lastAltitude: locationPayload.altitude ?? null,
        locationAccuracy: locationPayload.location_accuracy ?? null,
        locationAccuracyCategory: locationPayload.location_accuracy_category ?? null,
        locationSource: locationPayload.location_source ?? null,
        addressStreet: locationPayload.address?.street ?? null,
        addressLocality: locationPayload.address?.locality ?? null,
        addressState: locationPayload.address?.state ?? null,
        addressCountry: locationPayload.address?.country ?? null,
        addressPostalCode: locationPayload.address?.postal_code ?? null,
        addressFullAddress: locationPayload.address?.full_address ?? null,
        // Critical device status (updated synchronously)
        batteryLevel: locationPayload.battery_level ?? null,
        cellularDbm: locationPayload.cellular_dbm ?? null,
        cellularNetworkType: locationPayload.cellular_network_type ?? null,
        cellularOperator: locationPayload.cellular_operator ?? null,
        wifiAccessPoints: locationPayload.wifi_access_points ?? null,
      },
      update: {
        deviceId,
        lastTs: BigInt(timestamp),
        // Update critical fields synchronously
        lastTemperature: sensorPayload.temperature ?? null,
        lastHumidity: sensorPayload.humidity ?? null,
        lastLightLevel: sensorPayload.light_level ?? null,
        lastAccelerometerX: sensorPayload.accelerometer?.x ?? null,
        lastAccelerometerY: sensorPayload.accelerometer?.y ?? null,
        lastAccelerometerZ: sensorPayload.accelerometer?.z ?? null,
        lastAccelerometerMagnitude: sensorPayload.accelerometer?.magnitude ?? null,
        lastLat: locationPayload.latitude ?? null,
        lastLon: locationPayload.longitude ?? null,
        lastAltitude: locationPayload.altitude ?? null,
        locationAccuracy: locationPayload.location_accuracy ?? null,
        locationAccuracyCategory: locationPayload.location_accuracy_category ?? null,
        locationSource: locationPayload.location_source ?? null,
        addressStreet: locationPayload.address?.street ?? null,
        addressLocality: locationPayload.address?.locality ?? null,
        addressState: locationPayload.address?.state ?? null,
        addressCountry: locationPayload.address?.country ?? null,
        addressPostalCode: locationPayload.address?.postal_code ?? null,
        addressFullAddress: locationPayload.address?.full_address ?? null,
        batteryLevel: locationPayload.battery_level ?? null,
        cellularDbm: locationPayload.cellular_dbm ?? null,
        cellularNetworkType: locationPayload.cellular_network_type ?? null,
        cellularOperator: locationPayload.cellular_operator ?? null,
        wifiAccessPoints: locationPayload.wifi_access_points ?? null,
      },
    });
  } catch (error) {
    logger.error('Error updating device_latest (critical)', {
      error: error instanceof Error ? error.message : 'Unknown',
      deviceImei,
      deviceId,
      timestamp,
    });
    // Don't throw - this is non-critical for webhook processing
  }
}

/**
 * Update device_latest table with references to telemetry and location records
 * This is called asynchronously via Inngest for consistency and audit trail
 * References allow linking back to the normalized tables
 */
export async function updateDeviceLatestReferences(
  deviceImei: string,
  telemetryId: number,
  locationId: number
): Promise<void> {
  try {
    await prisma.deviceLatest.update({
      where: { deviceImei },
      data: {
        latestTelemetryId: telemetryId,
        latestLocationId: locationId,
      },
    });
  } catch (error) {
    logger.error('Error updating device_latest references', {
      error: error instanceof Error ? error.message : 'Unknown',
      deviceImei,
      telemetryId,
      locationId,
    });
    // Don't throw - this is non-critical
  }
}

/**
 * @deprecated Use updateDeviceLatestCritical() for synchronous updates and updateDeviceLatestReferences() for async updates
 * Kept for backward compatibility
 */
export async function updateDeviceLatest(
  deviceImei: string,
  deviceId: string,
  timestamp: number,
  telemetryId: number,
  locationId: number
): Promise<void> {
  // For backward compatibility, update references only
  await updateDeviceLatestReferences(deviceImei, telemetryId, locationId);
}

