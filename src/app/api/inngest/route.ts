/**
 * Inngest API route
 * Handles Inngest events and function execution
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { processTiveWebhook } from '@/lib/inngest/functions';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processTiveWebhook,
  ],
});

