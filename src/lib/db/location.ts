/**
 * Location database operations
 * Functions for managing location table
 */

import { PaxafeLocationPayload } from '@/types/paxafe';
import { logger } from '@/lib/logger';
import { prisma } from './client';

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
