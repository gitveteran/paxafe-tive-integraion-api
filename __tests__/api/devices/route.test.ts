import { GET } from '@/app/api/devices/route';
import { NextRequest } from 'next/server';
import { pool } from '@/lib/db';

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/db', () => ({
  pool: { query: jest.fn() },
}));

jest.mock('@/lib/config', () => ({
  config: { databaseUrl: 'postgresql://test' },
}));

describe('GET /api/devices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return devices list', async () => {
    const mockDevices = [
      {
        device_imei: '123',
        device_id: 'Device1',
        last_temperature: 10.5,
        last_lat: 40.0,
        last_lon: -73.0,
      },
    ];

    (pool.query as jest.Mock).mockResolvedValue({
      rows: mockDevices,
    });

    const request = new NextRequest('http://localhost:3000/api/devices?limit=10');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.devices).toEqual(mockDevices);
  });

  it('should return 400 when limit exceeds 1000', async () => {
    const request = new NextRequest('http://localhost:3000/api/devices?limit=2000');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid limit');
  });

  it('should handle database errors', async () => {
    (pool.query as jest.Mock).mockRejectedValue(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/devices');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
