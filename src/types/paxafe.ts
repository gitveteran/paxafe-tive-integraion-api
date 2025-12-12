/**
 * TypeScript types for PAXAFE normalized payloads
 * Based on px-sensor-schema.json and px-location-schema.json
 */

export interface PaxafeSensorPayload {
  device_id: string;
  device_imei: string;
  timestamp: number;
  provider: "Tive";
  type: "Active";
  temperature: number | null;
  humidity: number | null;
  light_level: number | null;
  accelerometer: {
    x: number | null;
    y: number | null;
    z: number | null;
    magnitude: number | null;
  } | null;
  tilt: {
    x: number | null;
    y: number | null;
    z: number | null;
    tilt: number | null;
  } | null;
  box_open: boolean | null;
}

export interface PaxafeLocationPayload {
  device_id: string;
  device_imei: string;
  timestamp: number;
  provider: "Tive";
  type: "Active";
  latitude: number;
  longitude: number;
  altitude: number | null;
  location_accuracy: number | null;
  location_accuracy_category: "High" | "Medium" | "Low" | null;
  location_source: string | null;
  address: {
    street: string | null;
    locality: string | null;
    state: string | null;
    country: string | null;
    postal_code: string | null;
    full_address: string | null;
  } | null;
  battery_level: number | null;
  cellular_dbm: number | null;
  cellular_network_type: string | null;
  cellular_operator: string | null;
  wifi_access_points: number | null;
}

