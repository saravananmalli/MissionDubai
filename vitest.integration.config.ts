import { defineConfig } from 'vitest/config';

// Separate from the unit test config: these tests hit a real Supabase instance
// over the network (see tests/integration/README.md), so they're excluded from
// the fast `npm run test` unit loop and run only via `npm run test:integration`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 20_000,
  },
});
