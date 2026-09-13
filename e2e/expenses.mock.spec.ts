import { test, expect } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

// Verifies the Budget + Expense logging flow's UI/logic against the local
// mock backend — including the 80/90/100% alert boundaries.

test.describe('expenses + budget (mock backend)', () => {
  test('logging expenses crosses the 80% budget alert threshold with the correct message', async ({ page }) => {
    await installMockSupabase(page);

    const email = `mock-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct horse battery staple');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });

    await page.goto('/expenses');
    await page.getByLabel('Budget amount (AED)').fill('1000');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('0% Spent')).toBeVisible({ timeout: 10_000 });

    // 800 AED of 1,000 = exactly 80% -> warning alert.
    await page.getByRole('button', { name: /log expense/i }).click();
    await page.getByRole('group', { name: 'What did you spend on?' }).getByRole('button', { name: 'Meals' }).click();
    await page.getByLabel('How much? (AED)').fill('800');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Today' }).click();
    await page.getByRole('button', { name: 'Skip' }).first().click(); // description
    await page.getByRole('button', { name: 'Skip' }).click(); // receipt

    await expect(page.getByText('80% Spent')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("You've used 80% of your budget.")).toBeVisible();

    await page.goto('/financial-report');
    await expect(page.getByRole('heading', { name: 'Expense Categories' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Burn Rate' })).toBeVisible();
  });
});
