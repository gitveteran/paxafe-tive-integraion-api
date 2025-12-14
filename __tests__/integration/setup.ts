/**
 * Integration test setup
 * Use a test database for integration tests
 */

export const TEST_CONFIG = {
  databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db',
  apiKey: 'test-integration-key',
};
