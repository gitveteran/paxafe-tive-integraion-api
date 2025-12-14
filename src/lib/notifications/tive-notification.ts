/**
 * Notification system for informing Tive about processing errors
 * Only notifies for validation errors (Tive's responsibility)
 */

import { logger } from '@/lib/logger';
import { config } from '@/lib/config';

export interface TiveErrorNotification {
  payload_id: string;
  device_id: string;
  timestamp: number;
  error_type: 'validation' | 'processing' | 'transformation';
  errors: Array<{ field: string; message: string }>;
  retryable: boolean;
  received_at: number;
}

/**
 * Generate signature for webhook security
 */
function generateSignature(payload: TiveErrorNotification): string {
  const secret = process.env.TIVE_WEBHOOK_SECRET || '';
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest('hex');
}

/**
 * Notify Tive of processing errors
 * Only notifies for validation errors (Tive's responsibility to fix)
 */
export async function notifyTiveOfError(
  notification: TiveErrorNotification
): Promise<void> {
  // Only notify for validation errors (Tive's responsibility)
  if (notification.error_type !== 'validation') {
    return; // Don't spam Tive with our internal issues
  }

  const tiveWebhookUrl = config.tiveErrorWebhookUrl;
  if (!tiveWebhookUrl) {
    logger.warn('TIVE_ERROR_WEBHOOK_URL not configured - skipping notification');
    return;
  }

  try {
    const signature = generateSignature(notification);
    
    const response = await fetch(tiveWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Paxafe-Signature': signature,
        'X-Paxafe-Timestamp': Date.now().toString(),
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      logger.error('Failed to notify Tive', {
        status: response.status,
        statusText: response.statusText,
      });
    }
  } catch (error) {
    // Log but don't fail - notification is best-effort
    logger.error('Failed to notify Tive', {
      error: error instanceof Error ? error.message : 'Unknown',
    });
  }
}

