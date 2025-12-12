/**
 * Constants used throughout the application
 */

export const PROVIDER_NAME = 'Tive';
export const DEVICE_TYPE = 'Active';

// Timestamp validation ranges (in milliseconds)
export const TIMESTAMP_VALIDATION_RANGE = {
  ONE_YEAR_MS: 365 * 24 * 60 * 60 * 1000,
};

// Temperature validation ranges
export const TEMPERATURE_RANGE = {
  MIN: -100,
  MAX: 100,
};

// Location validation ranges
export const LATITUDE_RANGE = {
  MIN: -90,
  MAX: 90,
};

export const LONGITUDE_RANGE = {
  MIN: -180,
  MAX: 180,
};

// Accuracy categories (in meters)
export const ACCURACY_CATEGORIES = {
  HIGH: 10,    // <= 10 meters
  MEDIUM: 100, // <= 100 meters
  // > 100 meters = LOW
};

// Decimal precision for transformations
export const PRECISION = {
  TEMPERATURE: 2,      // 2 decimal places
  HUMIDITY: 1,         // 1 decimal place
  LIGHT_LEVEL: 1,      // 1 decimal place
  ACCELEROMETER: 3,    // 3 decimal places
  CELLULAR_DBM: 2,    // 2 decimal places
};

