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
 * Uses UPSERT to handle duplicates
 */
export async function saveTelemetry(payload: PaxafeSensorPayload): Promise<number> {
  const query = `
    INSERT INTO telemetry (
      device_id, device_imei, ts, provider, type,
      temperature, humidity, light_level,
      accelerometer_x, accelerometer_y, accelerometer_z, accelerometer_magnitude
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    ON CONFLICT (device_imei, ts) DO UPDATE SET
      temperature = EXCLUDED.temperature,
      humidity = EXCLUDED.humidity,
      light_level = EXCLUDED.light_level,
      accelerometer_x = EXCLUDED.accelerometer_x,
      accelerometer_y = EXCLUDED.accelerometer_y,
      accelerometer_z = EXCLUDED.accelerometer_z,
      accelerometer_magnitude = EXCLUDED.accelerometer_magnitude
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
 * Uses UPSERT to handle duplicates
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
    ON CONFLICT (device_imei, ts) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      location_accuracy = EXCLUDED.location_accuracy,
      location_accuracy_category = EXCLUDED.location_accuracy_category,
      location_source = EXCLUDED.location_source,
      address_street = EXCLUDED.address_street,
      address_locality = EXCLUDED.address_locality,
      address_state = EXCLUDED.address_state,
      address_country = EXCLUDED.address_country,
      address_postal_code = EXCLUDED.address_postal_code,
      address_full_address = EXCLUDED.address_full_address,
      battery_level = EXCLUDED.battery_level,
      cellular_dbm = EXCLUDED.cellular_dbm,
      wifi_access_points = EXCLUDED.wifi_access_points
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
 * Update device_latest table with latest state (complete snapshot)
 * Can be called synchronously (critical events) or asynchronously (normal events)
 * This is optimized for dashboard queries with complete device information
 */
export async function updateDeviceLatest(
  deviceImei: string,
  deviceId: string,
  timestamp: number,
  sensorPayload: PaxafeSensorPayload,
  locationPayload: PaxafeLocationPayload
): Promise<void> {
  const query = `
    INSERT INTO device_latest (
      device_imei, device_id, provider, last_ts,
      -- Sensor data
      last_temperature, last_humidity, last_light_level,
      last_accelerometer_x, last_accelerometer_y, last_accelerometer_z, last_accelerometer_magnitude,
      -- Location data
      last_lat, last_lon, last_altitude,
      location_accuracy, location_accuracy_category, location_source,
      address_street, address_locality, address_state, address_country, address_postal_code, address_full_address,
      -- Device status
      battery_level, cellular_dbm, cellular_network_type, cellular_operator, wifi_access_points,
      updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, CURRENT_TIMESTAMP
    )
    ON CONFLICT (device_imei) DO UPDATE SET
      device_id = EXCLUDED.device_id,
      last_ts = EXCLUDED.last_ts,
      -- Sensor data
      last_temperature = EXCLUDED.last_temperature,
      last_humidity = EXCLUDED.last_humidity,
      last_light_level = EXCLUDED.last_light_level,
      last_accelerometer_x = EXCLUDED.last_accelerometer_x,
      last_accelerometer_y = EXCLUDED.last_accelerometer_y,
      last_accelerometer_z = EXCLUDED.last_accelerometer_z,
      last_accelerometer_magnitude = EXCLUDED.last_accelerometer_magnitude,
      -- Location data
      last_lat = EXCLUDED.last_lat,
      last_lon = EXCLUDED.last_lon,
      last_altitude = EXCLUDED.last_altitude,
      location_accuracy = EXCLUDED.location_accuracy,
      location_accuracy_category = EXCLUDED.location_accuracy_category,
      location_source = EXCLUDED.location_source,
      address_street = EXCLUDED.address_street,
      address_locality = EXCLUDED.address_locality,
      address_state = EXCLUDED.address_state,
      address_country = EXCLUDED.address_country,
      address_postal_code = EXCLUDED.address_postal_code,
      address_full_address = EXCLUDED.address_full_address,
      -- Device status
      battery_level = EXCLUDED.battery_level,
      cellular_dbm = EXCLUDED.cellular_dbm,
      cellular_network_type = EXCLUDED.cellular_network_type,
      cellular_operator = EXCLUDED.cellular_operator,
      wifi_access_points = EXCLUDED.wifi_access_points,
      updated_at = CURRENT_TIMESTAMP
  `;

  const values = [
    deviceImei,
    deviceId,
    sensorPayload.provider,
    timestamp,
    // Sensor data
    sensorPayload.temperature,
    sensorPayload.humidity,
    sensorPayload.light_level,
    sensorPayload.accelerometer?.x ?? null,
    sensorPayload.accelerometer?.y ?? null,
    sensorPayload.accelerometer?.z ?? null,
    sensorPayload.accelerometer?.magnitude ?? null,
    // Location data
    locationPayload.latitude,
    locationPayload.longitude,
    locationPayload.altitude,
    locationPayload.location_accuracy,
    locationPayload.location_accuracy_category,
    locationPayload.location_source,
    locationPayload.address?.street ?? null,
    locationPayload.address?.locality ?? null,
    locationPayload.address?.state ?? null,
    locationPayload.address?.country ?? null,
    locationPayload.address?.postal_code ?? null,
    locationPayload.address?.full_address ?? null,
    // Device status
    locationPayload.battery_level,
    locationPayload.cellular_dbm,
    locationPayload.cellular_network_type,
    locationPayload.cellular_operator,
    locationPayload.wifi_access_points,
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
 * Check for out-of-order payloads (edge case handling)
 */
export async function checkAndUpdatePayloadOrder(
  deviceImei: string,
  timestamp: number
): Promise<{ isOutOfOrder: boolean; lastTimestamp: number | null }> {
  // Get last timestamp for this device
  const getQuery = `
    SELECT last_timestamp, out_of_order_count
    FROM payload_order_tracking
    WHERE device_imei = $1
  `;

  const getResult = await pool.query(getQuery, [deviceImei]);
  
  if (getResult.rows.length === 0) {
    // First payload for this device
    await pool.query(
      `INSERT INTO payload_order_tracking (device_imei, last_timestamp) VALUES ($1, $2)
       ON CONFLICT (device_imei) DO UPDATE SET last_timestamp = $2`,
      [deviceImei, timestamp]
    );
    return { isOutOfOrder: false, lastTimestamp: null };
  }

  const lastTimestamp = getResult.rows[0].last_timestamp;
  const isOutOfOrder = lastTimestamp && timestamp < lastTimestamp;

  if (isOutOfOrder) {
    // Increment out-of-order count
    await pool.query(
      `UPDATE payload_order_tracking 
       SET out_of_order_count = out_of_order_count + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE device_imei = $1`,
      [deviceImei]
    );
  } else {
    // Update last timestamp
    await pool.query(
      `UPDATE payload_order_tracking 
       SET last_timestamp = $1, updated_at = CURRENT_TIMESTAMP
       WHERE device_imei = $2`,
      [timestamp, deviceImei]
    );
  }

  return { isOutOfOrder: isOutOfOrder || false, lastTimestamp };
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
