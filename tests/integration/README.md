# Integration tests

Run with `npm run test:integration`. These hit a real Supabase instance over
the network — the one pointed to by `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
in `.env.local` — because Row Level Security is a Postgres-level policy that a
mocked client cannot validate.

**Current limitation:** there is no local Supabase CLI instance set up yet, so
these tests run against the live cloud project. To avoid Supabase's signup
email-rate-limit, they use two fixed, reused accounts (`support/fixedUsers.ts`)
instead of signing up fresh users per run — each is signed up once, ever, and
every run after that just logs in and resets (deletes) its trips. "Confirm
email" must stay off on whichever project these run against, or `signUp`
won't return a session on that one-time first run.
