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

// Same cross-user isolation property, exercised on the two tables added for
// the Agent 2 lifecycle expansion (0008_agent2_lifecycle.sql). Both hang off
// an `applications` row via `application_id`, same flat per-row RLS pattern
// as every other child table in this schema.
describe('Row Level Security: cross-user isolation on application_events and follow_ups', () => {
  it("prevents user B from reading or spoof-inserting into user A's application_events/follow_ups", async () => {
    const userA = await signInOrSignUpFixed(RLS_FIXED_USER_A);
    const userB = await signInOrSignUpFixed(RLS_FIXED_USER_B);
    await resetTrips(userA.client);
    await resetTrips(userB.client);

    const { data: trip, error: tripError } = await userA.client
      .from('trips')
      .insert({ label: 'User A private trip', start_date: '2026-01-01' })
      .select()
      .single();
    expect(tripError).toBeNull();

    const { data: application, error: applicationError } = await userA.client
      .from('applications')
      .insert({ trip_id: trip!.id, company_name: 'RLS Test Co', position_title: 'Engineer', source: 'linkedin' })
      .select()
      .single();
    expect(applicationError).toBeNull();

    const { data: insertedEvent, error: eventInsertError } = await userA.client
      .from('application_events')
      .insert({ application_id: application!.id, event_type: 'note_added', description: 'Test event' })
      .select()
      .single();
    expect(eventInsertError).toBeNull();
    expect(insertedEvent?.user_id).toBe(userA.userId);

    const { data: insertedFollowUp, error: followUpInsertError } = await userA.client
      .from('follow_ups')
      .insert({ application_id: application!.id, due_date: '2026-02-01' })
      .select()
      .single();
    expect(followUpInsertError).toBeNull();
    expect(insertedFollowUp?.user_id).toBe(userA.userId);

    // User B's reads must NOT include any of user A's rows.
    const { data: otherEvents, error: crossEventReadError } = await userB.client.from('application_events').select('*');
    expect(crossEventReadError).toBeNull();
    expect(otherEvents).toEqual([]);

    const { data: otherFollowUps, error: crossFollowUpReadError } = await userB.client.from('follow_ups').select('*');
    expect(crossFollowUpReadError).toBeNull();
    expect(otherFollowUps).toEqual([]);

    // Spoofed inserts: user B explicitly claims user A's id as the owner.
    const { error: spoofEventError } = await userB.client
      .from('application_events')
      .insert({ application_id: application!.id, event_type: 'note_added', description: 'Spoofed', user_id: userA.userId });
    expect(spoofEventError).not.toBeNull();

    const { error: spoofFollowUpError } = await userB.client
      .from('follow_ups')
      .insert({ application_id: application!.id, due_date: '2026-02-01', user_id: userA.userId });
    expect(spoofFollowUpError).not.toBeNull();
  });
});
