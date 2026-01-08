import { TivePayload } from '@/types/tive';
import { PaxafeSensorPayload, PaxafeLocationPayload } from '@/types/paxafe';

// Mock logger before importing db module
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock config to prevent real database connection
jest.mock('@/lib/config', () => ({
  config: {
    databaseUrl: 'postgresql://test:test@localhost:5432/test',
    apiKey: 'test-key',
    nodeEnv: 'test',
  },
}));

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  // Create mock instance inside factory to avoid hoisting issues
  const mockInstance = {
    rawWebhookPayload: {
      create: jest.fn(),
      update: jest.fn(),
    },
    telemetry: {
      create: jest.fn(),
    },
    location: {
      create: jest.fn(),
    },
    deviceLatest: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
    $transaction: jest.fn(),
    $disconnect: jest.fn(),
  };
  
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockInstance),
  };
});

// Import after mocking
import {
  storeRawPayload,
  updateRawPayloadStatus,
  updateRawPayloadInngestEventId,
  saveTelemetry,
  saveLocation,
  updateDeviceLatest,
  updateDeviceLatestCritical,
  updateDeviceLatestReferences,
  checkDatabaseHealth,
  withTransaction,
  prisma,
} from '@/lib/db';

describe('Database Functions', () => {
  // Use prisma directly as it's the mock instance
  const mockPrisma = prisma as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeRawPayload', () => {
    it('should store raw payload and return ID', async () => {
      const mockPayload: TivePayload = {
        DeviceId: '863257063350583',
        DeviceName: 'A571992',
        EntryTimeEpoch: Date.now(),
        Temperature: { Celsius: 10.0 },
        Location: { Latitude: 40.810562, Longitude: -73.879285 },
      };

      mockPrisma.rawWebhookPayload.create.mockResolvedValue({
        id: 1,
      });

      const result = await storeRawPayload(mockPayload);

      expect(result).toBe(1);
      expect(mockPrisma.rawWebhookPayload.create).toHaveBeenCalledWith({
        data: {
          payload: mockPayload,
          source: 'Tive',
          status: 'pending',
          validationErrors: null,
          inngestEventId: null,
        },
      });
    });

    it('should handle validation errors', async () => {
      const validationErrors = [{ field: 'DeviceId', message: 'Invalid' }];
      
      mockPrisma.rawWebhookPayload.create.mockResolvedValue({
        id: 2,
      });

      const result = await storeRawPayload(
        {} as TivePayload,
        validationErrors,
        'failed'
      );

      expect(result).toBe(2);
      expect(mockPrisma.rawWebhookPayload.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'failed',
          validationErrors: validationErrors,
        }),
      });
    });
  });

  describe('updateRawPayloadStatus', () => {
    it('should update payload status', async () => {
      mockPrisma.rawWebhookPayload.update.mockResolvedValue({});

      await updateRawPayloadStatus(1, 'completed', 'Success');

      expect(mockPrisma.rawWebhookPayload.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          status: 'completed',
          processedAt: expect.any(Date),
          processingError: 'Success',
        },
      });
    });
  });

  describe('updateRawPayloadInngestEventId', () => {
    it('should update inngest event id', async () => {
      mockPrisma.rawWebhookPayload.update.mockResolvedValue({});

      await updateRawPayloadInngestEventId(1, 'event-123');

      expect(mockPrisma.rawWebhookPayload.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { inngestEventId: 'event-123' },
      });
    });
  });

  describe('saveTelemetry', () => {
    it('should save telemetry as new record', async () => {
      const payload: PaxafeSensorPayload = {
        device_id: 'A571992',
        device_imei: '863257063350583',
        timestamp: Date.now(),
        provider: 'Tive',
        type: 'Active',
        temperature: 10.08,
        humidity: 38.7,
        light_level: 0.0,
        accelerometer: { x: -0.562, y: -0.437, z: 0.688, magnitude: 0.99 },
        tilt: null,
        box_open: null,
      };

      mockPrisma.telemetry.create.mockResolvedValue({
        id: 1,
      });

      const result = await saveTelemetry(payload);

      expect(result).toBe(1);
      expect(mockPrisma.telemetry.create).toHaveBeenCalledWith({
        data: {
          deviceId: payload.device_id,
          deviceImei: payload.device_imei,
          ts: BigInt(payload.timestamp),
          provider: payload.provider,
          type: payload.type,
          temperature: payload.temperature,
          humidity: payload.humidity,
          lightLevel: payload.light_level,
          accelerometerX: payload.accelerometer?.x,
          accelerometerY: payload.accelerometer?.y,
          accelerometerZ: payload.accelerometer?.z,
          accelerometerMagnitude: payload.accelerometer?.magnitude,
        },
      });
    });
  });

  describe('saveLocation', () => {
    it('should save location as new record', async () => {
      const payload: PaxafeLocationPayload = {
        device_id: 'A571992',
        device_imei: '863257063350583',
        timestamp: Date.now(),
        provider: 'Tive',
        type: 'Active',
        latitude: 40.810562,
        longitude: -73.879285,
        altitude: 10.5,
        location_accuracy: 5,
        location_accuracy_category: 'High',
        location_source: 'gps',
        address: {
          street: '123 Main St',
          locality: 'New York',
          state: 'NY',
          country: 'USA',
          postal_code: '10001',
          full_address: '123 Main St, New York, NY 10001',
        },
        battery_level: 85,
        cellular_dbm: -70,
        cellular_network_type: 'LTE',
        cellular_operator: 'Verizon',
        wifi_access_points: 3,
      };

      mockPrisma.location.create.mockResolvedValue({
        id: 1,
      });

      const result = await saveLocation(payload);

      expect(result).toBe(1);
      expect(mockPrisma.location.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deviceId: payload.device_id,
          deviceImei: payload.device_imei,
          ts: BigInt(payload.timestamp),
          latitude: payload.latitude,
          longitude: payload.longitude,
        }),
      });
    });
  });

  describe('updateDeviceLatestCritical', () => {
    it('should upsert device latest with critical fields', async () => {
      const sensorPayload: PaxafeSensorPayload = {
        device_id: 'A571992',
        device_imei: '863257063350583',
        timestamp: Date.now(),
        provider: 'Tive',
        type: 'Active',
        temperature: 10.08,
        humidity: 38.7,
        light_level: 0.0,
        accelerometer: { x: -0.562, y: -0.437, z: 0.688, magnitude: 0.99 },
        tilt: null,
        box_open: null,
      };

      const locationPayload: PaxafeLocationPayload = {
        device_id: 'A571992',
        device_imei: '863257063350583',
        timestamp: Date.now(),
        provider: 'Tive',
        type: 'Active',
        latitude: 40.810562,
        longitude: -73.879285,
        altitude: null,
        location_accuracy: null,
        location_accuracy_category: null,
        location_source: null,
        address: null,
        battery_level: null,
        cellular_dbm: null,
        cellular_network_type: null,
        cellular_operator: null,
        wifi_access_points: null,
      };

      mockPrisma.deviceLatest.upsert.mockResolvedValue({});

      await updateDeviceLatestCritical(
        '863257063350583',
        'A571992',
        Date.now(),
        sensorPayload,
        locationPayload
      );

      expect(mockPrisma.deviceLatest.upsert).toHaveBeenCalledWith({
        where: { deviceImei: '863257063350583' },
        create: expect.any(Object),
        update: expect.any(Object),
      });
    });
  });

  describe('updateDeviceLatestReferences', () => {
    it('should update device latest references', async () => {
      mockPrisma.deviceLatest.update.mockResolvedValue({});

      await updateDeviceLatestReferences('863257063350583', 1, 2);

      expect(mockPrisma.deviceLatest.update).toHaveBeenCalledWith({
        where: { deviceImei: '863257063350583' },
        data: {
          latestTelemetryId: 1,
          latestLocationId: 2,
        },
      });
    });
  });

  describe('updateDeviceLatest', () => {
    it('should update device latest references (backward compatibility)', async () => {
      mockPrisma.deviceLatest.update.mockResolvedValue({});

      await updateDeviceLatest('863257063350583', 'A571992', Date.now(), 1, 2);

      expect(mockPrisma.deviceLatest.update).toHaveBeenCalledWith({
        where: { deviceImei: '863257063350583' },
        data: {
          latestTelemetryId: 1,
          latestLocationId: 2,
        },
      });
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return true when database is healthy', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

      const result = await checkDatabaseHealth();

      expect(result).toBe(true);
      expect(mockPrisma.$queryRaw).toHaveBeenCalled();
    });

    it('should return false when database is unhealthy', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection failed'));

      const result = await checkDatabaseHealth();

      expect(result).toBe(false);
    });
  });

  describe('withTransaction', () => {
    it('should execute transaction callback', async () => {
      const callback = jest.fn().mockResolvedValue('result');
      mockPrisma.$transaction.mockImplementation(async (cb) => {
        return await cb(mockPrisma);
      });

      const result = await withTransaction(callback);

      expect(result).toBe('result');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(mockPrisma);
    });

    it('should handle transaction errors', async () => {
      const callback = jest.fn().mockRejectedValue(new Error('Test error'));
      mockPrisma.$transaction.mockRejectedValue(new Error('Test error'));

      await expect(withTransaction(callback)).rejects.toThrow('Test error');
    });
  });
});
