import { test, expect } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

// Verifies the Leaflet/OpenStreetMap Map page renders without a client-side
// crash, both with no saved locations and once a PG accommodation exists.

test.describe('map (mock backend)', () => {
  test('renders centered on Dubai with no locations, then shows the PG once one exists', async ({ page }) => {
    await installMockSupabase(page);

    const email = `mock-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct horse battery staple');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });

    await page.goto('/map');
    await expect(page.getByRole('heading', { name: 'Map View' })).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
    await expect(page.getByText(/No saved locations yet/)).toBeVisible();

    // Complete the travel flow so a PG accommodation exists (still no lat/lng
    // captured — see README known limitations — but the accommodation card
    // should now render on this page too).
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
