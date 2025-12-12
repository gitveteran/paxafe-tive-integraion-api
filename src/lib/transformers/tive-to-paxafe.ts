/**
 * Transformation functions to convert Tive payloads to PAXAFE normalized formats
 */

import { TivePayload } from '@/types/tive';
import { PaxafeSensorPayload, PaxafeLocationPayload } from '@/types/paxafe';

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
    timestamp: tive.EntryTimeEpoch,
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
  // Determine location source (capitalize first letter)
  const locationSource = tive.Location.LocationMethod
    ? tive.Location.LocationMethod.charAt(0).toUpperCase() + tive.Location.LocationMethod.slice(1)
    : null;

  // Determine accuracy category based on meters
  const accuracyMeters = tive.Location.Accuracy?.Meters;
  let accuracyCategory: "High" | "Medium" | "Low" | null = null;
  if (accuracyMeters !== null && accuracyMeters !== undefined) {
    if (accuracyMeters <= 10) {
      accuracyCategory = "High";
    } else if (accuracyMeters <= 100) {
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
    timestamp: tive.EntryTimeEpoch,
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
    // Try to parse "City ST ZIP" or "City"
    const cityPart = parts[1];
    const zipMatch = cityPart.match(/(.+?)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
    if (zipMatch) {
      locality = zipMatch[1] || null;
      state = zipMatch[2] || null;
      postalCode = zipMatch[3] || null;
    } else {
      // Try to parse "City ST"
      const stateMatch = cityPart.match(/(.+?)\s+([A-Z]{2})$/);
      if (stateMatch) {
        locality = stateMatch[1] || null;
        state = stateMatch[2] || null;
      } else {
        locality = cityPart || null;
      }
    }
  }

  if (parts.length >= 3) {
    // Last part might be country or ZIP
    const lastPart = parts[parts.length - 1];
    if (!postalCode && /^\d{5}/.test(lastPart)) {
      postalCode = lastPart.match(/\d{5}(?:-\d{4})?/)?.[0] || null;
    } else if (!country && !/^\d/.test(lastPart)) {
      country = lastPart || null;
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

