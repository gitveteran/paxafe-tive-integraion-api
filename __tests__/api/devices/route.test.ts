import { NextRequest } from 'next/server';

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/config', () => ({
  config: { databaseUrl: 'postgresql://test' },
}));

// Mock Prisma Client
jest.mock('@/lib/db', () => {
  // Create mock inside factory to avoid hoisting issues
  const mockPrisma = {
    $queryRaw: jest.fn(),
  };
  return {
    prisma: mockPrisma,
  };
});

// Import after mocking to get the mock instance
import { prisma } from '@/lib/db';
import { GET } from '@/app/api/devices/route';

const mockPrisma = prisma as any;

describe('GET /api/devices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return devices list', async () => {
    const mockDevices = [
      {
        device_imei: '123',
        device_id: 'Device1',
        provider: 'Tive',
        last_ts: BigInt(1234567890),
        last_temperature: 10.5,
        last_humidity: null,
        last_light_level: null,
        last_accelerometer_x: null,
        last_accelerometer_y: null,
        last_accelerometer_z: null,
        last_accelerometer_magnitude: null,
        last_lat: 40.0,
        last_lon: -73.0,
        last_altitude: null,
        location_accuracy: null,
        location_accuracy_category: null,
        location_source: null,
        address_street: null,
        address_locality: null,
        address_state: null,
        address_country: null,
        address_postal_code: null,
        address_full_address: null,
        battery_level: null,
        cellular_dbm: null,
        cellular_network_type: null,
        cellular_operator: null,
        wifi_access_points: null,
        updated_at: new Date(),
      },
    ];

    mockPrisma.$queryRaw.mockResolvedValue(mockDevices);

    const request = new NextRequest('http://localhost:3000/api/devices?limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.count).toBe(1);
    expect(data.data.devices[0].device_imei).toBe('123');
    expect(data.data.devices[0].last_ts).toBe(1234567890); // Should be converted from BigInt
  });

  it('should return 400 when limit exceeds 1000', async () => {
    const request = new NextRequest('http://localhost:3000/api/devices?limit=2000');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid limit');
  });

  it('should handle database errors', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/devices');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
