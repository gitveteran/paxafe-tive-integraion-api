# Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

This project uses **Prisma ORM** for database management. The schema is defined in `prisma/schema.prisma`.

#### Option A: Local PostgreSQL

```bash
# Create database
createdb paxafe_integration

# Set DATABASE_URL in .env.local
# DATABASE_URL=postgresql://user:password@localhost:5432/paxafe_integration

# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate
```

#### Option B: Managed PostgreSQL (Recommended)

1. **Neon** (Recommended for Vercel):
   - Go to https://neon.tech
   - Create a free database
   - Copy connection string
   - Add to `.env.local` as `DATABASE_URL`

2. **Supabase**:
   - Go to https://supabase.com
   - Create a project
   - Get connection string from Settings > Database
   - Add to `.env.local` as `DATABASE_URL`

After setting `DATABASE_URL`:

```bash
# Generate Prisma Client
npm run db:generate

# Run migrations (creates tables)
npm run db:migrate
```

### 3. Inngest Setup

1. Go to https://app.inngest.com
2. Sign up for free account
3. Create a new app
4. Add your local/dev URL: `http://localhost:3000/api/inngest`
5. Inngest will automatically discover your functions

**Note**: For local development, you can use Inngest Dev Server:
```bash
npx inngest-cli@latest dev
```

### 4. Environment Variables

Create `.env.local`:

```bash
# Required
API_KEY=your-secret-api-key-here
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Optional
TIVE_ERROR_WEBHOOK_URL=https://tive.example.com/webhooks/errors
TIVE_WEBHOOK_SECRET=your-webhook-secret
NODE_ENV=development
```

### 5. Run Development Server

```bash
npm run dev
```

### 6. Test Webhook

```bash
curl -X POST http://localhost:3000/api/webhook/tive \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-secret-api-key-here" \
  -d @e:\Project\Home_Assessment\paxafe\px-sr-sw-eng_phase2_take-home\sample-tive-payloads.json
```

Or use the sample payloads from the exercise folder.

## Verification

1. **Webhook**: Send a test payload, should return 200 OK
2. **Dashboard**: Visit http://localhost:3000 - should show device states
3. **Inngest**: Check https://app.inngest.com - should show events being processed
4. **Database**: Query `device_latest` table - should have device records

## Troubleshooting

### Inngest not processing events

- Check Inngest dashboard for errors
- Verify `/api/inngest` route is accessible
- Check function registration in Inngest dashboard

### Database connection errors

- Verify `DATABASE_URL` is correct
- Check database is accessible
- Run `npm run db:generate` to generate Prisma Client
- Run `npm run db:migrate` to apply migrations
- Check Prisma migration status: `npx prisma migrate status`

### Webhook returns 401

- Check `API_KEY` environment variable is set
- Verify header is `X-API-Key` or `Authorization: Bearer <key>`

## Production Deployment

### Vercel

1. Push code to GitHub
2. Import in Vercel
3. Add environment variables
4. Deploy
5. Update Inngest app URL to your Vercel URL

### Environment Variables for Production

Add all variables from `.env.local` to Vercel dashboard:
- Settings > Environment Variables

## Next Steps

- Send test payloads using sample data
- Monitor Inngest dashboard for processing
- Check device dashboard for real-time updates
- Review database tables for stored data

