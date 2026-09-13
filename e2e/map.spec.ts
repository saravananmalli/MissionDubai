import { test, expect } from '@playwright/test';
import { signInFixedTestUser } from './support/testUser';
import { resetFixedUserData } from './support/resetTestData';

// Mirrors map.mock.spec.ts against the real Supabase project.

test.describe('map', () => {
  test.beforeEach(async () => {
    await resetFixedUserData();
  });

  test('renders centered on Dubai with no locations, then shows the PG once one exists', async ({ page }) => {
    await signInFixedTestUser(page);

    await page.goto('/map');
    await expect(page.getByRole('heading', { name: 'Map View' })).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.getByText(/No saved locations yet/)).toBeVisible();

    await page.goto('/travel');
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
    await expect(page.getByRole('heading', { name: 'PG Accommodation' })).toBeVisible({ timeout: 10_000 });

    await page.goto('/map');
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PG Accommodation' })).toBeVisible();
    await expect(page.getByText('Dubai PG House')).toBeVisible();
  });
});
