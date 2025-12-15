/**
 * Database connection and helper functions
 * Uses PostgreSQL with connection pooling for scalability
 */

import { Pool, PoolClient } from 'pg';
import { PaxafeSensorPayload, PaxafeLocationPayload } from '@/types/paxafe';
import { TivePayload } from '@/types/tive';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';

// Helper function to determine if SSL is needed
function getSslConfig() {
  const dbUrl = process.env.DATABASE_URL || '';

  if (dbUrl.includes('supabase') || 
      dbUrl.includes('neon.tech') || 
      dbUrl.includes('railway') ||
      dbUrl.includes('sslmode=require') ||
      process.env.NODE_ENV === 'production') {
    return { rejectUnauthorized: false };
  }

  return false;
}

// Initialize connection pool
const pool = new Pool({
  connectionString: config.databaseUrl, // Use config instead
  ssl: getSslConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, 
});


pool.on('error', (err) => {
  logger.error('Unexpected database pool error', {
    error: err.message,
  });
});

pool.on('connect', (client) => {
  logger.debug('New database client connected', {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
  });
});


export { pool };

/**
 * Store raw webhook payload for audit trail
 */
export async function storeRawPayload(
  payload: TivePayload,
  validationErrors?: Array<{ field: string; message: string }>,
  status: 'pending' | 'failed' = 'pending',
  inngestEventId?: string
): Promise<number> {
  const query = `
    INSERT INTO raw_webhook_payloads (
      payload, source, status, validation_errors, inngest_event_id
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;

  const values = [
    JSON.stringify(payload),
    'Tive',
    status,
    validationErrors ? JSON.stringify(validationErrors) : null,
    inngestEventId || null,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].id;
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
 */
export async function updateRawPayloadStatus(
  payloadId: number,
  status: 'processing' | 'completed' | 'failed',
  processingError?: string
): Promise<void> {
  const query = `
    UPDATE raw_webhook_payloads
    SET status = $1,
        processed_at = CURRENT_TIMESTAMP,
        processing_error = $2
    WHERE id = $3
  `;

  await pool.query(query, [status, processingError || null, payloadId]);
}

/**
 * Save telemetry reading to normalized table
 * Stores all readings as historical data (allows duplicates with same timestamp)
 */
export async function saveTelemetry(payload: PaxafeSensorPayload): Promise<number> {
  const query = `
    INSERT INTO telemetry (
      device_id, device_imei, ts, provider, type,
      temperature, humidity, light_level,
      accelerometer_x, accelerometer_y, accelerometer_z, accelerometer_magnitude
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id
  `;

  const values = [
    payload.device_id,
    payload.device_imei,
    payload.timestamp,
    payload.provider,
    payload.type,
    payload.temperature,
    payload.humidity,
    payload.light_level,
    payload.accelerometer?.x ?? null,
    payload.accelerometer?.y ?? null,
    payload.accelerometer?.z ?? null,
    payload.accelerometer?.magnitude ?? null,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error saving telemetry', {
      error: error instanceof Error ? error.message : 'Unknown',
      payload: JSON.stringify(payload),
    });
    throw new Error(`Failed to save telemetry: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save location reading to normalized table
 * Stores all readings as historical data (allows duplicates with same timestamp)
 */
export async function saveLocation(payload: PaxafeLocationPayload): Promise<number> {
  const query = `
    INSERT INTO locations (
      device_id, device_imei, ts, provider, type,
      latitude, longitude, altitude,
      location_accuracy, location_accuracy_category, location_source,
      address_street, address_locality, address_state, address_country, 
      address_postal_code, address_full_address,
      battery_level, cellular_dbm, cellular_network_type, cellular_operator,
      wifi_access_points
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
    RETURNING id
  `;

  const values = [
    payload.device_id,
    payload.device_imei,
    payload.timestamp,
    payload.provider,
    payload.type,
    payload.latitude,
    payload.longitude,
    payload.altitude,
    payload.location_accuracy,
    payload.location_accuracy_category,
    payload.location_source,
    payload.address?.street ?? null,
    payload.address?.locality ?? null,
    payload.address?.state ?? null,
    payload.address?.country ?? null,
    payload.address?.postal_code ?? null,
    payload.address?.full_address ?? null,
    payload.battery_level,
    payload.cellular_dbm,
    payload.cellular_network_type,
    payload.cellular_operator,
    payload.wifi_access_points,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].id;
  } catch (error) {
    logger.error('Error saving location', {
      error: error instanceof Error ? error.message : 'Unknown',
      payload: JSON.stringify(payload),
    });
    throw new Error(`Failed to save location: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update device_latest table with references to latest telemetry and location records
 * Can be called synchronously (critical events) or asynchronously (normal events)
 * This stores references instead of duplicating data, reducing storage and ensuring consistency
 */
export async function updateDeviceLatest(
  deviceImei: string,
  deviceId: string,
  timestamp: number,
  telemetryId: number,
  locationId: number
): Promise<void> {
  const query = `
    INSERT INTO device_latest (
      device_imei, device_id, provider, last_ts,
      latest_telemetry_id, latest_location_id,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP
    )
    ON CONFLICT (device_imei) DO UPDATE SET
      device_id = EXCLUDED.device_id,
      last_ts = EXCLUDED.last_ts,
      latest_telemetry_id = EXCLUDED.latest_telemetry_id,
      latest_location_id = EXCLUDED.latest_location_id,
      updated_at = CURRENT_TIMESTAMP
  `;

  const values = [
    deviceImei,
    deviceId,
    'Tive', // provider
    timestamp,
    telemetryId,
    locationId,
  ];

  try {
    await pool.query(query, values);
  } catch (error) {
    logger.error('Error updating device_latest', {
      error: error instanceof Error ? error.message : 'Unknown',
      deviceImei,
      deviceId,
      timestamp,
    });
    // Don't throw - this is non-critical for webhook processing
  }
}

/**
 * Get database connection for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Close database pool (for cleanup)
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

/**
 * Execute multiple operations in a transaction
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Add health check function
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

// Add metrics export
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
