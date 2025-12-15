/**
 * Validation constants for payload validation
 */
export const VALIDATION = {
  MAX_PAYLOAD_SIZE: 100 * 1024, // 100KB
  MAX_TIMESTAMP_OFFSET: 365 * 24 * 60 * 60 * 1000, // 1 year
  TEMP_MIN: -100,
  TEMP_MAX: 100,
  HUMIDITY_MIN: 0,
  HUMIDITY_MAX: 100,
  LATITUDE_MIN: -90,
  LATITUDE_MAX: 90,
  LONGITUDE_MIN: -180,
  LONGITUDE_MAX: 180,
} as const;

/**
 * Location accuracy categories (in meters)
 */
export const ACCURACY_CATEGORIES = {
  HIGH_THRESHOLD: 10, // meters - <= 10m is high accuracy
  MEDIUM_THRESHOLD: 100, // meters - <= 100m is medium accuracy
  // > 100m is low accuracy
} as const;

/**
 * Decimal precision for data transformations
 */
export const PRECISION = {
  TEMPERATURE: 2,      // 2 decimal places
  HUMIDITY: 1,         // 1 decimal place
  LIGHT_LEVEL: 1,      // 1 decimal place
  ACCELEROMETER: 3,    // 3 decimal places
  CELLULAR_DBM: 2,     // 2 decimal places
} as const;

/**
 * Provider and device type constants
 */
export const PROVIDER_NAME = 'Tive';
export const DEVICE_TYPE = 'Active';

/**
 * Normal operating ranges for critical event detection
 * Values outside these ranges trigger critical events (synchronous updates)
 */
export const OPERATIONAL_RANGES = {
  TEMPERATURE: {
    MIN: -20,  // Cold chain minimum (°C)
    MAX: 30,   // Cold chain maximum (°C)
  },
  HUMIDITY: {
    MIN: 20,   // Minimum acceptable humidity (%)
    MAX: 80,   // Maximum acceptable humidity (%)
  },
  BATTERY: {
    MIN: 20,   // Low battery threshold (%)
    MAX: 100,  // Maximum battery (%)
  },
  CELLULAR_DBM: {
    MIN: -120, // Poor signal threshold (dBm)
    MAX: -50,  // Excellent signal (dBm)
  },
  ACCELEROMETER_MAGNITUDE: {
    MIN: 0,    // Minimum magnitude
    MAX: 2.0,  // High movement threshold (g)
  },
} as const;
