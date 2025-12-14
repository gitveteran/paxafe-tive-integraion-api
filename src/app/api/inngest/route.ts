/**
 * Inngest API route
 * Handles Inngest events and function execution
 * 
 * This route is used by Inngest to:
 * - Discover and register functions
 * - Execute functions when events are triggered
 * - Handle retries and error reporting
 * 
 * For Vercel deployment:
 * - Must be dynamic (not statically optimized)
 * - Must use Node.js runtime (not Edge)
 */

import { serve } from 'inngest/next';
import { inngest } from '@/lib/inngest/client';
import { processTiveWebhook } from '@/lib/inngest/functions';

// Ensure this route is dynamic for Vercel deployment
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processTiveWebhook,
  ],
});

