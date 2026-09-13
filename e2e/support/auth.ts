import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Signs up a brand-new user (via the real Supabase project) and waits until the AI Home (Pulse) screen loads. */
export async function signUpFreshUser(page: Page): Promise<{ email: string; password: string }> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const password = 'correct horse battery staple';

  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign up/i }).click();
  await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });

  return { email, password };
}
