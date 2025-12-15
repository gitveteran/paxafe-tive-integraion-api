-- Database schema for PAXAFE Tive integration
-- Optimized for high-throughput IoT telemetry ingestion

-- Raw webhook payloads table (audit trail, not normalized)
-- Acts as audit log and can be used for reprocessing
CREATE TABLE IF NOT EXISTS raw_webhook_payloads (
  id SERIAL PRIMARY KEY,
  payload JSONB NOT NULL,
  source VARCHAR(50) DEFAULT 'Tive',
  status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
  inngest_event_id VARCHAR(255), -- Link to Inngest event for tracking
  validation_errors JSONB,
  processing_error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

CREATE INDEX idx_raw_payloads_status_created ON raw_webhook_payloads(status, created_at);
CREATE INDEX idx_raw_payloads_source ON raw_webhook_payloads(source);
CREATE INDEX idx_raw_payloads_inngest_event ON raw_webhook_payloads(inngest_event_id) WHERE inngest_event_id IS NOT NULL;

-- Normalized telemetry table (sensor readings)
-- Optimized for time-series queries, stores all historical readings
-- Allows multiple readings with the same timestamp
CREATE TABLE IF NOT EXISTS telemetry (
  id SERIAL PRIMARY KEY,
  device_imei VARCHAR(15) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  ts BIGINT NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'Tive',
  type VARCHAR(50) NOT NULL DEFAULT 'Active',
  temperature DECIMAL(5, 2),
  humidity DECIMAL(4, 1),
  light_level DECIMAL(8, 1),
  accelerometer_x DECIMAL(6, 3),
  accelerometer_y DECIMAL(6, 3),
  accelerometer_z DECIMAL(6, 3),
  accelerometer_magnitude DECIMAL(6, 3),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_telemetry_device_imei ON telemetry(device_imei);
CREATE INDEX idx_telemetry_timestamp ON telemetry(ts DESC);
CREATE INDEX idx_telemetry_device_timestamp ON telemetry(device_imei, ts DESC);
CREATE INDEX idx_telemetry_provider ON telemetry(provider);

-- Normalized locations table (location readings)
-- Optimized for time-series queries, stores all historical readings
-- Allows multiple readings with the same timestamp
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  device_imei VARCHAR(15) NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  ts BIGINT NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'Tive',
  type VARCHAR(50) NOT NULL DEFAULT 'Active',
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  altitude DECIMAL(8, 2),
  location_accuracy INTEGER,
  location_accuracy_category VARCHAR(10),
  location_source VARCHAR(50),
  address_street TEXT,
  address_locality VARCHAR(255),
  address_state VARCHAR(100),
  address_country VARCHAR(100),
  address_postal_code VARCHAR(20),
  address_full_address TEXT,
  battery_level INTEGER,
  cellular_dbm DECIMAL(6, 2),
  cellular_network_type VARCHAR(50),
  cellular_operator VARCHAR(100),
  wifi_access_points INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_location_device_imei ON locations(device_imei);
CREATE INDEX idx_location_timestamp ON locations(ts DESC);
CREATE INDEX idx_location_device_timestamp ON locations(device_imei, ts DESC);
CREATE INDEX idx_location_coordinates ON locations(latitude, longitude);
CREATE INDEX idx_location_provider ON locations(provider);

-- Device latest state table (optimized for dashboard queries)
-- Hybrid approach:
-- - Critical fields stored directly for fast synchronous updates (real-time dashboard)
-- - References updated asynchronously for consistency and audit trail
CREATE TABLE IF NOT EXISTS device_latest (
  device_imei VARCHAR(15) PRIMARY KEY,
  device_id VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'Tive',
  last_ts BIGINT NOT NULL,
  -- Critical fields (updated synchronously for real-time dashboard)
  last_temperature DECIMAL(5, 2),
  last_humidity DECIMAL(4, 1),
  last_light_level DECIMAL(8, 1),
  last_accelerometer_x DECIMAL(6, 3),
  last_accelerometer_y DECIMAL(6, 3),
  last_accelerometer_z DECIMAL(6, 3),
  last_accelerometer_magnitude DECIMAL(6, 3),
  last_lat DECIMAL(10, 8),
  last_lon DECIMAL(11, 8),
  last_altitude DECIMAL(8, 2),
  location_accuracy INTEGER,
  location_accuracy_category VARCHAR(10),
  location_source VARCHAR(50),
  address_street TEXT,
  address_locality VARCHAR(255),
  address_state VARCHAR(100),
  address_country VARCHAR(100),
  address_postal_code VARCHAR(20),
  address_full_address TEXT,
  battery_level INTEGER,
  cellular_dbm DECIMAL(6, 2),
  cellular_network_type VARCHAR(50),
  cellular_operator VARCHAR(100),
  wifi_access_points INTEGER,
  -- References to latest records (updated asynchronously for consistency)
  latest_telemetry_id INTEGER REFERENCES telemetry(id) ON DELETE SET NULL,
  latest_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_device_latest_updated ON device_latest(updated_at DESC);
CREATE INDEX idx_device_latest_provider ON device_latest(provider);
