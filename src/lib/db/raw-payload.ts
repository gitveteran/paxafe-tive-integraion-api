/**
 * RawWebhookPayload database operations
 * Functions for managing raw_webhook_payloads table
 */

import { TivePayload } from '@/types/tive';
import { logger } from '@/lib/logger';
import { prisma } from './client';

/**
 * Store raw webhook payload for audit trail
 */
export async function storeRawPayload(
  payload: TivePayload,
  validationErrors?: Array<{ field: string; message: string }>,
  status: 'pending' | 'failed' = 'pending',
  inngestEventId?: string
): Promise<number> {
  try {
    const result = await prisma.rawWebhookPayload.create({
      data: {
        payload: payload as any, // Prisma Json type accepts any
        source: 'Tive',
        status,
        validationErrors: validationErrors ? (validationErrors as any) : null,
        inngestEventId: inngestEventId || null,
      },
    });
    return result.id;
  } catch (error) {
    logger.error('Error storing raw payload', {
      error: error instanceof Error ? error.message : 'Unknown',
      payload: JSON.stringify(payload),
    });
    throw new Error(`Failed to store raw payload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update raw payload status after processing
 * Preserves inngest_event_id if it was already set
 */
export async function updateRawPayloadStatus(
  payloadId: number,
  status: 'processing' | 'completed' | 'failed',
  processingError?: string
): Promise<void> {
  try {
    await prisma.rawWebhookPayload.update({
      where: { id: payloadId },
      data: {
        status,
        processedAt: new Date(),
        processingError: processingError || null,
        // inngestEventId is preserved (not updated, keeps existing value)
      },
    });
  } catch (error) {
    logger.error('Error updating raw payload status', {
      error: error instanceof Error ? error.message : 'Unknown',
      payloadId,
      status,
    });
    throw error;
  }
}

/**
 * Update inngest_event_id for a raw payload
 * Used when Inngest event is created after initial payload storage
 */
export async function updateRawPayloadInngestEventId(
  payloadId: number,
  inngestEventId: string
): Promise<void> {
  try {
    await prisma.rawWebhookPayload.update({
      where: { id: payloadId },
      data: { inngestEventId },
    });
  } catch (error) {
    logger.error('Error updating raw payload inngest_event_id', {
      error: error instanceof Error ? error.message : 'Unknown',
      payloadId,
      inngestEventId,
    });
    throw error;
  }
}
