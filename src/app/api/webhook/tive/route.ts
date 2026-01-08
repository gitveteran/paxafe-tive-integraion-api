/**
 * Tive Webhook API Endpoint
 * POST /api/webhook/tive
 * 
 * Receives Tive IoT device telemetry payloads, validates them,
 * stores raw payload, and triggers Inngest for async processing.
 * 
 * Architecture:
 * - All events: Update device_latest critical fields synchronously for real-time dashboard
 * - All events: Save telemetry, locations, and update device_latest references asynchronously via Inngest
 */

import { NextRequest } from 'next/server';
import { validateTivePayload } from '@/lib/validators/tive-validator';
import { validateApiKey } from '@/lib/validators/api-key-validator';
import { transformToSensorPayload, transformToLocationPayload } from '@/lib/transformers/tive-to-paxafe';
import {
  storeRawPayload,
  updateDeviceLatestCritical,
  updateRawPayloadInngestEventId,
} from '@/lib/db';
import { notifyTiveOfError } from '@/lib/notifications/tive-notification';
import { inngest } from '@/lib/inngest/client';
import { TivePayload } from '@/types/tive';
import { logger } from '@/lib/logger';
import { VALIDATION } from '@/lib/constants';
import { successResponse, errorResponse } from '@/lib/api/response';

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


    // 7. Transform payload for synchronous device_latest update
    let sensorPayload, locationPayload;
    
    try {
      sensorPayload = transformToSensorPayload(body as TivePayload);
      locationPayload = transformToLocationPayload(body as TivePayload);
    } catch (transformError) {
      logger.error('Failed to transform payload', { error: transformError instanceof Error ? transformError.message : 'Unknown' });
      // Continue - transformation errors are handled
    }

    // 8. Update device_latest critical fields synchronously (for real-time dashboard)
    // All events update critical fields synchronously for immediate dashboard visibility
    if (sensorPayload && locationPayload) {
      try {
        await updateDeviceLatestCritical(
          sensorPayload.device_imei,
          sensorPayload.device_id,
          sensorPayload.timestamp,
          sensorPayload,
          locationPayload
        );
        
        logger.debug('Device latest critical fields updated synchronously', {
          device_id: body.DeviceId,
        });
      } catch (updateError) {
        logger.error('Failed to update device_latest (critical fields)', { 
          error: updateError instanceof Error ? updateError.message : 'Unknown',
          device_id: body.DeviceId,
        });
        // Continue - still process via Inngest as fallback
      }
    }
    // Note: References to telemetry/locations will be updated asynchronously via Inngest

    // 9. Return success response immediately (don't wait for Inngest)
    // Critical fields are already updated synchronously, so Tive gets fast response
    const response = successResponse({
      device_id: sensorPayload?.device_id || body.DeviceName,
      device_imei: sensorPayload?.device_imei || body.DeviceId,
      timestamp: body.EntryTimeEpoch,
      payload_id: rawPayloadId,
    }, 'Payload received and processing');

    // 10. Trigger Inngest event for async processing (non-blocking, fire-and-forget)
    // This runs after the response is sent, so it doesn't block the webhook response
    inngest.send({
      name: 'webhook/tive.process',
      data: {
        raw_id: rawPayloadId,
        payload: body as TivePayload,
        timestamp: Date.now(),
      },
    })
      .then((event) => {
        // Update raw payload with Inngest event ID (non-blocking)
        if (event && event.ids && event.ids.length > 0 && rawPayloadId) {
          const inngestEventId = event.ids[0];
          updateRawPayloadInngestEventId(rawPayloadId, inngestEventId)
            .catch(err => logger.error('Failed to update Inngest event ID', { 
              error: err instanceof Error ? err.message : 'Unknown',
              payload_id: rawPayloadId,
            }));
        }
      })
      .catch((inngestError) => {
        // Log error but don't fail - webhook already returned success
        logger.error('Failed to send Inngest event (async processing may be delayed)', { 
          error: inngestError instanceof Error ? inngestError.message : 'Unknown',
          device_id: body.DeviceId,
          payload_id: rawPayloadId,
          note: 'Critical fields already updated synchronously. Async processing will be retried if Inngest is configured later. Payload status remains "pending".'
        });
      });

    // Return response immediately (Inngest processing happens in background)
    return response;

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
