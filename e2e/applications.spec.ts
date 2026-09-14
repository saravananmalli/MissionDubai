import { test, expect } from '@playwright/test';
import { signInFixedTestUser } from './support/testUser';
import { resetFixedUserData } from './support/resetTestData';

// Requires: migrations through 0003_applications.sql applied, "Confirm email" off.
// Mirrors applications.mock.spec.ts against the real Supabase project (RLS,
// storage, real auth) instead of the local mock.
//
// Incomplete-field badges and Company Visits now live on the Application
// Detail page, not inline on the pipeline list (that list only shows
// company/position/status, per the pipeline-style restyle).

test.describe('applications + company visits', () => {
  test.beforeEach(async () => {
    await resetFixedUserData();
  });

  test('minimal LinkedIn application shows incomplete-field badges; company-site application does not', async ({ page }) => {
    await signInFixedTestUser(page);

    await page.goto('/applications');
    await page.getByRole('button', { name: '+ Add Application' }).click();

    await page.getByRole('button', { name: 'LinkedIn' }).click();
    await page.getByLabel('Company name?').fill('Tech Corp UAE');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Position title?').fill('Senior Developer');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Skip' }).click(); // location, optional
    await page.getByRole('button', { name: "Skip - I'll update later" }).click();
    await page.getByRole('button', { name: 'Skip - I need to ask' }).click();

    await expect(page.getByRole('link', { name: /Tech Corp UAE/ })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('link', { name: /Tech Corp UAE/ }).click();
    await expect(page.getByText('⚠️ Salary: (Will update later)')).toBeVisible();
    await expect(page.getByText('⚠️ Visa sponsorship: (Need to ask)')).toBeVisible();
    await expect(page.getByText('⚠️ Contact: (Not added)')).toBeVisible();

    await page.goto('/applications');
    await page.getByRole('button', { name: '+ Add Application' }).click();
    await page.getByRole('button', { name: 'Company Site' }).click();
    await page.getByLabel('Company name?').fill('Emirates Tech');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Position title?').fill('Product Manager');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Skip' }).click(); // location, optional
    await page.getByRole('button', { name: '12-15k AED/mo' }).click();
    await page.getByRole('button', { name: 'YES' }).click();
    await page.getByLabel('Contact person name?').fill('Sarah Khan');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Contact email?').fill('sarah@emiratestech.ae');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Skip' }).click();

    await expect(page.getByRole('link', { name: /Emirates Tech/ })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('link', { name: /Emirates Tech/ }).click();
    await expect(page.getByText('Contact: Sarah Khan')).toBeVisible();
    await expect(page.getByText('⚠️ Contact', { exact: false })).toHaveCount(0);

    await page.goto('/applications');
    await page.getByRole('button', { name: '+ Add Application' }).click();
    await page.getByRole('button', { name: 'LinkedIn' }).click();
    await page.getByLabel('Company name?').fill('Tech Corp UAE');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Position title?').fill('Another Role');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Skip' }).click(); // location, optional
    await page.getByRole('button', { name: "Skip - I'll update later" }).click();
    await page.getByRole('button', { name: 'Skip - I need to ask' }).click();
    await expect(page.getByText(/already applied to Tech Corp UAE/i)).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: /Tech Corp UAE/ }).click();
    await page.getByRole('button', { name: '+ Add Visit' }).click();
    await page.getByRole('button', { name: 'Today' }).click();
    await page.getByLabel('Time?').fill('10:00');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('group', { name: 'Purpose?' }).getByRole('button', { name: 'Interview' }).click(); // visit purpose, not the pipeline filter tab
    await page.getByRole('button', { name: 'Skip' }).first().click(); // photos, optional
    await page.getByRole('button', { name: 'Skip' }).click(); // notes, optional

    const visitsCard = page.locator('section', { has: page.getByRole('heading', { name: 'Company Visits' }) });
    await expect(visitsCard.getByText(/interview/i)).toBeVisible({ timeout: 10_000 });
  });
});
