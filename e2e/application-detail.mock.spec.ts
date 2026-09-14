import { test, expect } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

// Verifies the Agent 2 lifecycle expansion end-to-end against the local mock
// backend: unlimited labeled interview rounds, follow-ups, resume tracking,
// and the status/final-outcome split all live on the new Application Detail
// page and must actually work together, not just compile.

test.describe('application detail page (mock backend)', () => {
  test('rounds, follow-ups, resume tracking, and final outcome all update the same application', async ({ page }) => {
    await installMockSupabase(page);

    const email = `mock-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct horse battery staple');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });

    await page.goto('/applications');
    await page.getByRole('button', { name: '+ Add Application' }).click();
    await page.getByRole('button', { name: 'LinkedIn' }).click();
    await page.getByLabel('Company name?').fill('Tech Corp UAE');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByLabel('Position title?').fill('Senior Developer');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Skip' }).click(); // location
    await page.getByRole('button', { name: "Skip - I'll update later" }).click();
    await page.getByRole('button', { name: 'Skip - I need to ask' }).click();
    // No dedicated card for it on this page anymore — it shows up in "Applied — Awaiting Response" instead.
    await expect(page.getByRole('link', { name: /Tech Corp UAE/ })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('link', { name: /Tech Corp UAE/ }).click();
    await expect(page.getByRole('heading', { name: 'Interview Rounds' })).toBeVisible();
    await expect(page.getByText('No interview rounds yet.')).toBeVisible();

    // Round 1
    await page.getByRole('button', { name: 'Add Interview' }).click();
    await page.getByRole('button', { name: 'Today' }).click();
    await page.getByLabel('Time?').fill('10:00');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'HR Screening' }).click();
    await page.getByRole('button', { name: 'Skip' }).first().click(); // interviewer name
    await page.getByRole('button', { name: 'Skip' }).first().click(); // interviewer role
    await page.getByRole('button', { name: 'Skip' }).click(); // meeting link
    await page.getByRole('button', { name: 'Confirm' }).click(); // reminders
    await expect(page.getByRole('link', { name: /Round 1/ })).toBeVisible({ timeout: 10_000 });

    // Round 2 — unlimited rounds, numbered automatically.
    await page.getByRole('button', { name: 'Add Interview' }).click();
    await page.getByRole('button', { name: 'Today' }).click();
    await page.getByLabel('Time?').fill('14:00');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Technical' }).click();
    await page.getByRole('button', { name: 'Skip' }).first().click();
    await page.getByRole('button', { name: 'Skip' }).first().click();
    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click();
    await expect(page.getByRole('link', { name: /Round 2/ })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('link', { name: /Round 1/ })).toBeVisible();

    // Follow-up
    await page.getByRole('button', { name: 'Add Follow-up' }).click();
    await page.getByRole('button', { name: 'Follow up today' }).click();
    await expect(page.getByText(/Follow-up scheduled/)).toBeVisible({ timeout: 10_000 });

    // Resume tracking
    await page.getByRole('button', { name: 'Resume' }).click();
    await page.getByRole('button', { name: 'Submitted', exact: true }).click();
    await page.getByRole('button', { name: 'Skip' }).click(); // resume version
    await page.getByRole('button', { name: 'Today' }).click(); // submitted date
    await page.getByRole('button', { name: 'Yes' }).click(); // cover letter
    await page.getByRole('button', { name: 'Skip' }).click(); // application URL
    await expect(page.getByText('Status: submitted', { exact: true })).toBeVisible({ timeout: 10_000 });

    // Final outcome distinguishes "company rejected" from "candidate rejected".
    // Scoped to the header card: "rejected" alone would also match a status button further down the page.
    const headerCard = page.locator('section', { has: page.getByRole('heading', { name: 'Tech Corp UAE' }) });
    await page.getByRole('button', { name: 'Set Final Outcome' }).click();
    // Scoped to the flow's own quick-tap group: the "Update Status" card further down the page also has a lowercase "rejected" button.
    await page.getByRole('group', { name: 'What happened with this application?' }).getByRole('button', { name: 'Rejected' }).click();
    await page.getByRole('button', { name: 'Company rejected me' }).click();
    await expect(headerCard.getByText('company rejected')).toBeVisible({ timeout: 10_000 });
    await expect(headerCard.getByText('rejected', { exact: true })).toBeVisible();

    // The full journey is reflected in the real, derived Timeline — nothing here is fabricated.
    await expect(page.getByText(/Application to Tech Corp UAE added/)).toBeVisible();
    await expect(page.getByText(/Round 1 — hr screening scheduled/)).toBeVisible();
    await expect(page.getByText(/Round 2 — technical scheduled/)).toBeVisible();
  });
});
