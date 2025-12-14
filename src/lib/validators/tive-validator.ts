/**
 * Validation functions for Tive webhook payloads
 * Handles validation errors and edge cases
 */

import { TivePayload } from '@/types/tive';
import { VALIDATION } from '@/lib/constants';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate Tive payload structure and data integrity
 */
export function validateTivePayload(payload: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Required fields check
  if (!payload.DeviceId) {
    errors.push({ field: 'DeviceId', message: 'DeviceId is required' });
  } else if (typeof payload.DeviceId !== 'string') {
    errors.push({ field: 'DeviceId', message: 'DeviceId must be a string' });
  } else if (!/^[0-9]{15}$/.test(payload.DeviceId)) {
    errors.push({ field: 'DeviceId', message: 'DeviceId must be exactly 15 digits' });
  }

  if (!payload.DeviceName) {
    errors.push({ field: 'DeviceName', message: 'DeviceName is required' });
  } else if (typeof payload.DeviceName !== 'string') {
    errors.push({ field: 'DeviceName', message: 'DeviceName must be a string' });
  }

  if (!payload.EntryTimeEpoch) {
    errors.push({ field: 'EntryTimeEpoch', message: 'EntryTimeEpoch is required' });
  } else if (typeof payload.EntryTimeEpoch !== 'number') {
    errors.push({ field: 'EntryTimeEpoch', message: 'EntryTimeEpoch must be a number' });
  } else {
    // Validate timestamp is reasonable (not too far in past/future)
    const now = Date.now();
    const timestamp = payload.EntryTimeEpoch;
    const oneYearAgo = now - VALIDATION.MAX_TIMESTAMP_OFFSET;
    const oneYearFromNow = now + VALIDATION.MAX_TIMESTAMP_OFFSET;
    
    if (timestamp < 0) {
      errors.push({ field: 'EntryTimeEpoch', message: 'Timestamp cannot be negative' });
    } else if (timestamp < oneYearAgo) {
      errors.push({ field: 'EntryTimeEpoch', message: 'Timestamp is too far in the past (more than 1 year)' });
    } else if (timestamp > oneYearFromNow) {
      errors.push({ field: 'EntryTimeEpoch', message: 'Timestamp is in the future (more than 1 year ahead)' });
    }
  }

  // Temperature validation
  if (!payload.Temperature) {
    errors.push({ field: 'Temperature', message: 'Temperature is required' });
  } else if (typeof payload.Temperature !== 'object') {
    errors.push({ field: 'Temperature', message: 'Temperature must be an object' });
  } else {
    if (payload.Temperature.Celsius === null || payload.Temperature.Celsius === undefined) {
      errors.push({ field: 'Temperature.Celsius', message: 'Temperature.Celsius is required' });
    } else if (typeof payload.Temperature.Celsius !== 'number') {
      errors.push({ field: 'Temperature.Celsius', message: 'Temperature.Celsius must be a number' });
    } else {
      // Validate reasonable temperature range (cold chain typically -80°C to 30°C)
      if (payload.Temperature.Celsius < VALIDATION.TEMP_MIN || payload.Temperature.Celsius > VALIDATION.TEMP_MAX) {
        errors.push({ field: 'Temperature.Celsius', message: 'Temperature.Celsius is outside reasonable range (-100 to 100)' });
      }
    }
  }

  // Location validation
  if (!payload.Location) {
    errors.push({ field: 'Location', message: 'Location is required' });
  } else if (typeof payload.Location !== 'object') {
    errors.push({ field: 'Location', message: 'Location must be an object' });
  } else {
    const lat = payload.Location.Latitude;
    const lon = payload.Location.Longitude;

    if (lat === null || lat === undefined) {
      errors.push({ field: 'Location.Latitude', message: 'Location.Latitude is required' });
    } else if (typeof lat !== 'number') {
      errors.push({ field: 'Location.Latitude', message: 'Location.Latitude must be a number' });
    } else if (lat < -90 || lat > 90) {
      errors.push({ field: 'Location.Latitude', message: 'Latitude must be between -90 and 90' });
    }

    if (lon === null || lon === undefined) {
      errors.push({ field: 'Location.Longitude', message: 'Location.Longitude is required' });
    } else if (typeof lon !== 'number') {
      errors.push({ field: 'Location.Longitude', message: 'Location.Longitude must be a number' });
    } else if (lon < -180 || lon > 180) {
      errors.push({ field: 'Location.Longitude', message: 'Longitude must be between -180 and 180' });
    }
  }

  // Optional field validations
  if (payload.Humidity?.Percentage !== null && payload.Humidity?.Percentage !== undefined) {
    const humidity = payload.Humidity.Percentage;
    if (typeof humidity !== 'number') {
      errors.push({ field: 'Humidity.Percentage', message: 'Humidity.Percentage must be a number' });
    } else if (humidity < VALIDATION.HUMIDITY_MIN || humidity > VALIDATION.HUMIDITY_MAX) {
      errors.push({ field: 'Humidity.Percentage', message: `Humidity.Percentage must be between ${VALIDATION.HUMIDITY_MIN} and ${VALIDATION.HUMIDITY_MAX}` });
    }
  }

  if (payload.Battery?.Percentage !== null && payload.Battery?.Percentage !== undefined) {
    const battery = payload.Battery.Percentage;
    if (typeof battery !== 'number') {
      errors.push({ field: 'Battery.Percentage', message: 'Battery.Percentage must be a number' });
    } else if (battery < 0 || battery > 100) {
      errors.push({ field: 'Battery.Percentage', message: 'Battery.Percentage must be between 0 and 100' });
    }
  }

  if (payload.Cellular?.Dbm !== null && payload.Cellular?.Dbm !== undefined) {
    const dbm = payload.Cellular.Dbm;
    if (typeof dbm !== 'number') {
      errors.push({ field: 'Cellular.Dbm', message: 'Cellular.Dbm must be a number' });
    } else if (dbm < -150 || dbm > -50) {
      errors.push({ field: 'Cellular.Dbm', message: 'Cellular.Dbm must be between -150 and -50' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

