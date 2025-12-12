/**
 * API endpoint to fetch latest device states from device_latest table
 * GET /api/devices
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // Check if DATABASE_URL is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: 'Database not configured',
          message: 'DATABASE_URL environment variable is not set',
        },
        { status: 500 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (limit > 1000) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 1000' },
        { status: 400 }
      );
    }

    const query = `
      SELECT 
        device_imei,
        device_id,
        provider,
        last_ts,
        last_temperature,
        last_lat,
        last_lon,
        location_accuracy,
        location_accuracy_category,
        location_source,
        address_full_address,
        battery_level,
        cellular_dbm,
        wifi_access_points,
        updated_at
      FROM device_latest
      ORDER BY updated_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    return NextResponse.json({
      success: true,
      count: result.rows.length,
      devices: result.rows,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching devices:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

