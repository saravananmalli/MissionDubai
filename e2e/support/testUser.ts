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
 * Logs into the fixed test account. The very first time this account doesn't
 * exist yet, falls back to signing it up once — every run after that is a
 * plain login, consuming no signup-rate-limit quota.
 */
export async function signInFixedTestUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(FIXED_TEST_EMAIL);
  await page.getByLabel('Password').fill(FIXED_TEST_PASSWORD);
  await page.getByRole('button', { name: /log in/i }).click();

  const homeHeading = page.getByRole('heading', { name: /your dubai mission/i, level: 1 });
  const loginFailed = page.getByRole('alert');
  await Promise.race([homeHeading.waitFor({ timeout: 10_000 }), loginFailed.waitFor({ timeout: 10_000 })]);

  if (await homeHeading.isVisible()) return;

  // First run ever: the fixed account doesn't exist yet, so create it once.
  await page.goto('/signup');
  await page.getByLabel('Email').fill(FIXED_TEST_EMAIL);
  await page.getByLabel('Password').fill(FIXED_TEST_PASSWORD);
  await page.getByRole('button', { name: /sign up/i }).click();
  await expect(homeHeading).toBeVisible({ timeout: 10_000 });
}
