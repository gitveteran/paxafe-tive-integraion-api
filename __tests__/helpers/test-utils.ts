import { TivePayload } from '@/types/tive';
import { NextRequest } from 'next/server';

/**
 * Create a valid Tive payload for testing
 */
export function createValidTivePayload(overrides?: Partial<TivePayload>): TivePayload {
  return {
    DeviceId: '863257063350583',
    DeviceName: 'A571992',
    EntryTimeEpoch: Date.now(),
    EntryTimeUtc: new Date().toISOString(),
    Temperature: {
      Celsius: 10.0,
      Fahrenheit: 50.0,
    },
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
    },
    ...overrides,
  };
}

/**
 * Create a NextRequest for testing
 */
export function createTestRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  return new NextRequest(url, {
    method: options.method || 'GET',
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Mock database pool
 */
export function mockPool() {
  return {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
    totalCount: 0,
    idleCount: 0,
    waitingCount: 0,
  };
}
