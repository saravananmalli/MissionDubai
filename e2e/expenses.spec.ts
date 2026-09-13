import { test, expect } from '@playwright/test';
import { signInFixedTestUser } from './support/testUser';
import { resetFixedUserData } from './support/resetTestData';

// Requires: migrations through 0005_expenses.sql applied, "Confirm email" off.
// Mirrors expenses.mock.spec.ts against the real Supabase project.

test.describe('expenses + budget', () => {
  test.beforeEach(async () => {
    await resetFixedUserData();
  });

  test('logging expenses crosses the 80% budget alert threshold with the correct message', async ({ page }) => {
    await signInFixedTestUser(page);

    await page.goto('/expenses');
    await page.getByLabel('Budget amount (AED)').fill('1000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('0% Spent')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: /log expense/i }).click();
    await page.getByRole('group', { name: 'What did you spend on?' }).getByRole('button', { name: 'Meals' }).click();
    await page.getByLabel('How much? (AED)').fill('800');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Today' }).click();
    await page.getByRole('button', { name: 'Skip' }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();

    await expect(page.getByText('80% Spent')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("You've used 80% of your budget.")).toBeVisible();

    await page.goto('/financial-report');
    await expect(page.getByRole('heading', { name: 'Expense Categories' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Burn Rate' })).toBeVisible();
  });
});
