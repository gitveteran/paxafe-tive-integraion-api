/**
 * Inngest functions for processing webhook payloads
 */

import { inngest } from './client';
import { transformToSensorPayload, transformToLocationPayload } from '@/lib/transformers/tive-to-paxafe';
import { saveTelemetry, saveLocation, updateRawPayloadStatus, updateDeviceLatest } from '@/lib/db';
import { TivePayload } from '@/types/tive';
import { logger } from '@/lib/logger';

/**
 * Process Tive webhook payload
 * Handles transformation and storage of normalized data
 * Inngest automatically handles retries and DLQ
 */
export const processTiveWebhook = inngest.createFunction(
  {
    id: 'process-tive-webhook',
    name: 'Process Tive Webhook',
    retries: 3, // Inngest handles retries with exponential backoff
  },
  { event: 'webhook/tive.process' },
  async ({ event, step }) => {
    const { raw_id, payload, is_critical, telemetry_id, location_id } = event.data as {
      raw_id: number;
      payload: TivePayload;
      is_critical?: boolean;
      telemetry_id?: number;
      location_id?: number;
    };

    // Step 1: Transform to PAXAFE formats
    const sensorPayload = await step.run('transform-sensor', async () => {
      try {
        return transformToSensorPayload(payload);
      } catch (error) {
        throw new Error(`Sensor transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    const locationPayload = await step.run('transform-location', async () => {
      try {
        return transformToLocationPayload(payload);
      } catch (error) {
        throw new Error(`Location transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Step 2: Store normalized data in separate tables and get IDs
    // Skip if already saved synchronously for critical events (IDs provided)
    const { telemetryId, locationId } = await step.run('save-normalized-data', async () => {
      // If IDs are provided (critical event already saved synchronously), use them
      if (is_critical && telemetry_id && location_id) {
        logger.debug('Critical event already saved synchronously, using provided IDs', {
          telemetry_id,
          location_id,
        });
        return { telemetryId: telemetry_id, locationId: location_id };
      }
      
      // For normal events, or if critical event save failed, save them now
      try {
        const [telemetryId, locationId] = await Promise.all([
          saveTelemetry(sensorPayload),
          saveLocation(locationPayload),
        ]);
        return { telemetryId, locationId };
      } catch (error) {
        throw new Error(`Database save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Step 3: Update device_latest asynchronously
    // Skip if already updated synchronously for critical events
    if (!is_critical || !telemetry_id || !location_id) {
      await step.run('update-device-latest', async () => {
        try {
          await updateDeviceLatest(
            sensorPayload.device_imei,
            sensorPayload.device_id,
            sensorPayload.timestamp,
            telemetryId,
            locationId
          );
        } catch (error) {
          // Non-critical, log but don't fail
          logger.error('Failed to update device_latest (async)', {
            error: error instanceof Error ? error.message : 'Unknown',
            device_imei: sensorPayload.device_imei,
            raw_id,
          });
        }
      });
    } else {
      logger.debug('Critical event device_latest already updated synchronously, skipping');
    }

    // Step 4: Update raw payload status
    await step.run('update-raw-status', async () => {
      try {
        await updateRawPayloadStatus(raw_id, 'completed');
      } catch (error) {
        // Non-critical, log but don't fail
        logger.error('Failed to update raw payload status', {
          error: error instanceof Error ? error.message : 'Unknown',
          raw_id,
        });
      }
    });

    return {
      success: true,
      raw_id,
      device_imei: sensorPayload.device_imei,
      timestamp: sensorPayload.timestamp,
    };
  }
);

