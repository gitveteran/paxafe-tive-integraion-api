/**
 * Device state type matching device_latest table structure
 */
export interface DeviceState {
  device_imei: string;
  device_id: string;
  provider: string;
  last_ts: number;
  // Sensor data
  last_temperature: number | null;
  last_humidity: number | null;
  last_light_level: number | null;
  last_accelerometer_x: number | null;
  last_accelerometer_y: number | null;
  last_accelerometer_z: number | null;
  last_accelerometer_magnitude: number | null;
  // Location data
  last_lat: number | null;
  last_lon: number | null;
  last_altitude: number | null;
  location_accuracy: number | null;
  location_accuracy_category: string | null;
  location_source: string | null;
  address_street: string | null;
  address_locality: string | null;
  address_state: string | null;
  address_country: string | null;
  address_postal_code: string | null;
  address_full_address: string | null;
  // Device status
  battery_level: number | null;
  cellular_dbm: number | null;
  cellular_network_type: string | null;
  cellular_operator: string | null;
  wifi_access_points: number | null;
  updated_at: string;
}
