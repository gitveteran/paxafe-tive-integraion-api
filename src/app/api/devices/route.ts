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
        device_imei,
        device_id,
        provider,
        last_ts,
        -- Sensor data
        last_temperature,
        last_humidity,
        last_light_level,
        last_accelerometer_x,
        last_accelerometer_y,
        last_accelerometer_z,
        last_accelerometer_magnitude,
        -- Location data
        last_lat,
        last_lon,
        last_altitude,
        location_accuracy,
        location_accuracy_category,
        location_source,
        address_street,
        address_locality,
        address_state,
        address_country,
        address_postal_code,
        address_full_address,
        -- Device status
        battery_level,
        cellular_dbm,
        cellular_network_type,
        cellular_operator,
        wifi_access_points,
        updated_at
      FROM device_latest
      ORDER BY updated_at DESC
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

