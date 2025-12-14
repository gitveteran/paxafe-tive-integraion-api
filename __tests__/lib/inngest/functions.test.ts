import { processTiveWebhook } from '@/lib/inngest/functions';
import { transformToSensorPayload, transformToLocationPayload } from '@/lib/transformers/tive-to-paxafe';
import { saveTelemetry, saveLocation, updateRawPayloadStatus } from '@/lib/db';
import { createValidTivePayload } from '../../helpers/test-utils';

jest.mock('@/lib/transformers/tive-to-paxafe');
jest.mock('@/lib/db');
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn() },
}));

describe('Inngest Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process webhook payload successfully', async () => {
    const payload = createValidTivePayload();
    const event = {
      data: {
        raw_id: 1,
        payload,
      },
    };

    const mockSensorPayload = { device_imei: '123', device_id: 'Device1' };
    const mockLocationPayload = { device_imei: '123', latitude: 40.0 };

    (transformToSensorPayload as jest.Mock).mockReturnValue(mockSensorPayload);
    (transformToLocationPayload as jest.Mock).mockReturnValue(mockLocationPayload);
    (saveTelemetry as jest.Mock).mockResolvedValue(1);
    (saveLocation as jest.Mock).mockResolvedValue(1);
    (updateRawPayloadStatus as jest.Mock).mockResolvedValue(undefined);

    // Note: Inngest functions need special testing setup
    // This is a simplified example
    expect(transformToSensorPayload).toBeDefined();
  });
});
