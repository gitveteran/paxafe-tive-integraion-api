/**
 * API endpoint to fetch latest device states from device_latest table
 * GET /api/devices
 */

import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';
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

    const query = `
      SELECT 
        dl.device_imei,
        dl.device_id,
        dl.provider,
        dl.last_ts,
        -- Sensor data from telemetry
        t.temperature as last_temperature,
        t.humidity as last_humidity,
        t.light_level as last_light_level,
        t.accelerometer_x as last_accelerometer_x,
        t.accelerometer_y as last_accelerometer_y,
        t.accelerometer_z as last_accelerometer_z,
        t.accelerometer_magnitude as last_accelerometer_magnitude,
        -- Location data from locations
        l.latitude as last_lat,
        l.longitude as last_lon,
        l.altitude as last_altitude,
        l.location_accuracy,
        l.location_accuracy_category,
        l.location_source,
        l.address_street,
        l.address_locality,
        l.address_state,
        l.address_country,
        l.address_postal_code,
        l.address_full_address,
        -- Device status from location
        l.battery_level,
        l.cellular_dbm,
        l.cellular_network_type,
        l.cellular_operator,
        l.wifi_access_points,
        dl.updated_at
      FROM device_latest dl
      LEFT JOIN telemetry t ON dl.latest_telemetry_id = t.id
      LEFT JOIN locations l ON dl.latest_location_id = l.id
      ORDER BY dl.updated_at DESC
      LIMIT $1
    `;

    // Add timeout wrapper
    const queryPromise = pool.query(query, [limit]);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 30000)
    );

    const result = await Promise.race([queryPromise, timeoutPromise]) as any;

    return successResponse({
      count: result.rows.length,
      devices: result.rows,
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

