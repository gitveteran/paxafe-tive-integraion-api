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

// Mock getDeviceLatestList function
const mockGetDeviceLatestList = jest.fn();

jest.mock('@/lib/db', () => ({
  getDeviceLatestList: (...args: any[]) => mockGetDeviceLatestList(...args),
}));

// Import after mocking
import { GET } from '@/app/api/devices/route';

describe('GET /api/devices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return devices list', async () => {
    const mockDevices = [
      {
        deviceImei: '123',
        deviceId: 'Device1',
        provider: 'Tive',
        lastTs: BigInt(1234567890),
        lastTemperature: 10.5,
        lastHumidity: null,
        lastLightLevel: null,
        lastAccelerometerX: null,
        lastAccelerometerY: null,
        lastAccelerometerZ: null,
        lastAccelerometerMagnitude: null,
        lastLat: 40.0,
        lastLon: -73.0,
        lastAltitude: null,
        locationAccuracy: null,
        locationAccuracyCategory: null,
        locationSource: null,
        addressStreet: null,
        addressLocality: null,
        addressState: null,
        addressCountry: null,
        addressPostalCode: null,
        addressFullAddress: null,
        batteryLevel: null,
        cellularDbm: null,
        cellularNetworkType: null,
        cellularOperator: null,
        wifiAccessPoints: null,
        updatedAt: new Date(),
      },
    ];

    mockGetDeviceLatestList.mockResolvedValue(mockDevices);

    const request = new NextRequest('http://localhost:3000/api/devices?limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.count).toBe(1);
    expect(data.data.devices[0].deviceImei).toBe('123');
    expect(data.data.devices[0].lastTs).toBe(1234567890); // Should be converted from BigInt
    expect(mockGetDeviceLatestList).toHaveBeenCalledWith(10);
  });

  it('should handle database errors', async () => {
    mockGetDeviceLatestList.mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/devices');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
