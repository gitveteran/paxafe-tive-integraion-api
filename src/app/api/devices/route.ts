/**
 * API endpoint to fetch latest device states from device_latest table
 * GET /api/devices
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';
import { successResponse, errorResponse } from '@/lib/api/response';

// Mark this route as dynamic (required for Next.js 14+)
// This tells Next.js to always render this route at runtime, not at build time
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if DATABASE_URL is configured
    if (!config.databaseUrl) {
      return errorResponse(
        'Database not configured',
        'DATABASE_URL environment variable is not set',
        500
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (limit > 1000) {
      return errorResponse(
        'Invalid limit',
        'Limit cannot exceed 1000',
        400
      );
    }

    // Fetch devices with relations using Prisma
    // Use raw query for complex COALESCE logic to match original behavior
    const devices = await prisma.$queryRaw<Array<{
      device_imei: string;
      device_id: string;
      provider: string;
      last_ts: bigint;
      last_temperature: number | null;
      last_humidity: number | null;
      last_light_level: number | null;
      last_accelerometer_x: number | null;
      last_accelerometer_y: number | null;
      last_accelerometer_z: number | null;
      last_accelerometer_magnitude: number | null;
      last_lat: number | null;
      last_lon: number | null;
      last_altitude: number | null;
      location_accuracy: number | null;
      location_accuracy_category: string | null;
      location_source: string | null;
      address_street: string | null;
      address_locality: string | null;
      address_state: string | null;
      address_country: string | null;
      address_postal_code: string | null;
      address_full_address: string | null;
      battery_level: number | null;
      cellular_dbm: number | null;
      cellular_network_type: string | null;
      cellular_operator: string | null;
      wifi_access_points: number | null;
      updated_at: Date;
    }>>`
      SELECT 
        dl.device_imei,
        dl.device_id,
        dl.provider,
        dl.last_ts,
        -- Prefer data from referenced tables (normalized, accurate), fallback to direct fields (real-time)
        -- Sensor data: prefer telemetry table, fallback to device_latest
        COALESCE(t.temperature, dl.last_temperature) as last_temperature,
        COALESCE(t.humidity, dl.last_humidity) as last_humidity,
        COALESCE(t.light_level, dl.last_light_level) as last_light_level,
        COALESCE(t.accelerometer_x, dl.last_accelerometer_x) as last_accelerometer_x,
        COALESCE(t.accelerometer_y, dl.last_accelerometer_y) as last_accelerometer_y,
        COALESCE(t.accelerometer_z, dl.last_accelerometer_z) as last_accelerometer_z,
        COALESCE(t.accelerometer_magnitude, dl.last_accelerometer_magnitude) as last_accelerometer_magnitude,
        -- Location data: prefer locations table, fallback to device_latest
        COALESCE(l.latitude, dl.last_lat) as last_lat,
        COALESCE(l.longitude, dl.last_lon) as last_lon,
        COALESCE(l.altitude, dl.last_altitude) as last_altitude,
        COALESCE(l.location_accuracy, dl.location_accuracy) as location_accuracy,
        COALESCE(l.location_accuracy_category, dl.location_accuracy_category) as location_accuracy_category,
        COALESCE(l.location_source, dl.location_source) as location_source,
        COALESCE(l.address_street, dl.address_street) as address_street,
        COALESCE(l.address_locality, dl.address_locality) as address_locality,
        COALESCE(l.address_state, dl.address_state) as address_state,
        COALESCE(l.address_country, dl.address_country) as address_country,
        COALESCE(l.address_postal_code, dl.address_postal_code) as address_postal_code,
        COALESCE(l.address_full_address, dl.address_full_address) as address_full_address,
        -- Device status: prefer locations table, fallback to device_latest
        COALESCE(l.battery_level, dl.battery_level) as battery_level,
        COALESCE(l.cellular_dbm, dl.cellular_dbm) as cellular_dbm,
        COALESCE(l.cellular_network_type, dl.cellular_network_type) as cellular_network_type,
        COALESCE(l.cellular_operator, dl.cellular_operator) as cellular_operator,
        COALESCE(l.wifi_access_points, dl.wifi_access_points) as wifi_access_points,
        dl.updated_at
      FROM device_latest dl
      LEFT JOIN telemetry t ON dl.latest_telemetry_id = t.id
      LEFT JOIN locations l ON dl.latest_location_id = l.id
      ORDER BY dl.updated_at DESC
      LIMIT ${limit}
    `;

    return successResponse({
      count: devices.length,
      devices: devices.map(device => ({
        ...device,
        last_ts: Number(device.last_ts), // Convert BigInt to number for JSON serialization
      })),
    });

  } catch (error) {
    logger.error('Error fetching devices', {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Check for specific timeout errors
    if (error instanceof Error && error.message.includes('timeout')) {
      return errorResponse(
        'Database timeout',
        'Database query timed out. Please try again.',
        503
      );
    }
    
    return errorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

