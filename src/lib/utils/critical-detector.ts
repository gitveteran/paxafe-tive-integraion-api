/**
 * Critical event detection based on operational thresholds
 * Determines if a payload contains values outside normal operating ranges
 */

import { TivePayload } from '@/types/tive';
import { OPERATIONAL_RANGES } from '@/lib/constants';
import { logger } from '@/lib/logger';

export interface CriticalEventResult {
  isCritical: boolean;
  reasons: string[];
}

/**
 * Check if a Tive payload contains critical values outside normal operating ranges
 * Returns true if any monitored value is out of range
 */
export function isCriticalEvent(payload: TivePayload): CriticalEventResult {
  const reasons: string[] = [];

  // Check temperature
  if (payload.Temperature?.Celsius !== null && payload.Temperature?.Celsius !== undefined) {
    const temp = payload.Temperature.Celsius;
    if (temp < OPERATIONAL_RANGES.TEMPERATURE.MIN) {
      reasons.push(`Temperature too low: ${temp}°C (min: ${OPERATIONAL_RANGES.TEMPERATURE.MIN}°C)`);
    } else if (temp > OPERATIONAL_RANGES.TEMPERATURE.MAX) {
      reasons.push(`Temperature too high: ${temp}°C (max: ${OPERATIONAL_RANGES.TEMPERATURE.MAX}°C)`);
    }
  }

  // Check humidity
  if (payload.Humidity?.Percentage !== null && payload.Humidity?.Percentage !== undefined) {
    const humidity = payload.Humidity.Percentage;
    if (humidity < OPERATIONAL_RANGES.HUMIDITY.MIN) {
      reasons.push(`Humidity too low: ${humidity}% (min: ${OPERATIONAL_RANGES.HUMIDITY.MIN}%)`);
    } else if (humidity > OPERATIONAL_RANGES.HUMIDITY.MAX) {
      reasons.push(`Humidity too high: ${humidity}% (max: ${OPERATIONAL_RANGES.HUMIDITY.MAX}%)`);
    }
  }

  // Check battery level
  if (payload.Battery?.Percentage !== null && payload.Battery?.Percentage !== undefined) {
    const battery = payload.Battery.Percentage;
    if (battery < OPERATIONAL_RANGES.BATTERY.MIN) {
      reasons.push(`Low battery: ${battery}% (min: ${OPERATIONAL_RANGES.BATTERY.MIN}%)`);
    }
  }

  // Check cellular signal strength
  if (payload.Cellular?.Dbm !== null && payload.Cellular?.Dbm !== undefined) {
    const dbm = payload.Cellular.Dbm;
    if (dbm < OPERATIONAL_RANGES.CELLULAR_DBM.MIN) {
      reasons.push(`Poor cellular signal: ${dbm} dBm (min: ${OPERATIONAL_RANGES.CELLULAR_DBM.MIN} dBm)`);
    }
  }

  // Check accelerometer magnitude (high movement/shock detection)
  if (payload.Accelerometer) {
    const accel = payload.Accelerometer;
    if (typeof accel.X === 'number' && 
        typeof accel.Y === 'number' && 
        typeof accel.Z === 'number') {
      const magnitude = Math.sqrt(
        Math.pow(accel.X, 2) + Math.pow(accel.Y, 2) + Math.pow(accel.Z, 2)
      );
      if (magnitude > OPERATIONAL_RANGES.ACCELEROMETER_MAGNITUDE.MAX) {
        reasons.push(`High movement detected: ${magnitude.toFixed(2)}g (max: ${OPERATIONAL_RANGES.ACCELEROMETER_MAGNITUDE.MAX}g)`);
      }
    } else if (typeof accel.G === 'number' && accel.G > OPERATIONAL_RANGES.ACCELEROMETER_MAGNITUDE.MAX) {
      reasons.push(`High movement detected: ${accel.G}g (max: ${OPERATIONAL_RANGES.ACCELEROMETER_MAGNITUDE.MAX}g)`);
    }
  }

  const isCritical = reasons.length > 0;

  if (isCritical) {
    logger.warn('Critical event detected', {
      device_id: payload.DeviceId,
      device_name: payload.DeviceName,
      reasons,
    });
  }

  return {
    isCritical,
    reasons,
  };
}
