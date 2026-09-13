import { FIXED_TEST_EMAIL, FIXED_TEST_PASSWORD } from './testUser';

/**
 * Deletes the fixed test account's trips (cascades to flights, visas,
 * accommodations, and every future domain table hung off trip_id) so each
 * E2E run starts from a clean slate despite reusing the same account.
 *
 * Uses plain fetch() against Supabase's REST/Auth HTTP API directly, rather
 * than importing @supabase/supabase-js here: that package (via its auth-js
 * dependency's newer WebAuthn support, which has a circular import) crashes
 * Playwright's Node-side test loader with "Unexpected module status 3" — a
 * Playwright/Node loader bug, not an app bug (Vitest loads the same package
 * fine; see tests/integration/support/fixedUsers.ts). Plain fetch avoids it.
 */
export async function resetFixedUserData(): Promise<void> {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY must be set (see .env.local) to reset E2E test data.');
  }

  const signInResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: FIXED_TEST_EMAIL, password: FIXED_TEST_PASSWORD }),
  });

  if (!signInResponse.ok) {
    // Fixed account doesn't exist yet (first run ever) — nothing to reset.
    return;
  }

  const { access_token: accessToken } = (await signInResponse.json()) as { access_token: string };

  const deleteResponse = await fetch(`${url}/rest/v1/trips?id=not.is.null`, {
    method: 'DELETE',
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
  });

  if (!deleteResponse.ok) {
    throw new Error(`Failed to reset fixed test user's trips: ${deleteResponse.status} ${await deleteResponse.text()}`);
  }
}
