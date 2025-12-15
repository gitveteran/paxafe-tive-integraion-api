/**
 * Transformation functions to convert Tive payloads to PAXAFE normalized formats
 */

import { TivePayload } from '@/types/tive';
import { PaxafeSensorPayload, PaxafeLocationPayload } from '@/types/paxafe';
import { ACCURACY_CATEGORIES } from '@/lib/constants';

/**
 * Normalize timestamp to milliseconds
 * Handles both seconds and milliseconds timestamps
 * If timestamp is less than 1e12 (year 2001 in ms), assume it's in seconds
 */
function normalizeTimestamp(epoch: number): number {
  // If timestamp is less than 1e12 (Jan 1, 2001 in milliseconds),
  // it's likely in seconds, so convert to milliseconds
  if (epoch < 1e12) {
    return epoch * 1000;
  }
  return epoch;
}

/**
 * Transform Tive payload to PAXAFE sensor format
 */
export function transformToSensorPayload(tive: TivePayload): PaxafeSensorPayload {
  // Round temperature to 2 decimal places
  const temperature = tive.Temperature?.Celsius !== null && tive.Temperature?.Celsius !== undefined
    ? Math.round(tive.Temperature.Celsius * 100) / 100
    : null;

  // Round humidity to 1 decimal place
  const humidity = tive.Humidity?.Percentage !== null && tive.Humidity?.Percentage !== undefined
    ? Math.round(tive.Humidity.Percentage * 10) / 10
    : null;

  // Round light level to 1 decimal place
  const lightLevel = tive.Light?.Lux !== null && tive.Light?.Lux !== undefined
    ? Math.round(tive.Light.Lux * 10) / 10
    : null;

  // Round accelerometer values to 3 decimal places
  const accelerometer = tive.Accelerometer ? {
    x: tive.Accelerometer.X !== null && tive.Accelerometer.X !== undefined
      ? Math.round(tive.Accelerometer.X * 1000) / 1000
      : null,
    y: tive.Accelerometer.Y !== null && tive.Accelerometer.Y !== undefined
      ? Math.round(tive.Accelerometer.Y * 1000) / 1000
      : null,
    z: tive.Accelerometer.Z !== null && tive.Accelerometer.Z !== undefined
      ? Math.round(tive.Accelerometer.Z * 1000) / 1000
      : null,
    magnitude: tive.Accelerometer.G !== null && tive.Accelerometer.G !== undefined
      ? Math.round(tive.Accelerometer.G * 1000) / 1000
      : null,
  } : null;

  return {
    device_id: tive.DeviceName,
    device_imei: tive.DeviceId,
    timestamp: normalizeTimestamp(tive.EntryTimeEpoch),
    provider: "Tive",
    type: "Active",
    temperature,
    humidity,
    light_level: lightLevel,
    accelerometer,
    tilt: null, // Not available from Tive
    box_open: null, // Not available from Tive
  };
}

/**
 * Transform Tive payload to PAXAFE location format
 */
export function transformToLocationPayload(tive: TivePayload): PaxafeLocationPayload {
  // Determine location source (capitalize first letter, handle special cases)
  let locationSource: string | null = null;
  if (tive.Location.LocationMethod) {
    const method = tive.Location.LocationMethod.toLowerCase();
    // Handle special cases
    if (method === 'wifi') {
      locationSource = 'WiFi';
    } else if (method === 'gps') {
      locationSource = 'GPS';
    } else {
      // Default: capitalize first letter
      locationSource = method.charAt(0).toUpperCase() + method.slice(1);
    }
  }

  // Determine accuracy category based on meters
  const accuracyMeters = tive.Location.Accuracy?.Meters;
  let accuracyCategory: "High" | "Medium" | "Low" | null = null;
  if (accuracyMeters !== null && accuracyMeters !== undefined) {
    if (accuracyMeters <= ACCURACY_CATEGORIES.HIGH_THRESHOLD) {
      accuracyCategory = "High";
    } else if (accuracyMeters <= ACCURACY_CATEGORIES.MEDIUM_THRESHOLD) {
      accuracyCategory = "Medium";
    } else {
      accuracyCategory = "Low";
    }
  }

  // Parse address from FormattedAddress
  const address = parseAddress(tive.Location.FormattedAddress);

  // Round cellular dBm to 2 decimal places
  const cellularDbm = tive.Cellular?.Dbm !== null && tive.Cellular?.Dbm !== undefined
    ? Math.round(tive.Cellular.Dbm * 100) / 100
    : null;

  return {
    device_id: tive.DeviceName,
    device_imei: tive.DeviceId,
    timestamp: normalizeTimestamp(tive.EntryTimeEpoch),
    provider: "Tive",
    type: "Active",
    latitude: tive.Location.Latitude,
    longitude: tive.Location.Longitude,
    altitude: null, // Not available from Tive
    location_accuracy: accuracyMeters ? Math.round(accuracyMeters) : null,
    location_accuracy_category: accuracyCategory,
    location_source: locationSource,
    address,
    battery_level: tive.Battery?.Percentage ?? null,
    cellular_dbm: cellularDbm,
    cellular_network_type: null, // Not available from Tive
    cellular_operator: null, // Not available from Tive
    wifi_access_points: tive.Location.WifiAccessPointUsedCount ?? null,
  };
}

/**
 * Parse formatted address into components
 * Example: "114 Hunts Point Market, Bronx, NY 10474, USA"
 * 
 * Note: This is a simple parser. For production, consider using a geocoding API
 * like Mapbox or Google Geocoding API for more accurate parsing.
 */
function parseAddress(formattedAddress: string | null | undefined): {
  street: string | null;
  locality: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  full_address: string | null;
} {
  if (!formattedAddress) {
    return {
      street: null,
      locality: null,
      state: null,
      country: null,
      postal_code: null,
      full_address: null,
    };
  }

  // Simple parsing - can be enhanced with geocoding API
  const parts = formattedAddress.split(',').map(p => p.trim());
  
  let postalCode: string | null = null;
  let state: string | null = null;
  let locality: string | null = null;
  let country: string | null = null;
  let street: string | null = null;

  if (parts.length >= 1) {
    street = parts[0] || null;
  }
  
  if (parts.length >= 2) {
    locality = parts[1] || null;
  }

  if (parts.length >= 3) {
    // Try to parse "ST ZIP" or "ST" or "ZIP"
    const thirdPart = parts[2];
    // Match "NY 10474" format
    const stateZipMatch = thirdPart.match(/^([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (stateZipMatch) {
      state = stateZipMatch[1] || null;
      postalCode = stateZipMatch[2] || null;
    } else {
      // Try just state "NY"
      const stateMatch = thirdPart.match(/^[A-Z]{2}$/);
      if (stateMatch) {
        state = thirdPart;
      } else {
        // Try just ZIP
        const zipMatch = thirdPart.match(/^(\d{5}(?:-\d{4})?)$/);
        if (zipMatch) {
          postalCode = thirdPart;
        }
      }
    }
  }

  if (parts.length >= 4) {
    // Last part is usually country
    country = parts[parts.length - 1] || null;
    // If we didn't get postal code yet, check if it's in the country part
    if (!postalCode && parts.length === 4) {
      const lastPart = parts[3];
      const zipMatch = lastPart.match(/(\d{5}(?:-\d{4})?)/);
      if (zipMatch) {
        postalCode = zipMatch[1];
        country = lastPart.replace(zipMatch[0], '').trim() || null;
      }
    }
  }

  return {
    street,
    locality,
    state,
    country,
    postal_code: postalCode,
    full_address: formattedAddress,
  };
}

