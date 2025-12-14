/**
 * Inngest functions for processing webhook payloads
 */

import { inngest } from './client';
import { transformToSensorPayload, transformToLocationPayload } from '@/lib/transformers/tive-to-paxafe';
import { saveTelemetry, saveLocation, updateRawPayloadStatus } from '@/lib/db';
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
    const { raw_id, payload } = event.data as {
      raw_id: number;
      payload: TivePayload;
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

    // Step 2: Store normalized data in separate tables
    await step.run('save-normalized-data', async () => {
      try {
        await Promise.all([
          saveTelemetry(sensorPayload),
          saveLocation(locationPayload),
        ]);
      } catch (error) {
        throw new Error(`Database save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Step 3: Update raw payload status
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

