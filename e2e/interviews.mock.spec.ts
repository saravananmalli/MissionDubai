import { test, expect } from '@playwright/test';
import { installMockSupabase } from './mock-backend/mockSupabase';

// Verifies the Interview scheduling + post-interview feedback flow's UI/logic
// against the local mock backend — no real network calls.

test.describe('interviews (mock backend)', () => {
  test('scheduling an interview shows it on the calendar; feedback updates the outcome', async ({ page }) => {
    await installMockSupabase(page);

    const email = `mock-${Date.now()}@example.com`;
    await page.goto('/signup');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('correct horse battery staple');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });

    // Need an application to schedule an interview against.
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
    // No dedicated card for it on this page anymore — it shows up in "Applied — Awaiting Response" instead.
    await expect(page.getByRole('link', { name: /Tech Corp UAE/ })).toBeVisible({ timeout: 10_000 });

    await page.goto('/interviews');
    await page.getByRole('button', { name: '+ Schedule Interview' }).click();
    await page.getByRole('button', { name: 'Tech Corp UAE' }).click();
    await page.getByRole('button', { name: 'Today' }).click();
    await page.getByLabel('Time?').fill('14:00');
    await page.getByRole('button', { name: 'Send' }).click();
    await page.getByRole('button', { name: 'Video' }).click();
    await page.getByRole('button', { name: 'Skip' }).first().click(); // interviewer name
    await page.getByRole('button', { name: 'Skip' }).first().click(); // interviewer role
    await page.getByRole('button', { name: 'Skip' }).click(); // meeting link
    await page.getByRole('button', { name: 'Confirm' }).click(); // reminders, all default-selected

    await expect(page.getByRole('heading', { name: 'Tech Corp UAE' }).last()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/video/i)).toBeVisible();

    await page.getByRole('link', { name: /Tech Corp UAE/ }).click();
    await expect(page.getByRole('heading', { name: 'Interview Details & Prep' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '📚 Research Company' })).toBeVisible();

    await page.getByRole('button', { name: 'Log Post-Interview Feedback' }).click();
    await page.getByRole('button', { name: 'Very Good' }).click();
    await page.getByRole('button', { name: 'Confirm' }).click(); // confidence slider default
    await page.getByRole('button', { name: 'Skip' }).click(); // notes

    await expect(page.getByText('very good')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Confidence: \d+\/10/)).toBeVisible();
  });
});
