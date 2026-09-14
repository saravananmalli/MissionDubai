import { test, expect } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

// Verifies the single-page "Specialized Mission Agents" matrix (matching the
// code-sample layout) against the local mock backend: every navigation
// button is a real, working link, and the voice buttons open a genuinely
// interactive Mission Copilot modal grounded in the user's real data — never
// a disabled placeholder and never a fabricated confidence score.

async function addLinkedInApplication(page: import('@playwright/test').Page, company: string, position: string) {
  await page.getByRole('button', { name: '+ Add Application' }).click();
  await page.getByRole('button', { name: 'LinkedIn' }).click();
  await page.getByLabel('Company name?').fill(company);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByLabel('Position title?').fill(position);
  await page.getByRole('button', { name: 'Send' }).click();
  await page.getByRole('button', { name: 'Skip' }).click(); // location, optional
  await page.getByRole('button', { name: "Skip - I'll update later" }).click();
  await page.getByRole('button', { name: 'Skip - I need to ask' }).click();
  // No dedicated card for it on this page anymore — it shows up in "Applied — Awaiting Response" instead.
  await expect(page.getByRole('link', { name: new RegExp(company) })).toBeVisible({ timeout: 10_000 });
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

async function signUp(page: import('@playwright/test').Page) {
  const email = `mock-${Date.now()}@example.com`;
  await page.goto('/signup');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('correct horse battery staple');
  await page.getByRole('button', { name: /sign up/i }).click();
  await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });
}

test.describe('Specialized Mission Agents (mock backend)', () => {
  test('a fresh account shows honest empty states, and every button is a real, working action', async ({ page }) => {
    await installMockSupabase(page);
    await signUp(page);

    await page.goto('/agents');
    await expect(page.getByRole('heading', { name: 'Specialized Mission Agents', level: 1 })).toBeVisible();
    await expect(page.getByText('No accommodation logged yet.')).toBeVisible();
    await expect(page.getByText('No offers yet — keep applying.')).toBeVisible();

    // Basecamp is a single button — both "Manage Rent" and "Visa & Residency" would land on the same Travel page anyway.
    await page.getByRole('link', { name: 'Manage Rent & Visa' }).click();
    await expect(page).toHaveURL(/\/travel$/);

    await page.goto('/agents');

    // The hero voice button opens a genuinely interactive modal, not a disabled placeholder.
    const commandAll = page.getByRole('button', { name: /Command All Agents/ });
    await expect(commandAll).toBeEnabled();
    await commandAll.click();
    await expect(page.getByText('Mission Copilot')).toBeVisible();
    await expect(page.getByText(/Day \d+ of \d+/)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    // Voice Copilot's own voice button is active too.
    await expect(page.getByRole('button', { name: 'Open Simulator' })).toBeEnabled();
  });

  test('the Mission Copilot modal answers with real data via typed questions and quick prompts', async ({ page }) => {
    await installMockSupabase(page);
    await signUp(page);

    await page.goto('/agents');
    await page.getByRole('button', { name: 'Open Simulator' }).click();
    await expect(page.getByText('Mission Copilot')).toBeVisible();

    await page.getByLabel('Ask Copilot').fill("what's my visa status?");
    await page.getByLabel('Send').click();
    await expect(page.getByText(/No visa on file yet/)).toBeVisible();
  });

  test('Scout Radar and Arbitration cards mirror real Applications/Analytics data, with zero fabricated numbers', async ({ page }) => {
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

    await expect(page.getByRole('link', { name: /2 Opportunities/ })).toHaveAttribute('href', '/applications');
    await expect(page.getByText('Tech Corp UAE')).toBeVisible();
    await expect(page.getByText('220,000 AED')).toBeVisible();
    await expect(page.getByText('RECOMMENDED')).toBeVisible();
    await expect(page.getByText(/Why: Higher salary/)).toBeVisible();
    await expect(page.getByText(/confidence/i)).toHaveCount(0);
    await expect(page.getByText(/94%/)).toHaveCount(0);

    await expect(page.getByRole('link', { name: /Compare Offers/ })).toHaveAttribute('href', '/analytics');
    await expect(page.getByRole('link', { name: /Review & Decide/ })).toHaveAttribute('href', '/analytics#recommendation');

    // "Review & Decide" jumps to the Recommendation card, not just the top of the page.
    await page.getByRole('link', { name: /Review & Decide/ }).click();
    await expect(page.getByRole('heading', { name: 'Recommendation' })).toBeInViewport();
  });

  test("each card's two buttons lead somewhere genuinely different, with no dead ends", async ({ page }) => {
    await installMockSupabase(page);
    await signUp(page);

    await page.goto('/agents');

    // Scout Radar: "Log Application" jumps straight into the add flow instead of just the list.
    await page.getByRole('link', { name: 'Log Application' }).click();
    await expect(page).toHaveURL(/\/applications\?action=add$/);
    await expect(page.getByText("Let's add a job application! Where did you find this?")).toBeVisible();

    await page.goto('/agents');

    // Arbitration with no offers yet: "Keep Applying" and "View Pipeline" both land on Applications, but distinctly.
    await expect(page.getByRole('link', { name: 'Keep Applying' })).toHaveAttribute('href', '/applications?action=add');
    await expect(page.getByRole('link', { name: 'View Pipeline' })).toHaveAttribute('href', '/applications');
  });
});
