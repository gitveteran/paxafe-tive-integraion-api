/**
 * Standardized API response helpers
 */

import { NextResponse } from 'next/server';

export function successResponse<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function errorResponse(
  error: string,
  message: string,
  status: number = 400,
  details?: any
) {
  return NextResponse.json({
    success: false,
    error,
    message,
    details,
    timestamp: new Date().toISOString(),
  }, { status });
}
