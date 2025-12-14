// Branded types for better type safety
export type PayloadId = number & { readonly __brand: 'PayloadId' };
export type DeviceImei = string & { readonly __brand: 'DeviceImei' };

// Helper functions
export function asPayloadId(id: number): PayloadId {
  return id as PayloadId;
}
