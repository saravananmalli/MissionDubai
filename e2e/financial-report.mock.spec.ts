import { test, expect, type Page } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

async function logTodayExpense(page: Page, category: string, amount: string, description: string) {
  await page.goto('/expenses');
  await page.getByRole('button', { name: /log expense/i }).click();
  await page.getByRole('group', { name: 'What did you spend on?' }).getByRole('button', { name: category }).click();
  await page.getByLabel('How much? (AED)').fill(amount);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'Today' }).click();
  await page.getByLabel('Description?').fill(description);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'Skip' }).click(); // receipt
  // The flow closing and the entry appearing in the saved list proves the insert finished before we navigate away.
  await expect(page.getByRole('button', { name: /log expense/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(description)).toBeVisible({ timeout: 10_000 });
}

test.describe('financial report (mock backend)', () => {
  test('empty state when nothing is logged', async ({ page }) => {
    await installMockSupabase(page);
    await page.goto('/financial-report');
    await expect(page.getByText(/No expenses yet to report on/)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: 'Log an expense' })).toBeVisible();
  });

  test('filters recompute metrics, compare periods, persist in the URL and validate custom ranges', async ({ page }) => {
    const consoleErrors: string[] = [];
    // The mock's auth bootstrap answers its first session probe with a 401 — that resource noise is not a page error.
    page.on('console', (m) => m.type() === 'error' && !m.text().includes('Failed to load resource') && consoleErrors.push(m.text()));
    await installMockSupabase(page);
    await page.goto('/');
    await logTodayExpense(page, 'Meals', '120', 'Lunch');
    await logTodayExpense(page, 'Transport', '30', 'Metro');

    await page.goto('/financial-report');
    const keyFigures = page.getByRole('region', { name: 'Key figures' });
    await expect(keyFigures.getByText('150 AED').first()).toBeVisible({ timeout: 10_000 });
    await expect(keyFigures.getByText('Transactions')).toBeVisible();
    await expect(keyFigures.getByText('no prior data').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Spend by category' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Top expenses' })).toBeVisible();
    await expect(page.getByRole('table', { name: /Transactions for/ })).toContainText('Lunch');

    // Daily compares with yesterday.
    await page.getByRole('button', { name: 'Daily' }).click();
    await expect(page).toHaveURL(/period=daily/);
    await expect(keyFigures.getByText('vs yesterday').first()).toBeVisible();
    await expect(keyFigures.getByText('150 AED').first()).toBeVisible();

    // Stepping back a day has no data -> in-period empty state, filters stay usable.
    await page.getByRole('button', { name: 'Previous day' }).click();
    await expect(page.getByText(/No expenses between/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Next day' })).toBeEnabled();
    await page.getByRole('button', { name: 'Next day' }).click();
    await expect(page.getByRole('button', { name: 'Next day' })).toBeDisabled(); // cannot step into the future

    // Weekly + survives a refresh.
    await page.getByRole('button', { name: 'Weekly' }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Weekly' })).toHaveAttribute('aria-pressed', 'true');
    await expect(keyFigures.getByText('vs last week').first()).toBeVisible();

    // Custom range: inverted dates are rejected with guidance.
    await page.getByRole('button', { name: 'Custom' }).click();
    await page.getByLabel('From').fill('2026-12-31');
    await page.getByLabel('To').fill('2026-01-01');
    await expect(page.getByRole('alert')).toContainText('on or before');

    expect(consoleErrors).toEqual([]);
  });

  test('has no horizontal overflow on a phone-width viewport', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await installMockSupabase(page);
    await page.goto('/');
    await logTodayExpense(page, 'Meals', '45', 'A very long description for a coffee and breakfast pastry at the airport');
    await page.goto('/financial-report');
    await expect(page.getByRole('heading', { name: 'Spend by category' })).toBeVisible({ timeout: 10_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    const offenders = await page.evaluate(() =>
      [...document.querySelectorAll('main *')].filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`).slice(0, 8),
    );
    expect(overflow, offenders.join('\n')).toBeLessThanOrEqual(0);
  });
});
