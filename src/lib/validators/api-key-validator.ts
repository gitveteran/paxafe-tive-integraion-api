/**
 * API Key validation functions
 * Provides secure API key validation with timing-safe comparison
 */

import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { config } from '@/lib/config';

/**
 * Validate API key from request headers
 * Supports both X-API-Key header and Authorization: Bearer <key> format
 * Uses timing-safe comparison to prevent timing attacks
 * 
 * @param request - Next.js request object
 * @returns true if API key is valid, false otherwise
 */
export function validateApiKey(request: NextRequest): boolean {
  // Extract API key from headers (supports both formats)
  const apiKey = 
    request.headers.get('x-api-key') || 
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  
  const expectedApiKey = config.apiKey;
  
  // Both API key and expected key must be present
  if (!expectedApiKey || !apiKey) {
    return false;
  }

  // Length check before timing-safe comparison (early exit for different lengths)
  if (apiKey.length !== expectedApiKey.length) {
    return false;
  }

  // Timing-safe comparison to prevent timing attacks
  try {
    const apiKeyBuffer = Buffer.from(apiKey, 'utf8');
    const expectedBuffer = Buffer.from(expectedApiKey, 'utf8');
    return timingSafeEqual(apiKeyBuffer, expectedBuffer);
  } catch {
    // If buffer creation fails, return false
    return false;
  }
}

/**
 * Get API key from request headers (for logging/debugging purposes)
 * Does not validate the key, only extracts it
 * 
 * @param request - Next.js request object
 * @returns API key string or null if not found
 */
export function getApiKeyFromRequest(request: NextRequest): string | null {
  return (
    request.headers.get('x-api-key') || 
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    null
  );
}

