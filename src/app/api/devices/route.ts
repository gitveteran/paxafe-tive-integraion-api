/**
 * API endpoint to fetch latest device states from device_latest table
 * GET /api/devices
 */

import { NextRequest } from 'next/server';
import { getDeviceLatestList } from '@/lib/db';
import { logger } from '@/lib/logger';
import { successResponse, errorResponse } from '@/lib/api/response';
import { Prisma } from '@prisma/client';

// Type automatically generated from Prisma schema - no manual updates needed!
type DeviceLatest = Prisma.DeviceLatestGetPayload<{}>;

/**
 * Serialize Prisma entities for JSON response
 * Only handles type conversion needed for JSON serialization (Decimal, BigInt)
 * Returns entities as-is (camelCase) - frontend handles the rest
 */
function serializeDevice(device: DeviceLatest): any {
  return JSON.parse(
    JSON.stringify(device, (_, value) => {
      // Convert Prisma Decimal to number
      if (value && typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') {
        return value.toNumber();
      }
      // Convert BigInt to number
      if (typeof value === 'bigint') {
        return Number(value);
      }
      return value;
    })
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const devices = await getDeviceLatestList(limit);

    return successResponse({
      count: devices.length,
      devices: devices.map(serializeDevice),
    });

  } catch (error) {
    logger.error('Error fetching devices', {
      error: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return errorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error',
      500
    );
  }
}

