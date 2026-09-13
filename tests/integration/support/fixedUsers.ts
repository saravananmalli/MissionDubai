import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Two fixed, reused accounts instead of signing up fresh users per test run —
// RLS testing inherently needs two distinct users, but each only needs to be
// created once, ever. Every run after that is a plain login, consuming no
// signup-rate-limit quota. Separate from the E2E suite's fixed account so the
// two test tracks never race on the same rows.
export const RLS_FIXED_USER_A = { email: 'rls-fixed-user-a@example.com', password: 'correct horse battery staple' };
export const RLS_FIXED_USER_B = { email: 'rls-fixed-user-b@example.com', password: 'correct horse battery staple' };

function freshClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY must be set (see .env.local) to run integration tests.');
  }
  return createClient(url, anonKey);
}

/** Logs in with the given fixed credentials, signing them up once if the account doesn't exist yet. */
export async function signInOrSignUpFixed(credentials: {
  email: string;
  password: string;
}): Promise<{ client: SupabaseClient; userId: string }> {
  const client = freshClient();
  const signIn = await client.auth.signInWithPassword(credentials);
  if (!signIn.error && signIn.data.user) {
    return { client, userId: signIn.data.user.id };
  }

  const signUp = await client.auth.signUp(credentials);
  if (signUp.error) throw signUp.error;
  if (!signUp.data.user || !signUp.data.session) {
    throw new Error('signUp did not return a session — is "Confirm email" still enabled on this Supabase project?');
  }
  return { client, userId: signUp.data.user.id };
}

/** Deletes all of this client's trips (cascades to every trip-scoped table) so each run starts clean. */
export async function resetTrips(client: SupabaseClient): Promise<void> {
  const { error } = await client.from('trips').delete().not('id', 'is', null);
  if (error) throw error;
}
