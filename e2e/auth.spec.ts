import { test, expect } from '@playwright/test';
import { signUpFreshUser } from './support/auth';

// Requires: 0001_init.sql applied, and "Confirm email" disabled on the Supabase
// project (dev-only setting — must be re-enabled before production, see plan's
// Known Limitations).
//
// Tagged @signup and excluded from the default `npm run test:e2e` (see
// package.json) because, unlike every other E2E spec, this one must call
// signUp() with a brand-new email to actually test the signup flow — it
// can't reuse the one fixed test account the rest of the suite shares. Run it
// deliberately and sparingly with `npm run test:e2e:signup`, since Supabase's
// email-send rate limit counts every signUp() call.

test.describe('auth journey', { tag: '@signup' }, () => {
  test('signup -> redirected to dashboard -> logout -> protected route redirects to login', async ({ page }) => {
    // signUpFreshUser already asserts the Pulse heading is reached (email
    // confirmation off -> signUp() returns a session immediately).
    const { email, password } = await signUpFreshUser(page);
    // The Pulse header shows a display name derived from the email's local
    // part (the raw email itself is kept sr-only, per the approved design) —
    // this still confirms the right account landed on the right screen.
    const localPart = email.split('@')[0]!;
    const displayName = localPart.charAt(0).toUpperCase() + localPart.slice(1);
    await expect(page.getByText(displayName)).toBeVisible();

    await page.getByRole('button', { name: /log out/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Direct nav to a protected route while logged out redirects to /login,
    // remembering where the user was headed (login will send them back there).
    await page.goto('/expenses');
    await expect(page).toHaveURL(/\/login$/);

    // Log back in with the same credentials. This lands back on /expenses
    // (the page we were redirected from), not the dashboard — that's the
    // intended "return to where you were headed" behavior.
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('heading', { name: /financial pulse/i })).toBeVisible({ timeout: 10_000 });

    // Session persists across a full reload, and across navigating to another
    // protected page directly.
    await page.reload();
    await expect(page.getByRole('heading', { name: /financial pulse/i })).toBeVisible({ timeout: 10_000 });

    await page.goto('/');
    await expect(page.getByRole('heading', { name: /your dubai mission/i, level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(displayName)).toBeVisible();
  });
});
