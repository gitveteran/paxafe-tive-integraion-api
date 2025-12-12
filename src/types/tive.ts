/**
 * TypeScript types for Tive webhook payloads
 * Based on tive-incoming-schema.json
 */

export interface TivePayload {
  EntityName?: string;
  EntryTimeEpoch: number;
  EntryTimeUtc?: string;
  Cellular?: {
    SignalStrength?: "No signal" | "Poor" | "Fair" | "Good" | null;
    Dbm?: number | null;
  } | null;
  Temperature: {
    Celsius: number | null;
    Fahrenheit?: number | null;
  };
  ProbeTemperature?: {
    Celsius?: number | null;
    Fahrenheit?: number | null;
  } | null;
  Humidity?: {
    Percentage?: number | null;
  } | null;
  Accelerometer?: {
    G?: number | null;
    X?: number | null;
    Y?: number | null;
    Z?: number | null;
  } | null;
  Light?: {
    Lux?: number | null;
  } | null;
  Battery?: {
    Percentage?: number | null;
    Estimation?: "N/A" | "Days" | "Weeks" | "Months" | null;
    IsCharging?: boolean | null;
  } | null;
  Shipment?: {
    Id?: string | null;
    Description?: string | null;
    DeviceId?: string | null;
    ShipFrom?: {
      Latitude?: number | null;
      Longitude?: number | null;
      FormattedAddress?: string | null;
    } | null;
    ShipTo?: {
      Latitude?: number | null;
      Longitude?: number | null;
      FormattedAddress?: string | null;
    } | null;
    Carrier?: string | null;
  } | null;
  AccountId?: number;
  DeviceId: string;
  DeviceName: string;
  ShipmentId?: string | null;
  PublicShipmentId?: string | null;
  Location: {
    Latitude: number;
    Longitude: number;
    FormattedAddress?: string | null;
    LocationMethod?: "gps" | "wifi" | "cell" | null;
    Accuracy?: {
      Meters?: number | null;
      Kilometers?: number | null;
      Miles?: number | null;
    } | null;
    GeolocationSourceName?: string | null;
    CellTowerUsedCount?: number | null;
    WifiAccessPointUsedCount?: number | null;
  };
}

