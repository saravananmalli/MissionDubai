import { describe, expect, it } from 'vitest';
import { RLS_FIXED_USER_A, RLS_FIXED_USER_B, resetTrips, signInOrSignUpFixed } from './support/fixedUsers';

// Untyped client: src/lib/database.types.ts is still a placeholder pending
// `supabase gen types typescript`, so this test intentionally doesn't
// parametrize createClient<Database> yet.

// Proves the plan's single biggest risk is actually mitigated: RLS must stop
// user B from ever seeing or writing user A's rows. Runs against whatever
// Supabase instance VITE_SUPABASE_URL/ANON_KEY point to (see README.md in this
// folder) — real Postgres + real RLS, not mocked, because RLS is a Postgres-
// level policy a mocked client can't validate.
//
// Uses two fixed, reused accounts (see support/fixedUsers.ts) rather than
// signing up fresh users per run — each is only ever signed up once, then
// reset (trips deleted) and reused on every subsequent run, so this can be
// run as often as needed without touching Supabase's signup rate limit.

describe('Row Level Security: cross-user isolation on trips', () => {
  it("prevents user B from reading or spoof-inserting into user A's rows", async () => {
    const userA = await signInOrSignUpFixed(RLS_FIXED_USER_A);
    const userB = await signInOrSignUpFixed(RLS_FIXED_USER_B);
    await resetTrips(userA.client);
    await resetTrips(userB.client);

    const { data: insertedTrip, error: insertError } = await userA.client
      .from('trips')
      .insert({ label: 'User A private trip', start_date: '2026-01-01' })
      .select()
      .single();
    expect(insertError).toBeNull();
    expect(insertedTrip?.user_id).toBe(userA.userId);

    // Sanity check: user A can read their own row back.
    const { data: ownTrips, error: ownReadError } = await userA.client.from('trips').select('*');
    expect(ownReadError).toBeNull();
    expect(ownTrips).toHaveLength(1);

    // The actual security property: user B's read must NOT include user A's row.
    const { data: otherUsersTrips, error: crossReadError } = await userB.client.from('trips').select('*');
    expect(crossReadError).toBeNull();
    expect(otherUsersTrips).toEqual([]);

    // Spoofed insert: user B explicitly claims user A's id as the owner.
    // WITH CHECK (auth.uid() = user_id) must reject this.
    const { error: spoofError } = await userB.client
      .from('trips')
      .insert({ label: 'Spoofed trip', start_date: '2026-01-01', user_id: userA.userId });
    expect(spoofError).not.toBeNull();
  });
});
