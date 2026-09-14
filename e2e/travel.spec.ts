import { test, expect } from '@playwright/test';
import { signInFixedTestUser } from './support/testUser';
import { resetFixedUserData } from './support/resetTestData';

// Requires: 0001_init.sql and 0002_travel.sql applied, "Confirm email" off.

test.describe('travel/visa/PG flow', () => {
  test.beforeEach(async () => {
    await resetFixedUserData();
  });

  test('completing the chat flow creates a trip and shows the summary on Travel and the Pulse home screen', async ({ page }) => {
    await signInFixedTestUser(page);

    await page.goto('/travel');
    await expect(page.getByRole('heading', { name: 'Travel & Accommodation' })).toBeVisible();

    // Step 1: flight
    await expect(page.getByText("Let's start your journey!", { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Today' }).click();
    await page.getByRole('button', { name: 'Morning' }).click();
    await page.getByRole('button', { name: 'Emirates' }).click();
    await page.getByLabel('Flight number?').fill('EK501');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Ticket cost (AED)?').fill('1500');
    await page.getByRole('button', { name: 'Send' }).click();

    // Step 2: visa
    await page.getByRole('button', { name: 'Visit Visa' }).click();
    await page.getByLabel('Visa fee (AED)?').fill('100');
    await page.getByRole('button', { name: 'Send' }).click();

    // Step 3: PG
    await page.getByLabel('PG name?').fill('Dubai PG House');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Location/Address?').fill('Deira, Dubai');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Monthly rent (AED)?').fill('4500');
    await page.getByRole('button', { name: 'Send' }).click();

    // Flow finishes -> TravelPage swaps from ChatFlow to the read-only summary.
    await expect(page.getByRole('heading', { name: 'Outbound Flight' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Emirates EK501')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Visa' })).toBeVisible();
    await expect(page.getByText('visit visa', { exact: false })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'PG Accommodation' })).toBeVisible();
    await expect(page.getByText('Dubai PG House')).toBeVisible();
    await expect(page.getByText('6,100 AED')).toBeVisible(); // 1500 + 100 + 4500

    // Editing the accommodation updates both its card and the total cost.
    const accommodationCard = page.locator('section', { has: page.getByRole('heading', { name: 'PG Accommodation' }) });
    await accommodationCard.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Monthly rent (AED)').fill('5000');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('5,000 AED / month')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('6,600 AED')).toBeVisible(); // 1500 + 100 + 5000

    // Editing the visa updates its card too.
    const visaCard = page.locator('section', { has: page.getByRole('heading', { name: 'Visa' }) });
    await visaCard.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel('Status').selectOption('approved');
    await page.getByLabel('Fee (AED)').fill('120');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('120 AED · approved')).toBeVisible({ timeout: 10_000 });

    // The Pulse home screen's mission header reflects the just-created visa (60-day default, issued today).
    await page.goto('/');
    await expect(page.getByText(/\d+ days? remaining on visa/i)).toBeVisible({ timeout: 10_000 });
  });
});
