/**
 * DeviceLatest database operations
 * Functions for managing device_latest table
 */

import { PaxafeSensorPayload, PaxafeLocationPayload } from '@/types/paxafe';
import { logger } from '@/lib/logger';
import { prisma } from './client';

/**
 * Fetch latest device states from device_latest table
 * Returns devices ordered by most recently updated first
 */
export async function getDeviceLatestList(limit: number = 100) {
  return await prisma.deviceLatest.findMany({
    orderBy: {
      updatedAt: 'desc',
    },
    take: limit,
  });
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
  }
}


