# MissionDubai

A personal Dubai job-hunt tracker: one trip, tracked through five guided chat flows (Travel/Visa/PG, Job Applications + Company Visits, Interviews, Expenses/Budget) and computed Analytics, across 10 mobile-first pages.

## Stack

- Vite + React 18 + TypeScript (strict), Tailwind CSS
- Supabase (Postgres + Auth + Storage) with Row Level Security on every table
- TanStack Query for server state
- A custom, reusable chat-flow engine (`src/chat-flow/`) driving 4 of the 5 domains from plain step-definition data
- Vitest + Testing Library (unit), Playwright (E2E, both against a local mock backend and against real Supabase)

## Setup

1. `npm install`
2. Create a Supabase project. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL` — Settings → API → Project URL
   - `VITE_SUPABASE_ANON_KEY` — Settings → API → **publishable/anon** key only. Never put the `service_role`/secret key in a client-side env file.

   The Map page uses Leaflet + OpenStreetMap — no API key or billing account needed.
3. Apply the migrations in `supabase/migrations/` **in order** via the Supabase SQL Editor (there's no local Supabase CLI instance yet — see Known Limitations).
4. In the Supabase dashboard, under Authentication → Sign In / Providers → Email:
   - Ensure **Email provider** is enabled.
   - For development convenience, **Confirm email** can be left off so `signUp()` returns a session immediately. **Turn this back on before any real users sign up** — see Known Limitations.
5. `npm run dev`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run lint` | ESLint (includes `jsx-a11y`) |
| `npm run typecheck` | `tsc --noEmit` for both app code and tests/e2e |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:integration` | RLS cross-user isolation test against real Supabase (see `tests/integration/README.md`) |
| `npm run test:e2e` | E2E suite — mock-backend specs (`*.mock.spec.ts`, safe to run anytime) plus real-backend specs (plain `*.spec.ts`, need Supabase reachable) |
| `npm run test:e2e:signup` | The one E2E spec that exercises real signup — run sparingly, see below |
| `npm run verify` | lint + typecheck + unit tests — the standard pre-commit gate |

## Testing strategy

Every domain has **two** E2E specs covering the same user journey:

- `*.mock.spec.ts` — runs against a local, in-memory fake of the Supabase Auth/REST/Storage endpoints (`e2e/mock-backend/mockSupabase.ts`), installed via Playwright's `page.route()`. Zero network calls, zero dependency on Supabase being reachable or rate-limited. Use these for fast, routine verification.
- `*.spec.ts` — the same journey against your real Supabase project, using one fixed, reused test account (`e2e/support/testUser.ts`) rather than signing up fresh each run, specifically to avoid Supabase's signup email-rate-limit. Each test resets that account's data first (`e2e/support/resetTestData.ts`).

`auth.spec.ts` is the sole exception: it specifically tests the signup flow itself, so it must create a real account each run. It's tagged `@signup` and excluded from the default `npm run test:e2e` — run it deliberately via `npm run test:e2e:signup`, and sparingly.

## Deploying to Vercel

1. Push this repo to GitHub (or your Git host of choice) and import it into Vercel as a new project — it auto-detects the Vite framework preset.
2. In Vercel's Project Settings → Environment Variables, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — the same values as your `.env.local`, for Production/Preview/Development as needed.
3. `vercel.json` already includes the SPA rewrite (`/* → /index.html`) so client-side routes don't 404 on refresh or direct navigation — no extra config needed.
4. Before going live with real users: turn **Confirm email** back on in Supabase Auth settings (see Known Limitations), and rotate any Supabase key that was ever pasted somewhere it shouldn't have been.

## Known limitations

- **No local Supabase CLI instance.** Migrations are applied manually via the SQL Editor; `test:integration` and the real-backend E2E specs run against your live cloud project. Setting up `supabase start` (needs Docker) would remove this dependency entirely — deferred because it wasn't available in this environment.
- **"Confirm email" is off** for development convenience. Must be re-enabled before real users sign up, or anyone can create an account with someone else's email address.
- **No true offline mode.** A network failure blocks submission with a retry prompt rather than queueing the write for later.
- **No OS-level push notifications** for interview reminders — in-app banners only, computed from the interview's date/time minus configured offsets (`domains/interviews/utils.ts`).
- **No "update existing application" merge UX.** Applying to a company you've already applied to is rejected with a clear message, not a raw database error, but there's no in-app flow yet to edit the existing record from that point.
- **Map page renders a live Leaflet/OpenStreetMap map (no API key needed), but no chat flow captures coordinates yet.** PG and company-visit `lat`/`lng` columns exist in the schema but nothing populates them, so the map currently just centers on Dubai with no markers. Adding a "use my current location" step (via the browser Geolocation API — still no external service required) to the Travel and Company Visit flows would close this gap.
- **Multi-insert flows aren't transactional.** Travel intake and expense-with-receipt each perform 2-3 sequential inserts with no surrounding DB transaction (Supabase's REST API has none without a Postgres RPC function). A failure partway through, followed by a retry with unchanged answers, is not deduplicated.
- **Analytics intentionally omits** the product doc's "Shortlisted" funnel stage and "Expected Payback"/"ROI" figures — there's no real signal in the data model for the former, and the latter would be fabricated precision rather than a computed fact.
