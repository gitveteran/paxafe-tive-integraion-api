/**
 * Tive Webhook API Endpoint
 * POST /api/webhook/tive
 * 
 * Receives Tive IoT device telemetry payloads, validates them,
 * stores raw payload, updates device_latest, and triggers Inngest for async processing.
 * 
 * Architecture:
 * - Fast synchronous path: validation + raw storage + device_latest update
 * - Async path: Inngest handles transformation and normalized storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateTivePayload } from '@/lib/validators/tive-validator';
import { transformToSensorPayload, transformToLocationPayload } from '@/lib/transformers/tive-to-paxafe';
import {
  storeRawPayload,
  updateDeviceLatest,
  extractCriticalFields,
  checkAndUpdatePayloadOrder,
} from '@/lib/db';
import { notifyTiveOfError } from '@/lib/notifications/tive-notification';
import { inngest } from '@/lib/inngest/client';
import { TivePayload } from '@/types/tive';

/**
 * Validate API key from request headers
 */
function validateApiKey(request: NextRequest): boolean {
  const apiKey = 
    request.headers.get('x-api-key') || 
    request.headers.get('authorization')?.replace('Bearer ', '') ||
    request.headers.get('authorization')?.replace('bearer ', '');
  
  const expectedApiKey = process.env.API_KEY;
  
  if (!expectedApiKey) {
    console.warn('API_KEY not configured in environment variables');
    return false;
  }
  
  return apiKey === expectedApiKey;
}

export async function POST(request: NextRequest) {
  let rawPayloadId: number | undefined;
  
  try {
    // 1. API Key validation
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          message: 'Invalid or missing API key. Provide API key via X-API-Key header or Authorization: Bearer <key>' 
        },
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { 
          error: 'Invalid JSON', 
          message: 'Request body must be valid JSON' 
        },
        { status: 400 }
      );
    }

    // 3. Validate payload structure and data
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
        console.error('Failed to store invalid payload:', dbError);
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
        console.error('Failed to notify Tive:', notifyError);
      }

      // Return validation errors immediately
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          errors: validation.errors,
          payload_id: rawPayloadId,
        },
        { status: 400 }
      );
    }

    // 4. Store raw payload in database (audit trail)
    try {
      rawPayloadId = await storeRawPayload(body as TivePayload, undefined, 'pending');
    } catch (dbError) {
      console.error('Failed to store raw payload:', dbError);
      return NextResponse.json(
        { 
          error: 'Database error', 
          message: 'Failed to store payload. Please retry.',
        },
        { status: 503 }
      );
    }

    // 5. Check for out-of-order payloads (edge case)
    let isOutOfOrder = false;
    try {
      const orderCheck = await checkAndUpdatePayloadOrder(
        body.DeviceId,
        body.EntryTimeEpoch
      );
      isOutOfOrder = orderCheck.isOutOfOrder;
      if (isOutOfOrder) {
        console.warn(`Out-of-order payload detected for device ${body.DeviceId}`);
      }
    } catch (orderError) {
      console.error('Failed to check payload order:', orderError);
      // Continue processing even if order check fails
    }

    // 6. Extract critical fields and transform for device_latest
    let criticalSensorPayload, criticalLocationPayload;
    try {
      criticalSensorPayload = transformToSensorPayload(body as TivePayload);
      criticalLocationPayload = transformToLocationPayload(body as TivePayload);
    } catch (transformError) {
      console.error('Failed to transform for device_latest:', transformError);
      // Continue - device_latest update is non-critical
    }

    // 7. Update device_latest synchronously (for fast dashboard queries)
    if (criticalSensorPayload && criticalLocationPayload) {
      try {
        await updateDeviceLatest(
          criticalSensorPayload.device_imei,
          criticalSensorPayload.device_id,
          body.EntryTimeEpoch,
          criticalSensorPayload,
          criticalLocationPayload
        );
      } catch (updateError) {
        console.error('Failed to update device_latest:', updateError);
        // Non-critical, continue
      }
    }

    // 8. Trigger Inngest event for async processing (normalization and storage)
    let inngestEventId: string | undefined;
    try {
      const event = await inngest.send({
        name: 'webhook/tive.process',
        data: {
          raw_id: rawPayloadId,
          payload: body as TivePayload,
          timestamp: Date.now(),
        },
      });
      
      // Store Inngest event ID for tracking
      if (event && event.ids && event.ids.length > 0) {
        inngestEventId = event.ids[0];
        // Update raw payload with Inngest event ID (non-blocking)
        storeRawPayload(body as TivePayload, undefined, 'pending', inngestEventId)
          .catch(err => console.error('Failed to update Inngest event ID:', err));
      }
    } catch (inngestError) {
      console.error('Failed to send Inngest event:', inngestError);
      // Update raw payload status to failed
      try {
        await storeRawPayload(
          body as TivePayload,
          undefined,
          'failed'
        );
      } catch (dbError) {
        console.error('Failed to update raw payload status:', dbError);
      }
      
      return NextResponse.json(
        { 
          error: 'Processing error', 
          message: 'Failed to queue payload for processing. Please retry.',
          payload_id: rawPayloadId,
        },
        { status: 503 }
      );
    }

    // 9. Return success response immediately
    return NextResponse.json({
      success: true,
      message: 'Payload received and queued for processing',
      data: {
        device_id: criticalSensorPayload?.device_id || body.DeviceName,
        device_imei: criticalSensorPayload?.device_imei || body.DeviceId,
        timestamp: body.EntryTimeEpoch,
        out_of_order: isOutOfOrder,
      },
      payload_id: rawPayloadId,
      inngest_event_id: inngestEventId,
    }, { status: 200 });

  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Unexpected error processing webhook:', error);
    
    // Note: We can't update raw payload status here since we don't have the body
    // The error is logged and returned to the client

    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        payload_id: rawPayloadId,
      },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Only POST method is supported' },
    { status: 405 }
  );
}
