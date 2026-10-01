import { test, expect, type Page } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

async function setBudget(page: Page, amount: string) {
  await page.goto('/expenses');
  await page.getByLabel('Budget amount (AED)').fill(amount);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('0% Spent')).toBeVisible({ timeout: 10_000 });
}

async function logExpense(page: Page, category: string, amount: string, description: string) {
  await page.goto('/expenses');
  await page.getByRole('button', { name: /log expense/i }).click();
  await page.getByRole('group', { name: 'What did you spend on?' }).getByRole('button', { name: category }).click();
  await page.getByLabel('How much? (AED)').fill(amount);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'Today' }).click();
  await page.getByLabel('Description?').fill(description);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'Skip' }).click();
  await expect(page.getByRole('button', { name: /log expense/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(description)).toBeVisible({ timeout: 10_000 });
}

test.describe('overall analytics (mock backend)', () => {
  test('detail page summarises budget, spend and categories', async ({ page }) => {
    await installMockSupabase(page);
    await page.goto('/');
    await setBudget(page, '1000');
    await logExpense(page, 'Meals', '250', 'Dinner');

    await page.goto('/overall-analytics');
    const summary = page.getByRole('region', { name: 'Financial summary' });
    await expect(summary).toContainText('750 AED'); // remaining
    await expect(summary).toContainText('25.0%');
    await expect(page.getByRole('table', { name: 'Expenses by category' })).toContainText('Meals');
    await expect(page.getByRole('table', { name: 'Expenses by category' }).getByRole('row')).toHaveCount(1 + 9 + 1); // header + all categories + total
    await expect(page.getByText('left to spend')).toBeVisible();
  });

  test('over-budget spend is called out and the log filters by category', async ({ page }) => {
    await installMockSupabase(page);
    await page.goto('/');
    await setBudget(page, '100');
    await logExpense(page, 'Meals', '80', 'Lunch');
    await logExpense(page, 'Transport', '70', 'Taxi');

    await page.goto('/overall-analytics');
    await expect(page.getByRole('alert').filter({ hasText: 'over your' })).toContainText('50 AED over your 100 AED budget');
    await expect(page.getByRole('region', { name: 'Financial summary' })).toContainText('Over budget by');

    const log = page.getByRole('table', { name: /Every logged expense/ });
    await expect(log).toContainText('Lunch');
    await expect(log).toContainText('Taxi');
    await page.getByLabel('Category').selectOption('transport');
    await expect(log).not.toContainText('Lunch');
    await expect(log).toContainText('Taxi');
    await expect(page.getByRole('status').filter({ hasText: '1 expense' })).toBeVisible();
  });

  test('without a budget the page still works and prompts to set one; empty state with no expenses', async ({ page }) => {
    await installMockSupabase(page);
    await page.goto('/overall-analytics');
    await expect(page.getByText(/No expenses yet/)).toBeVisible({ timeout: 10_000 });
    await page.goto('/');
    await logExpense(page, 'Shopping', '300', 'Jacket');
    await page.goto('/overall-analytics');
    await expect(page.getByText(/No budget set, so there is nothing to compare/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Set a budget' }).first()).toBeVisible();
  });

  test('has no horizontal overflow at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await installMockSupabase(page);
    await page.goto('/');
    await setBudget(page, '500');
    await logExpense(page, 'Meals', '45', 'A very long description for a coffee and breakfast pastry at the airport terminal');
    await page.goto('/overall-analytics');
    await expect(page.getByRole('heading', { name: 'Expense log' })).toBeVisible({ timeout: 10_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
