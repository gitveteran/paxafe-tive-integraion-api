/**
 * Integration tests for Tive webhook API endpoint
 */

import { POST } from '@/app/api/webhook/tive/route';
import { NextRequest } from 'next/server';

// Mock dependencies
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
  storeRawPayload: jest.fn(),
  updateDeviceLatestCritical: jest.fn(),
  saveTelemetry: jest.fn(),
  saveLocation: jest.fn(),
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
    const { storeRawPayload, updateDeviceLatestCritical } = require('@/lib/db');
    const { inngest } = require('@/lib/inngest/client');
    
    storeRawPayload.mockResolvedValue(1);
    updateDeviceLatestCritical.mockResolvedValue(undefined);
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

  it('should return 400 when payload is invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/webhook/tive', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid JSON');
  });

  it('should return 400 when payload validation fails', async () => {
    const { validateTivePayload } = require('@/lib/validators/tive-validator');
    validateTivePayload.mockReturnValue({
      valid: false,
      errors: [{ field: 'DeviceId', message: 'Invalid format' }],
    });

    const request = new NextRequest('http://localhost:3000/api/webhook/tive', {
      method: 'POST',
      body: JSON.stringify({ DeviceId: 'invalid' }),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'test-api-key',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Validation failed');
    expect(data.details.errors).toBeDefined();
  });

  it('should return 413 when payload is too large', async () => {
    const largePayload = { ...validPayload, largeData: 'x'.repeat(200 * 1024) };
    
    const request = new NextRequest('http://localhost:3000/api/webhook/tive', {
      method: 'POST',
      body: JSON.stringify(largePayload),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': (200 * 1024).toString(),
        'X-API-Key': 'test-api-key',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(413);
    expect(data.error).toBe('Payload too large');
  });

  it('should return 503 when database connection fails', async () => {
    const { storeRawPayload } = require('@/lib/db');
    storeRawPayload.mockRejectedValue(new Error('Database connection failed'));

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

    expect(response.status).toBe(503);
    expect(data.error).toBe('Database error');
  });


  it('should accept API key via Authorization header', async () => {
    const { storeRawPayload, updateDeviceLatestCritical } = require('@/lib/db');
    const { inngest } = require('@/lib/inngest/client');
    
    storeRawPayload.mockResolvedValue(1);
    updateDeviceLatestCritical.mockResolvedValue(undefined);
    inngest.send.mockResolvedValue({ ids: ['evt_123'] });

    const request = new NextRequest('http://localhost:3000/api/webhook/tive', {
      method: 'POST',
      body: JSON.stringify(validPayload),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-key',
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  it('should return 405 for GET method', async () => {
    const { GET } = require('@/app/api/webhook/tive/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(405);
    expect(data.error).toBe('Method not allowed');
  });
});


