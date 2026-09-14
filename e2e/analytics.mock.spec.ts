import { test, expect } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

// Verifies the Analytics funnel/offers/comparison UI against the local mock
// backend: two applications, each reaching offer stage, compared head-to-head
// — mirrors the product doc's own worked example (higher salary + growth wins).

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
  await page.getByRole('button', { name: 'Skip' }).first().click(); // bonus
  await page.getByRole('button', { name: 'Skip' }).click(); // leave days
  await page.getByRole('button', { name: 'NO', exact: true }).click(); // visa sponsorship
  await page.getByRole('button', { name: 'Skip' }).click(); // location
  await page.getByRole('button', { name: growth }).click();
}

test.describe('analytics + offers (mock backend)', () => {
  test('two offers produce a funnel, salary analysis, and a comparison recommendation', async ({ page }) => {
    await installMockSupabase(page);

    const email = `mock-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct horse battery staple');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });

    await page.goto('/applications');
    await addLinkedInApplication(page, 'Tech Corp UAE', 'Senior Developer');
    await addLinkedInApplication(page, 'Emirates Tech', 'Product Manager');

    await page.goto('/analytics');
    await addOffer(page, 'Tech Corp UAE', '220000', 'High');
    await expect(page.getByText('Tech Corp UAE: 220,000 AED')).toBeVisible({ timeout: 10_000 });

    await addOffer(page, 'Emirates Tech', '200000', 'Medium');
    await expect(page.getByText('Emirates Tech: 200,000 AED')).toBeVisible({ timeout: 10_000 });

    // Funnel: 2 applied, 0 interviewed (none scheduled), 2 offered.
    // "Applied: 2" appears in both the Companies Tracker and Funnel cards.
    await expect(page.getByText('Applied: 2').first()).toBeVisible();
    await expect(page.getByText('Offered: 2', { exact: true })).toBeVisible();

    await expect(page.getByText('Range Offered: 200,000–220,000 AED')).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Recommendation' })).toBeVisible();
    await expect(page.getByText('Tech Corp UAE looks best overall')).toBeVisible();
    await expect(page.getByText(/Higher salary/)).toBeVisible();
    await expect(page.getByText(/Better growth/)).toBeVisible();
  });
});
