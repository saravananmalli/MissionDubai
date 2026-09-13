import { config as loadEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

loadEnv({ path: '.env.local' });

export default defineConfig({
  testDir: './e2e',
  // All E2E specs share one fixed Supabase test account (see e2e/support/testUser.ts)
  // rather than signing up a fresh user per test, to avoid Supabase's email-send
  // rate limit. Since they share state, they must not run concurrently.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
