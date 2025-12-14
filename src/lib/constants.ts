export const VALIDATION = {
  MAX_PAYLOAD_SIZE: 100 * 1024, // 100KB
  MAX_TIMESTAMP_OFFSET: 365 * 24 * 60 * 60 * 1000, // 1 year
  TEMP_MIN: -100,
  TEMP_MAX: 100,
  HUMIDITY_MIN: 0,
  HUMIDITY_MAX: 100,
} as const;

export const ACCURACY_CATEGORIES = {
  HIGH_THRESHOLD: 10, // meters
  MEDIUM_THRESHOLD: 100, // meters
} as const;
