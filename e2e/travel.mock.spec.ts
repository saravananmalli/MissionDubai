import { test, expect } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

// Verifies the Travel/Visa/PG chat flow's UI/logic entirely against a local
// in-memory mock backend (see mock-backend/mockSupabase.ts) — no real network
// calls, no Supabase dependency, safe to run anytime. travel.spec.ts covers
// the same journey against the real Supabase project (RLS, real auth, etc.)
// and should still be run before calling a phase done; this spec exists so
// UI/flow regressions can be caught even while that's rate-limited.

test.describe('travel/visa/PG flow (mock backend)', () => {
  test('completing the chat flow creates a trip and shows the summary on Travel and the Pulse home screen', async ({ page }) => {
    await installMockSupabase(page);

    const email = `mock-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct horse battery staple');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });

    await page.goto('/travel');
    await expect(page.getByRole('heading', { name: 'Travel & Accommodation' })).toBeVisible();

    await page.getByRole('button', { name: 'Today' }).click();
    await page.getByRole('button', { name: 'Morning' }).click();
    await page.getByRole('button', { name: 'Emirates' }).click();
    await page.getByLabel('Flight number?').fill('EK501');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Ticket cost (AED)?').fill('1500');
    await page.getByRole('button', { name: 'Send' }).click();

    await page.getByRole('button', { name: 'Visit Visa' }).click();
    await page.getByLabel('Visa fee (AED)?').fill('100');
    await page.getByRole('button', { name: 'Send' }).click();

    await page.getByLabel('PG name?').fill('Dubai PG House');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Location/Address?').fill('Deira, Dubai');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Monthly rent (AED)?').fill('4500');
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByRole('heading', { name: 'Outbound Flight' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Emirates EK501')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Visa' })).toBeVisible();
    await expect(page.getByText('visit visa', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PG Accommodation' })).toBeVisible();
    await expect(page.getByText('Dubai PG House')).toBeVisible();
    await expect(page.getByText('6,100 AED')).toBeVisible(); // 1500 + 100 + 4500

    await page.goto('/');
    await expect(page.getByText(/\d+ days? remaining on visa/i)).toBeVisible({ timeout: 10_000 });
  });
});
