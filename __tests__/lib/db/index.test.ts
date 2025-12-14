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

// Mock pg module to prevent real Pool creation
// This must be done BEFORE the db module is loaded
jest.mock('pg', () => {
  // Create the mock pool inside the factory
  const mockPoolInstance = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    on: jest.fn(), // Mock event handlers
    totalCount: 5,
    idleCount: 2,
    waitingCount: 0,
  };
  
  return {
    Pool: jest.fn().mockImplementation(() => mockPoolInstance),
    PoolClient: jest.fn(), // Mock PoolClient type if needed
  };
});

// Import after mocking - the db module will use our mocked Pool
// When the db module does `new Pool()`, it will get our mockPool
import {
  storeRawPayload,
  updateRawPayloadStatus,
  saveTelemetry,
  saveLocation,
  updateDeviceLatest,
  checkAndUpdatePayloadOrder,
  checkDatabaseHealth,
  getPoolStats,
  withTransaction,
  pool,
} from '@/lib/db';

// Get the mock pool instance - it's the same one created by the mocked Pool constructor
// Cast to any to avoid TypeScript issues with jest mocks
const mockPool = pool as any;

describe('Database Functions', () => {
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

      mockPool.query.mockResolvedValue({
        rows: [{ id: 1 }],
      });

      const result = await storeRawPayload(mockPayload);

      expect(result).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO raw_webhook_payloads'),
        expect.arrayContaining([expect.stringContaining('"DeviceId"')])
      );
    });

    it('should handle validation errors', async () => {
      const validationErrors = [{ field: 'DeviceId', message: 'Invalid' }];
      
      mockPool.query.mockResolvedValue({
        rows: [{ id: 2 }],
      });

      const result = await storeRawPayload(
        {} as TivePayload,
        validationErrors,
        'failed'
      );

      expect(result).toBe(2);
    });
  });

  describe('saveTelemetry', () => {
    it('should save telemetry with UPSERT', async () => {
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

      mockPool.query.mockResolvedValue({
        rows: [{ id: 1 }],
      });

      const result = await saveTelemetry(payload);

      expect(result).toBe(1);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.arrayContaining([payload.device_imei, payload.timestamp])
      );
    });
  });

  describe('checkAndUpdatePayloadOrder', () => {
    it('should detect out-of-order payloads', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ last_timestamp: 1000, out_of_order_count: 0 }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await checkAndUpdatePayloadOrder('123', 500);

      expect(result.isOutOfOrder).toBe(true);
      expect(result.lastTimestamp).toBe(1000);
    });

    it('should handle first payload for device', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await checkAndUpdatePayloadOrder('123', 1000);

      expect(result.isOutOfOrder).toBe(false);
    });
  });

  describe('checkDatabaseHealth', () => {
    it('should return true when database is healthy', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const result = await checkDatabaseHealth();

      expect(result).toBe(true);
    });

    it('should return false when database is unhealthy', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection failed'));

      const result = await checkDatabaseHealth();

      expect(result).toBe(false);
    });
  });

  describe('withTransaction', () => {
    it('should commit transaction on success', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      const callback = jest.fn().mockResolvedValue('result');

      const result = await withTransaction(callback);

      expect(result).toBe('result');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback transaction on error', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValue(mockClient);

      const callback = jest.fn().mockRejectedValue(new Error('Test error'));

      await expect(withTransaction(callback)).rejects.toThrow('Test error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
