/**
 * Unit tests for Tive payload validation
 */

import { validateTivePayload } from '@/lib/validators/tive-validator';

describe('Tive Payload Validation', () => {
  const validPayload = {
    DeviceId: '863257063350583',
    DeviceName: 'A571992',
    EntryTimeEpoch: Date.now(),
    Temperature: {
      Celsius: 10.0,
    },
    Location: {
      Latitude: 40.810562,
      Longitude: -73.879285,
    },
  };

  it('should validate a correct payload', () => {
    const result = validateTivePayload(validPayload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject missing DeviceId', () => {
    const payload = { ...validPayload };
    delete payload.DeviceId;
    const result = validateTivePayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'DeviceId')).toBe(true);
  });

  it('should reject invalid DeviceId format', () => {
    const payload = { ...validPayload, DeviceId: '123' }; // Not 15 digits
    const result = validateTivePayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'DeviceId' && e.message.includes('15 digits'))).toBe(true);
  });

  it('should reject missing Temperature', () => {
    const payload = { ...validPayload };
    delete payload.Temperature;
    const result = validateTivePayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'Temperature')).toBe(true);
  });

  it('should reject invalid latitude', () => {
    const payload = {
      ...validPayload,
      Location: { ...validPayload.Location, Latitude: 95.0 }, // Out of range
    };
    const result = validateTivePayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'Location.Latitude')).toBe(true);
  });

  it('should reject invalid longitude', () => {
    const payload = {
      ...validPayload,
      Location: { ...validPayload.Location, Longitude: -200.0 }, // Out of range
    };
    const result = validateTivePayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'Location.Longitude')).toBe(true);
  });

  it('should reject timestamp too far in past', () => {
    const payload = {
      ...validPayload,
      EntryTimeEpoch: Date.now() - (2 * 365 * 24 * 60 * 60 * 1000), // 2 years ago
    };
    const result = validateTivePayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'EntryTimeEpoch' && e.message.includes('past'))).toBe(true);
  });

  it('should reject timestamp in future', () => {
    const payload = {
      ...validPayload,
      EntryTimeEpoch: Date.now() + (2 * 365 * 24 * 60 * 60 * 1000), // 2 years from now
    };
    const result = validateTivePayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'EntryTimeEpoch' && e.message.includes('future'))).toBe(true);
  });

  it('should validate optional fields when present', () => {
    const payload = {
      ...validPayload,
      Humidity: { Percentage: 50.5 },
      Battery: { Percentage: 80 },
    };
    const result = validateTivePayload(payload);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid humidity range', () => {
    const payload = {
      ...validPayload,
      Humidity: { Percentage: 150 }, // Out of range
    };
    const result = validateTivePayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'Humidity.Percentage')).toBe(true);
  });
});

