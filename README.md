# PAXAFE Tive Integration API

A production-ready Next.js integration API that receives Tive IoT device telemetry webhooks, validates them, transforms to PAXAFE normalized formats, and stores in PostgreSQL using Inngest for async processing.

## Features

- ✅ **Webhook Endpoint**: `POST /api/webhook/tive` with API key authentication
- ✅ **Comprehensive Validation**: Validates payload structure, data types, and business rules
- ✅ **Data Transformation**: Converts Tive payloads to PAXAFE sensor and location formats
- ✅ **PostgreSQL Storage**: Normalized tables with raw payload audit trail
- ✅ **Prisma ORM**: Type-safe database operations with automatic migrations
- ✅ **Inngest Integration**: Async processing with automatic retries and DLQ
- ✅ **Device Dashboard**: Real-time device state visualization
- ✅ **Error Handling**: Categorized errors with retry logic and Tive notifications
- ✅ **Edge Case Handling**: Duplicate detection, out-of-order payloads, missing fields
- ✅ **Scalability Ready**: Hybrid sync/async architecture for high throughput

## Architecture

### Hybrid Synchronous + Asynchronous Processing

```
Webhook → Validate → Store Raw → Update device_latest → Trigger Inngest → Response (fast!)
                                                              ↓
                                                    Inngest processes:
                                                    - Transform
                                                    - Store normalized
                                                    - Handle retries/DLQ
```

**Synchronous Path (Hot Path - <100ms):**
- Fast validation
- Store raw JSONB in database
- Extract critical fields
- Update `device_latest` table
- Trigger Inngest event
- Return 200 OK immediately

**Asynchronous Path (Cold Path):**
- Inngest handles transformation
- Stores in normalized `telemetry` and `locations` tables
- Automatic retries with exponential backoff
- Built-in Dead Letter Queue (DLQ)

### Database Schema

1. **raw_webhook_payloads**: Raw JSONB storage (audit trail)
2. **telemetry**: Normalized sensor data (no raw JSONB)
3. **locations**: Normalized location data (no raw JSONB)
4. **device_latest**: Real-time snapshot for dashboard queries

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Inngest account (free tier: 25K invocations/month)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd Project
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp env.example .env.local
# Edit .env.local with your configuration
```

4. Set up PostgreSQL database

**Using Prisma (Recommended):**
```bash
# Set DATABASE_URL in .env.local
# For local: postgresql://user:password@localhost:5432/paxafe_integration
# For Supabase/Neon: Use connection string from your provider

# Generate Prisma Client
npm run db:generate

# Run migrations (creates all tables)
npm run db:migrate
```

Or use a managed PostgreSQL service (Neon, Supabase, etc.) and update `DATABASE_URL`.

**Note:** This project uses Prisma ORM. The schema is defined in `prisma/schema.prisma`. See `SETUP.md` for detailed instructions.

5. Set up Inngest

- Go to https://app.inngest.com
- Create a new app
- Copy the Event Key and Signing Key
- Add to `.env.local`:
  ```
  INNGEST_EVENT_KEY=your-event-key
  INNGEST_SIGNING_KEY=your-signing-key
  ```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `API_KEY` | Secret key for webhook authentication | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `INNGEST_EVENT_KEY` | Inngest event key | Yes |
| `INNGEST_SIGNING_KEY` | Inngest signing key | Yes |
| `TIVE_ERROR_WEBHOOK_URL` | URL for notifying Tive of errors | No |
| `TIVE_WEBHOOK_SECRET` | Secret for signing error notifications | No |
| `NODE_ENV` | Environment (development/production) | No |

## Usage

### Start Development Server

```bash
npm run dev
```

The API will be available at:
- Webhook: `http://localhost:3000/api/webhook/tive`
- Dashboard: `http://localhost:3000`
- Inngest: `http://localhost:3000/api/inngest`

### Send Test Webhook

```bash
curl -X POST http://localhost:3000/api/webhook/tive \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "DeviceId": "863257063350583",
    "DeviceName": "A571992",
    "EntryTimeEpoch": 1739215646000,
    "Temperature": {
      "Celsius": 10.08
    },
    "Location": {
      "Latitude": 40.810562,
      "Longitude": -73.879285
    }
  }'
```

### API Endpoints

#### POST /api/webhook/tive

Receives Tive webhook payloads.

**Headers:**
- `X-API-Key`: Your API key (or `Authorization: Bearer <key>`)
- `Content-Type`: `application/json`

**Request Body:** Tive payload (see `tive-incoming-schema.json`)

**Response Codes:**
- `200`: Success - payload queued for processing
- `400`: Validation error - invalid payload
- `401`: Unauthorized - missing/invalid API key
- `500`: Internal server error
- `503`: Service unavailable - database/Inngest error

**Success Response:**
```json
{
  "success": true,
  "message": "Payload received and queued for processing",
  "data": {
    "device_id": "A571992",
    "device_imei": "863257063350583",
    "timestamp": 1739215646000,
    "out_of_order": false
  },
  "payload_id": 123,
  "inngest_event_id": "evt_xxx"
}
```

#### GET /api/devices

Get latest device states from `device_latest` table.

**Query Parameters:**
- `limit`: Number of devices to return (default: 100, max: 1000)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "devices": [...]
}
```

## Inngest Dashboard

Monitor your async processing in the Inngest dashboard:
- View event history
- See retry attempts
- Inspect DLQ messages
- Monitor function execution

Access at: https://app.inngest.com

## Testing

Test files are located in the `__tests__` directory. Run tests with:

```bash
npm test
```

## Deployment

### Vercel Deployment

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Database Setup

For production, use a managed PostgreSQL service:
- **Neon**: Serverless PostgreSQL (recommended for Vercel)
- **Supabase**: PostgreSQL with additional features
- **Railway**: Simple PostgreSQL hosting

### Inngest Setup

1. **Create Inngest Account**:
   - Go to https://app.inngest.com
   - Sign up for a free account (25K invocations/month)

2. **Create an App**:
   - Create a new app in Inngest dashboard
   - Copy your `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`

3. **Configure Environment Variables in Vercel**:
   - Add `INNGEST_EVENT_KEY` to Vercel environment variables
   - Add `INNGEST_SIGNING_KEY` to Vercel environment variables
   - These are used for secure communication between Vercel and Inngest

4. **Add Your Vercel URL to Inngest**:
   - After deploying to Vercel, copy your production URL (e.g., `https://your-app.vercel.app`)
   - In Inngest dashboard, add this URL as your app's endpoint
   - Inngest will automatically discover your functions at `https://your-app.vercel.app/api/inngest`

5. **Verify Function Registration**:
   - Check Inngest dashboard to see your `processTiveWebhook` function
   - Functions are automatically discovered from the `/api/inngest` route

**How It Works:**
- Inngest is a **cloud service** that calls back to your Vercel deployment
- When you send an event via `inngest.send()`, Inngest receives it
- Inngest then calls your `/api/inngest` endpoint to execute the function
- This works seamlessly with Vercel's serverless functions
- No additional infrastructure needed - Inngest handles the queue, retries, and DLQ

## Design Decisions

### Why Inngest?

- **Free Tier**: 25K invocations/month
- **Built-in Retries**: Automatic exponential backoff
- **DLQ**: Dead letter queue for failed events
- **Observability**: Dashboard for monitoring
- **Step Functions**: Break processing into steps
- **No Infrastructure**: Fully managed

### Why Separate Tables?

- **Performance**: Smaller rows = faster queries
- **Separation of Concerns**: Raw (audit) vs Normalized (queries)
- **Indexing**: Better indexes on normalized fields
- **Scalability**: Easier to partition time-series tables

### Why device_latest Table?

- **Fast Dashboard Queries**: No need to query time-series tables
- **Real-time Updates**: Updated synchronously on every webhook
- **Optimized**: Single row per device, fast lookups

## Assumptions

1. **API Key**: Single API key for all requests (can be enhanced with multi-tenant)
2. **Address Parsing**: Simple parser (can be enhanced with geocoding API)
3. **Timestamp Validation**: ±1 year range (adjustable based on business needs)
4. **Retry Logic**: Inngest handles retries automatically (3 retries by default)
5. **Duplicate Handling**: UPSERT based on `(device_imei, timestamp)` uniqueness

## Future Enhancements

- [ ] Rate limiting per device/API key
- [ ] Enhanced address parsing with geocoding API
- [ ] Webhook signature verification
- [ ] Metrics and monitoring (New Relic, Grafana)
- [ ] Multi-tenant API key management
- [ ] Data archival strategy for old payloads
- [ ] GraphQL API for querying stored data
- [ ] Real-time alerts for temperature excursions

## License

Private - PAXAFE Take-Home Assignment
