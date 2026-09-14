import { test, expect } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

// Verifies the "Specialized Mission Agents" hub + its per-agent detail pages
// against the local mock backend: (1) a fresh account shows honest empty
// states with a back button and real CTAs, no dead ends; (2) once real
// applications + offers exist, tapping into Scout Radar / Arbitration shows
// the same numbers Analytics/Applications show, with zero fabricated
// confidence scores — only real derived data ever appears.

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
  await page.getByRole('button', { name: 'NO' }).click(); // visa sponsorship
  await page.getByRole('button', { name: 'Skip' }).click(); // location
  await page.getByRole('button', { name: growth }).click();
}

async function signUp(page: import('@playwright/test').Page) {
  const email = `mock-${Date.now()}@example.com`;
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('button', { name: /sign up/i }).click();
  await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });
}

test.describe('Specialized Mission Agents (mock backend)', () => {
  test('a fresh account gets a real header, honest empty states, and a working back button', async ({ page }) => {
    await installMockSupabase(page);
    await signUp(page);

    await page.goto('/agents');
    await expect(page.getByRole('heading', { name: 'Specialized Mission Agents', level: 1 })).toBeVisible();
    // Same identity header as the home page — brand, notifications, logout.
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

    // Tapping the Basecamp tile opens its own detail page with a back button.
    await page.getByRole('link', { name: /Basecamp/ }).click();
    await expect(page).toHaveURL(/\/agents\/basecamp$/);
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(page.getByText('No accommodation logged yet.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Manage Lease' })).toHaveAttribute('href', '/travel');

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/agents$/);

    // Arbitration's empty state links onward for real, no dead end.
    await page.getByRole('link', { name: /Arbitration/ }).click();
    await expect(page.getByText('No offers yet — keep applying.')).toBeVisible();
    await page.getByRole('link', { name: 'Keep Applying' }).click();
    await expect(page).toHaveURL(/\/applications$/);
  });

  test('Scout Radar and Arbitration detail pages mirror real Applications/Analytics data, with zero fabricated numbers', async ({ page }) => {
    await installMockSupabase(page);
    await signUp(page);

    await page.goto('/applications');
    await addLinkedInApplication(page, 'Tech Corp UAE', 'Senior Developer');
    await addLinkedInApplication(page, 'Emirates Tech', 'Product Manager');

    await page.goto('/analytics');
    await addOffer(page, 'Tech Corp UAE', '220000', 'High');
    await expect(page.getByText('Tech Corp UAE: 220,000 AED')).toBeVisible({ timeout: 10_000 });
    await addOffer(page, 'Emirates Tech', '200000', 'Medium');
    await expect(page.getByText('Emirates Tech: 200,000 AED')).toBeVisible({ timeout: 10_000 });

    await page.goto('/agents');
    await expect(page.getByText(/2 leads · 0 interviewed · 2 offered/)).toBeVisible();

    await page.getByRole('link', { name: /Scout Radar/ }).click();
    await expect(page).toHaveURL(/\/agents\/scout-radar$/);
    await expect(page.getByRole('link', { name: /View Pipeline \(2\)/ })).toHaveAttribute('href', '/applications');

    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('link', { name: /Arbitration/ }).click();
    await expect(page).toHaveURL(/\/agents\/arbitration$/);

    // Real offers and real recommendation reasons — never a fabricated confidence percentage.
    await expect(page.getByText('Tech Corp UAE')).toBeVisible();
    await expect(page.getByText('220,000 AED')).toBeVisible();
    await expect(page.getByText('Emirates Tech')).toBeVisible();
    await expect(page.getByText('200,000 AED')).toBeVisible();
    await expect(page.getByText('RECOMMENDED')).toBeVisible();
    await expect(page.getByText(/Why: Higher salary/)).toBeVisible();
    await expect(page.getByText(/confidence/i)).toHaveCount(0);
    await expect(page.getByText(/94%/)).toHaveCount(0);
  });

  test('voice affordances are genuinely disabled, not fake-interactive', async ({ page }) => {
    await installMockSupabase(page);
    await signUp(page);

    await page.goto('/agents');
    await expect(page.getByRole('button', { name: /Command All Agents/ })).toBeDisabled();

    await page.getByRole('link', { name: /Voice Copilot/ }).click();
    await expect(page.getByRole('button', { name: 'Open Simulator' })).toBeDisabled();
  });
});
