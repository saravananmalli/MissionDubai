import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

// One fixed, reused Supabase account for all E2E tests, instead of signing up
// a fresh user per run — every signUp() call counts against Supabase's
// email-send rate limit, which we've already exhausted once. Read from
// .env.local (gitignored) so a real account's credentials never land in the
// repo; falls back to a throwaway placeholder for anyone cloning the repo
// without that file. NOTE: if this points at a real personal account (see
// .env.local), E2E runs will write fake data (dummy flights/visas/expenses)
// into that account's real dashboard — the separate-account isolation this
// fixture originally provided no longer applies in that case.
export const FIXED_TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? 'e2e-fixed-user@example.com';
export const FIXED_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? 'correct horse battery staple';

/**
 * The app has no login screen: it silently signs in to the personal account
 * from VITE_PERSONAL_EMAIL/PASSWORD. This just opens the app and waits for it.
 */
export async function signInFixedTestUser(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 15_000 });
}
