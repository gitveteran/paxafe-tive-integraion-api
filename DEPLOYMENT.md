# Deployment Guide

## Inngest + Vercel Deployment

### How Inngest Works with Vercel

**Yes, Inngest works perfectly with Vercel!** Here's how:

1. **Inngest is a Cloud Service**: Inngest runs as a separate cloud service (like a message queue)
2. **Your Code Runs on Vercel**: Your Next.js app (including Inngest functions) runs on Vercel's serverless functions
3. **Communication Flow**:
   ```
   Your App (Vercel) → inngest.send() → Inngest Cloud
                                              ↓
   Inngest Cloud → HTTP POST → /api/inngest (Vercel) → Execute Function
   ```

### Architecture

- **Event Sending**: When your webhook receives a payload, it calls `inngest.send()` which sends an event to Inngest's cloud
- **Function Execution**: Inngest then calls back to your Vercel deployment at `/api/inngest` to execute the function
- **No Additional Infrastructure**: You don't need to run any servers, queues, or workers - Inngest handles everything

### Deployment Steps

#### 1. Deploy to Vercel

```bash
# Push to GitHub
git push origin main

# Import in Vercel
# - Go to vercel.com
# - Import your GitHub repository
# - Vercel will auto-detect Next.js
```

#### 2. Set Environment Variables in Vercel

In Vercel Dashboard → Settings → Environment Variables, add:

**Required:**
- `API_KEY` - Your API key for webhook authentication
- `DATABASE_URL` - Your PostgreSQL connection string
- `INNGEST_EVENT_KEY` - From Inngest dashboard
- `INNGEST_SIGNING_KEY` - From Inngest dashboard

**Optional:**
- `TIVE_ERROR_WEBHOOK_URL` - If you want to notify Tive of errors
- `NODE_ENV` - Set to `production`

#### 3. Configure Inngest

1. **Get Your Keys**:
   - Go to https://app.inngest.com
   - Create an app (or use existing)
   - Copy `Event Key` and `Signing Key`

2. **Add Your Vercel URL**:
   - In Inngest dashboard, go to your app settings
   - Add your Vercel URL: `https://your-app.vercel.app`
   - Inngest will automatically discover functions at `https://your-app.vercel.app/api/inngest`

3. **Verify Functions**:
   - Check Inngest dashboard → Functions
   - You should see `processTiveWebhook` function registered

### How It Works in Production

1. **Webhook Receives Payload**:
   ```
   POST /api/webhook/tive
   → Validates payload
   → Stores raw payload in DB
   → Updates device_latest
   → Calls inngest.send({ event: 'webhook/tive.process', data: {...} })
   → Returns 200 OK (fast response!)
   ```

2. **Inngest Processes Event**:
   ```
   Inngest Cloud receives event
   → Queues it for processing
   → Calls back to Vercel: POST /api/inngest
   → Vercel executes processTiveWebhook function
   → Function transforms data and saves to normalized tables
   → If error: Inngest retries automatically (3 times)
   → If still fails: Goes to Dead Letter Queue
   ```

### Key Points

✅ **Works with Vercel Serverless**: Inngest functions run as Next.js API routes, which are serverless functions on Vercel

✅ **No Additional Infrastructure**: You don't need Redis, RabbitMQ, or any other queue service

✅ **Automatic Retries**: Inngest handles retries with exponential backoff automatically

✅ **Dead Letter Queue**: Failed events go to DLQ for manual inspection

✅ **Observability**: Monitor all events and function executions in Inngest dashboard

✅ **Free Tier**: 25,000 function invocations per month (perfect for development and small production workloads)

### Troubleshooting

#### Functions Not Appearing in Inngest Dashboard

1. **Check URL Configuration**:
   - Ensure your Vercel URL is correct in Inngest dashboard
   - URL should be: `https://your-app.vercel.app` (no trailing slash)

2. **Check Environment Variables**:
   - Verify `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set in Vercel
   - Redeploy after adding environment variables

3. **Check Route Accessibility**:
   - Visit `https://your-app.vercel.app/api/inngest` in browser
   - Should return Inngest discovery response (not 404)

#### Events Not Processing

1. **Check Inngest Dashboard**:
   - Go to Events tab
   - See if events are being received
   - Check for errors in function execution

2. **Check Vercel Logs**:
   - Go to Vercel dashboard → Your deployment → Functions
   - Check `/api/inngest` function logs
   - Look for errors or timeouts

3. **Verify Database Connection**:
   - Ensure `DATABASE_URL` is correct
   - Check if database is accessible from Vercel (not blocked by firewall)

#### Function Timeouts

- Vercel serverless functions have execution time limits:
  - Hobby: 10 seconds
  - Pro: 60 seconds
  - Enterprise: 300 seconds
- If your function takes longer, consider:
  - Breaking it into smaller steps
  - Using Inngest's step functions (already implemented)
  - Optimizing database queries

### Local Development

For local development, you can use Inngest Dev Server:

```bash
# Terminal 1: Run your Next.js app
npm run dev

# Terminal 2: Run Inngest Dev Server
npx inngest-cli@latest dev
```

The dev server will:
- Receive events from your local app
- Execute functions locally
- Show logs and debugging info
- Provide a local dashboard at http://localhost:8288

### Production Checklist

- [ ] Code pushed to GitHub
- [ ] Vercel deployment successful
- [ ] All environment variables set in Vercel
- [ ] Inngest app created
- [ ] Inngest keys added to Vercel environment variables
- [ ] Vercel URL added to Inngest dashboard
- [ ] Functions visible in Inngest dashboard
- [ ] Database accessible from Vercel
- [ ] Test webhook payload sent successfully
- [ ] Events processing in Inngest dashboard
- [ ] Data appearing in database tables

### Cost Considerations

**Vercel:**
- Hobby: Free (with limitations)
- Pro: $20/month (better limits)

**Inngest:**
- Free: 25K invocations/month
- Pro: $20/month (unlimited invocations)

**Database (PostgreSQL):**
- Neon: Free tier available
- Supabase: Free tier available
- Railway: Free tier available

For a small to medium production workload, you can run everything on free tiers!

