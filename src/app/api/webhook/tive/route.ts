/**
 * Tive Webhook API Endpoint
 * POST /api/webhook/tive
 * 
 * Receives Tive IoT device telemetry payloads, validates them,
 * stores raw payload, and triggers Inngest for async processing.
 * 
 * Architecture:
 * - Critical events: Save telemetry, locations, and device_latest synchronously for immediate alerts
 *   (Still sends to Inngest for raw payload status update, but skips duplicate saves)
 * - Normal events: Save telemetry, locations, and device_latest asynchronously via Inngest
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateTivePayload } from '@/lib/validators/tive-validator';
import { transformToSensorPayload, transformToLocationPayload } from '@/lib/transformers/tive-to-paxafe';
import {
  storeRawPayload,
  updateDeviceLatest,
  saveTelemetry,
  saveLocation,
} from '@/lib/db';
import { notifyTiveOfError } from '@/lib/notifications/tive-notification';
import { inngest } from '@/lib/inngest/client';
import { TivePayload } from '@/types/tive';
import { timingSafeEqual } from 'crypto';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';
import { VALIDATION } from '@/lib/constants';
import { successResponse, errorResponse } from '@/lib/api/response';
import { isCriticalEvent } from '@/lib/utils/critical-detector';

/**
 * Validate API key from request headers
 */
function validateApiKey(request: NextRequest): boolean {
  const apiKey = 
    request.headers.get('x-api-key') || 
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  
  const expectedApiKey = config.apiKey;
  
  if (!expectedApiKey || !apiKey) {
    return false;
  }

  // Timing-safe comparison to prevent timing attacks
  if (apiKey.length !== expectedApiKey.length) {
    return false;
  }

  try {
    const apiKeyBuffer = Buffer.from(apiKey, 'utf8');
    const expectedBuffer = Buffer.from(expectedApiKey, 'utf8');
    return timingSafeEqual(apiKeyBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  let rawPayloadId: number | undefined;
  
  try {
    // 1. API Key validation
    if (!validateApiKey(request)) {
      return errorResponse(
        'Unauthorized',
        'Invalid or missing API key. Provide API key via X-API-Key header or Authorization: Bearer <key>',
        401
      );
    }

    // 2. Validate payload size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > VALIDATION.MAX_PAYLOAD_SIZE) {
      return errorResponse(
        'Payload too large',
        `Maximum payload size is ${VALIDATION.MAX_PAYLOAD_SIZE / 1024}KB`,
        413
      );
    }

    // 3. Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return errorResponse(
        'Invalid JSON',
        'Request body must be valid JSON',
        400
      );
    }

    // 4. Validate payload structure and data
    const validation = validateTivePayload(body);
    
    if (!validation.valid) {
      // Store invalid payload for audit trail
      try {
        rawPayloadId = await storeRawPayload(
          body as TivePayload,
          validation.errors,
          'failed'
        );
      } catch (dbError) {
        logger.error('Failed to store invalid payload', { 
          error: dbError instanceof Error ? dbError.message : 'Unknown',
          payloadId: rawPayloadId 
        });
      }

      // Notify Tive about validation errors
      try {
        await notifyTiveOfError({
          payload_id: rawPayloadId?.toString() || 'unknown',
          device_id: body.DeviceId || body.DeviceName || 'unknown',
          timestamp: body.EntryTimeEpoch || Date.now(),
          error_type: 'validation',
          errors: validation.errors,
          retryable: false,
          received_at: Date.now(),
        });
      } catch (notifyError) {
        logger.error('Failed to notify Tive', { error: notifyError instanceof Error ? notifyError.message : 'Unknown' });
      }

      // Return validation errors immediately
      return errorResponse(
        'Validation failed',
        'Payload validation failed. See details for specific errors.',
        400,
        { errors: validation.errors, payload_id: rawPayloadId }
      );
    }

    // 5. Store raw payload in database (audit trail)
    try {
      rawPayloadId = await storeRawPayload(body as TivePayload, undefined, 'pending');
    } catch (dbError) {
      logger.error('Failed to store raw payload', { 
        error: dbError instanceof Error ? dbError.message : 'Unknown',
        payloadId: rawPayloadId 
      });
      return errorResponse(
        'Database error',
        'Failed to store payload. Please retry.',
        503
      );
    }


    // 7. Check for critical events (values outside normal operating ranges)
    const criticalCheck = isCriticalEvent(body as TivePayload);
    let criticalSensorPayload, criticalLocationPayload;
    
    try {
      criticalSensorPayload = transformToSensorPayload(body as TivePayload);
      criticalLocationPayload = transformToLocationPayload(body as TivePayload);
    } catch (transformError) {
      logger.error('Failed to transform payload', { error: transformError instanceof Error ? transformError.message : 'Unknown' });
      // Continue - transformation errors are handled
    }

    // 8. Update device_latest conditionally based on criticality
    let criticalTelemetryId: number | undefined;
    let criticalLocationId: number | undefined;
    
    if (criticalCheck.isCritical && criticalSensorPayload && criticalLocationPayload) {
      // CRITICAL EVENT: Save telemetry and location synchronously, then update device_latest
      // This ensures immediate dashboard alerts for critical events
      try {
        const [telemetryId, locationId] = await Promise.all([
          saveTelemetry(criticalSensorPayload),
          saveLocation(criticalLocationPayload),
        ]);
        
        criticalTelemetryId = telemetryId;
        criticalLocationId = locationId;
        
        await updateDeviceLatest(
          criticalSensorPayload.device_imei,
          criticalSensorPayload.device_id,
          body.EntryTimeEpoch,
          telemetryId,
          locationId
        );
        logger.warn('Critical event: device_latest updated synchronously', {
          device_id: body.DeviceId,
          reasons: criticalCheck.reasons,
        });
      } catch (updateError) {
        logger.error('Failed to update device_latest (critical)', { 
          error: updateError instanceof Error ? updateError.message : 'Unknown',
          device_id: body.DeviceId,
        });
        // Continue - still process via Inngest as fallback
      }
    }
    // Note: Normal events will update device_latest asynchronously via Inngest

    // 9. Trigger Inngest event for async processing (normalization and storage)
    let inngestEventId: string | undefined;
    try {
      const event = await inngest.send({
        name: 'webhook/tive.process',
        data: {
          raw_id: rawPayloadId,
          payload: body as TivePayload,
          timestamp: Date.now(),
          is_critical: criticalCheck.isCritical,
          // If critical event was saved synchronously, pass IDs to avoid duplicate saves
          telemetry_id: criticalTelemetryId,
          location_id: criticalLocationId,
        },
      });
      
      // Store Inngest event ID for tracking
      if (event && event.ids && event.ids.length > 0) {
        inngestEventId = event.ids[0];
        // Update raw payload with Inngest event ID (non-blocking)
        storeRawPayload(body as TivePayload, undefined, 'pending', inngestEventId)
          .catch(err => logger.error('Failed to update Inngest event ID', { error: err instanceof Error ? err.message : 'Unknown' }));
      }
    } catch (inngestError) {
      logger.error('Failed to send Inngest event', { error: inngestError instanceof Error ? inngestError.message : 'Unknown' });
      // Update raw payload status to failed
      try {
        await storeRawPayload(
          body as TivePayload,
          undefined,
          'failed'
        );
      } catch (dbError) {
        logger.error('Failed to update raw payload status', { error: dbError instanceof Error ? dbError.message : 'Unknown' });
      }
      
      return errorResponse(
        'Processing error',
        'Failed to queue payload for processing. Please retry.',
        503,
        { payload_id: rawPayloadId }
      );
    }

    // 10. Return success response immediately
    return successResponse({
      device_id: criticalSensorPayload?.device_id || body.DeviceName,
      device_imei: criticalSensorPayload?.device_imei || body.DeviceId,
      timestamp: body.EntryTimeEpoch,
      is_critical: criticalCheck.isCritical,
      critical_reasons: criticalCheck.isCritical ? criticalCheck.reasons : undefined,
      payload_id: rawPayloadId,
      inngest_event_id: inngestEventId,
    }, 'Payload received and queued for processing');

  } catch (error) {
    // Catch-all for unexpected errors
    logger.error('Unexpected error processing webhook', { error: error instanceof Error ? error.message : 'Unknown' });
    
    // Note: We can't update raw payload status here since we don't have the body
    // The error is logged and returned to the client

    return errorResponse(
      'Internal server error',
      error instanceof Error ? error.message : 'Unknown error occurred',
      500,
      { payload_id: rawPayloadId }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return errorResponse(
    'Method not allowed',
    'Only POST method is supported',
    405
  );
}
