import { test, expect } from '@playwright/test';
import { signInFixedTestUser } from './support/testUser';
import { resetFixedUserData } from './support/resetTestData';

// Requires: migrations through 0006_offers.sql applied, "Confirm email" off.
// Mirrors analytics.mock.spec.ts against the real Supabase project.

async function addLinkedInApplication(page: import('@playwright/test').Page, company: string, position: string) {
  await page.getByRole('button', { name: '+ Add Application' }).click();
  await page.getByRole('button', { name: 'LinkedIn' }).click();
  await page.getByLabel('Company name?').fill(company);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByLabel('Position title?').fill(position);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: "Skip - I'll update later" }).click();
  await page.getByRole('button', { name: 'Skip - I need to ask' }).click();
  await expect(page.getByRole('heading', { name: company })).toBeVisible({ timeout: 10_000 });
}

async function addOffer(
  page: import('@playwright/test').Page,
  company: string,
  salaryAed: string,
  growth: 'Low' | 'Medium' | 'High',
) {
  await page.getByRole('button', { name: '+ Add Offer' }).click();
  await page.getByRole('button', { name: company }).click();
  await page.getByLabel('Salary (AED)?').fill(salaryAed);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'Skip' }).first().click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: 'NO', exact: true }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await page.getByRole('button', { name: growth }).click();
}

test.describe('analytics + offers', () => {
  test.beforeEach(async () => {
    await resetFixedUserData();
  });

  test('two offers produce a funnel, salary analysis, and a comparison recommendation', async ({ page }) => {
    await signInFixedTestUser(page);

    await page.goto('/applications');
    await addLinkedInApplication(page, 'Tech Corp UAE', 'Senior Developer');
    await addLinkedInApplication(page, 'Emirates Tech', 'Product Manager');

    await page.goto('/analytics');
    await addOffer(page, 'Tech Corp UAE', '220000', 'High');
    await expect(page.getByText('Tech Corp UAE: 220,000 AED')).toBeVisible({ timeout: 10_000 });

    await addOffer(page, 'Emirates Tech', '200000', 'Medium');
    await expect(page.getByText('Emirates Tech: 200,000 AED')).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText('Applied: 2').first()).toBeVisible();
    await expect(page.getByText('Offered: 2', { exact: true })).toBeVisible();
    await expect(page.getByText('Range Offered: 200,000–220,000 AED')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Recommendation' })).toBeVisible();
    await expect(page.getByText('Tech Corp UAE looks best overall')).toBeVisible();
    await expect(page.getByText(/Higher salary/)).toBeVisible();
    await expect(page.getByText(/Better growth/)).toBeVisible();
  });
});
