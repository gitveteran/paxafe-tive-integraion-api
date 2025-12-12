/**
 * Unit tests for Tive to PAXAFE transformation functions
 */

import { transformToSensorPayload, transformToLocationPayload } from '@/lib/transformers/tive-to-paxafe';
import { TivePayload } from '@/types/tive';

describe('Tive to PAXAFE Transformations', () => {
  const sampleTivePayload: TivePayload = {
    EntityName: 'A571992',
    EntryTimeEpoch: 1739215646000,
    EntryTimeUtc: '2025-02-10T19:27:26Z',
    Cellular: {
      SignalStrength: 'Poor',
      Dbm: -100,
    },
    Temperature: {
      Celsius: 10.078125,
      Fahrenheit: 50.140625,
    },
    ProbeTemperature: null,
    Humidity: {
      Percentage: 38.7,
    },
    Accelerometer: {
      G: 0.990186,
      X: -0.5625,
      Y: -0.4375,
      Z: 0.6875,
    },
    Light: {
      Lux: 0,
    },
    Battery: {
      Percentage: 65,
      Estimation: 'N/A',
      IsCharging: false,
    },
    DeviceId: '863257063350583',
    DeviceName: 'A571992',
    Location: {
      Latitude: 40.810562,
      Longitude: -73.879285,
      FormattedAddress: '114 Hunts Point Market, Bronx, NY 10474, USA',
      LocationMethod: 'wifi',
      Accuracy: {
        Meters: 23,
        Kilometers: 0.023,
        Miles: 0.014,
      },
      GeolocationSourceName: 'skyhook',
      CellTowerUsedCount: 1,
      WifiAccessPointUsedCount: 5,
    },
  };

  describe('transformToSensorPayload', () => {
    it('should transform Tive payload to PAXAFE sensor format', () => {
      const result = transformToSensorPayload(sampleTivePayload);

      expect(result.device_id).toBe('A571992');
      expect(result.device_imei).toBe('863257063350583');
      expect(result.timestamp).toBe(1739215646000);
      expect(result.provider).toBe('Tive');
      expect(result.type).toBe('Active');
      expect(result.temperature).toBe(10.08); // Rounded to 2 decimals
      expect(result.humidity).toBe(38.7); // Rounded to 1 decimal
      expect(result.light_level).toBe(0.0);
      expect(result.accelerometer?.x).toBe(-0.563); // Rounded to 3 decimals
      expect(result.accelerometer?.y).toBe(-0.438);
      expect(result.accelerometer?.z).toBe(0.688);
      expect(result.accelerometer?.magnitude).toBe(0.99);
    });

    it('should handle null values gracefully', () => {
      const payloadWithNulls: TivePayload = {
        ...sampleTivePayload,
        Temperature: { Celsius: null },
        Humidity: null,
        Light: null,
        Accelerometer: null,
      };

      const result = transformToSensorPayload(payloadWithNulls);

      expect(result.temperature).toBeNull();
      expect(result.humidity).toBeNull();
      expect(result.light_level).toBeNull();
      expect(result.accelerometer).toBeNull();
    });
  });

  describe('transformToLocationPayload', () => {
    it('should transform Tive payload to PAXAFE location format', () => {
      const result = transformToLocationPayload(sampleTivePayload);

      expect(result.device_id).toBe('A571992');
      expect(result.device_imei).toBe('863257063350583');
      expect(result.timestamp).toBe(1739215646000);
      expect(result.provider).toBe('Tive');
      expect(result.type).toBe('Active');
      expect(result.latitude).toBe(40.810562);
      expect(result.longitude).toBe(-73.879285);
      expect(result.location_accuracy).toBe(23);
      expect(result.location_accuracy_category).toBe('High'); // <= 10 meters
      expect(result.location_source).toBe('WiFi'); // Capitalized
      expect(result.battery_level).toBe(65);
      expect(result.cellular_dbm).toBe(-100.0);
      expect(result.wifi_access_points).toBe(5);
    });

    it('should categorize accuracy correctly', () => {
      const highAccuracy: TivePayload = {
        ...sampleTivePayload,
        Location: {
          ...sampleTivePayload.Location,
          Accuracy: { Meters: 5 },
        },
      };
      expect(transformToLocationPayload(highAccuracy).location_accuracy_category).toBe('High');

      const mediumAccuracy: TivePayload = {
        ...sampleTivePayload,
        Location: {
          ...sampleTivePayload.Location,
          Accuracy: { Meters: 50 },
        },
      };
      expect(transformToLocationPayload(mediumAccuracy).location_accuracy_category).toBe('Medium');

      const lowAccuracy: TivePayload = {
        ...sampleTivePayload,
        Location: {
          ...sampleTivePayload.Location,
          Accuracy: { Meters: 500 },
        },
      };
      expect(transformToLocationPayload(lowAccuracy).location_accuracy_category).toBe('Low');
    });

    it('should parse address components', () => {
      const result = transformToLocationPayload(sampleTivePayload);

      expect(result.address?.full_address).toBe('114 Hunts Point Market, Bronx, NY 10474, USA');
      expect(result.address?.locality).toBe('Bronx');
      expect(result.address?.state).toBe('NY');
      expect(result.address?.postal_code).toBe('10474');
      expect(result.address?.country).toBe('USA');
    });
  });
});

