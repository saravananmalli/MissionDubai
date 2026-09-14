import { test, expect } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

// Verifies the Applications + Company Visits flow's UI/logic against the
// local mock backend — no real network calls. See travel.mock.spec.ts for
// why this exists alongside (not instead of) a real-backend equivalent.

test.describe('applications + company visits (mock backend)', () => {
  test('minimal LinkedIn application shows incomplete-field badges; company-site application does not', async ({ page }) => {
    await installMockSupabase(page);

    const email = `mock-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct horse battery staple');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });

    await page.goto('/applications');
    await page.getByRole('button', { name: '+ Add Application' }).click();

    // Minimal LinkedIn application: skip everything skippable, no contact fields asked at all.
    await page.getByRole('button', { name: 'LinkedIn' }).click();
    await page.getByLabel('Company name?').fill('Tech Corp UAE');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Position title?').fill('Senior Developer');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Skip' }).click(); // location, optional
    await page.getByRole('button', { name: "Skip - I'll update later" }).click();
    await page.getByRole('button', { name: 'Skip - I need to ask' }).click();

    await expect(page.getByRole('heading', { name: 'Tech Corp UAE' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('⚠️ Salary: (Will update later)')).toBeVisible();
    await expect(page.getByText('⚠️ Visa sponsorship: (Need to ask)')).toBeVisible();
    await expect(page.getByText('⚠️ Contact: (Not added)')).toBeVisible();

    // Full company-site application: contact fields are asked, none of the warning badges apply.
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
    await page.getByRole('button', { name: 'Skip' }).click(); // contact phone, optional

    await expect(page.getByRole('heading', { name: 'Emirates Tech' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Contact: Sarah Khan')).toBeVisible();

    // Duplicate company name is rejected with a clear message, not a raw DB error.
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

    // Adding a company visit to the first application.
    await page
      .locator('section', { has: page.getByRole('heading', { name: 'Tech Corp UAE' }) })
      .getByRole('button', { name: '+ Add Visit' })
      .click();
    await page.getByRole('button', { name: 'Today' }).click();
    await page.getByLabel('Time?').fill('10:00');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('group', { name: 'Purpose?' }).getByRole('button', { name: 'Interview' }).click(); // visit purpose, not the pipeline filter tab
    await page.getByRole('button', { name: 'Skip' }).first().click(); // photos, optional
    await page.getByRole('button', { name: 'Skip' }).click(); // notes, optional

    await expect(page.getByText(/interview/i).last()).toBeVisible({ timeout: 10_000 });
  });
});
