/**
 * Integration tests for Tive webhook API endpoint
 */

import { POST } from '@/app/api/webhook/tive/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  pool: { query: jest.fn() },
  storeRawPayload: jest.fn(),
  updateDeviceLatest: jest.fn(),
  checkAndUpdatePayloadOrder: jest.fn(),
}));

jest.mock('@/lib/inngest/client', () => ({
  inngest: { send: jest.fn() },
}));

jest.mock('@/lib/notifications/tive-notification', () => ({
  notifyTiveOfError: jest.fn(),
}));

jest.mock('@/lib/validators/tive-validator', () => ({
  validateTivePayload: jest.fn(),
}));

process.env.API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

describe('POST /api/webhook/tive', () => {
  const validPayload = {
    DeviceId: '863257063350583',
    DeviceName: 'A571992',
    EntryTimeEpoch: Date.now(),
    Temperature: { Celsius: 10.0 },
    Location: { Latitude: 40.810562, Longitude: -73.879285 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { validateTivePayload } = require('@/lib/validators/tive-validator');
    validateTivePayload.mockReturnValue({ valid: true, errors: [] });
  });

  it('should return 401 when API key is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/webhook/tive', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 200 when payload is valid', async () => {
    const { storeRawPayload, updateDeviceLatest, checkAndUpdatePayloadOrder } = require('@/lib/db');
    const { inngest } = require('@/lib/inngest/client');
    
    storeRawPayload.mockResolvedValue(1);
    updateDeviceLatest.mockResolvedValue(undefined);
    checkAndUpdatePayloadOrder.mockResolvedValue({ isOutOfOrder: false, lastTimestamp: null });
    inngest.send.mockResolvedValue({ ids: ['evt_123'] });

    const request = new NextRequest('http://localhost:3000/api/webhook/tive', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(storeRawPayload).toHaveBeenCalled();
    expect(inngest.send).toHaveBeenCalled();
  });
});


