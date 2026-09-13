import { test, expect } from '@playwright/test';
import { signInFixedTestUser } from './support/testUser';
import { resetFixedUserData } from './support/resetTestData';

// Requires: migrations through 0004_interviews.sql applied, "Confirm email" off.
// Mirrors interviews.mock.spec.ts against the real Supabase project.

test.describe('interviews', () => {
  test.beforeEach(async () => {
    await resetFixedUserData();
  });

  test('scheduling an interview shows it on the calendar; feedback updates the outcome', async ({ page }) => {
    await signInFixedTestUser(page);

    await page.goto('/applications');
    await page.getByRole('button', { name: '+ Add Application' }).click();
    await page.getByRole('button', { name: 'LinkedIn' }).click();
    await page.getByLabel('Company name?').fill('Tech Corp UAE');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Position title?').fill('Senior Developer');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: "Skip - I'll update later" }).click();
    await page.getByRole('button', { name: 'Skip - I need to ask' }).click();
    await expect(page.getByRole('heading', { name: 'Tech Corp UAE' })).toBeVisible({ timeout: 10_000 });

    await page.goto('/interviews');
    await page.getByRole('button', { name: '+ Schedule Interview' }).click();
    await page.getByRole('button', { name: 'Tech Corp UAE' }).click();
    await page.getByRole('button', { name: 'Today' }).click();
    await page.getByLabel('Time?').fill('14:00');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Video' }).click();
    await page.getByRole('button', { name: 'Skip' }).first().click();
    await page.getByRole('button', { name: 'Skip' }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();

    await expect(page.getByRole('heading', { name: 'Tech Corp UAE' }).last()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/video/i)).toBeVisible();

    await page.getByRole('link', { name: /Tech Corp UAE/ }).click();
    await expect(page.getByRole('heading', { name: 'Interview Details & Prep' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '📚 Research Company' })).toBeVisible();

    await page.getByRole('button', { name: 'Log Post-Interview Feedback' }).click();
    await page.getByRole('button', { name: 'Very Good' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await page.getByRole('button', { name: 'Skip' }).click();

    await expect(page.getByText('very good')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Confidence: \d+\/10/)).toBeVisible();
  });
});
