# Daily expense reminders (web push, 1:00 PM and 8:00 PM Dubai time)

Two pushes every day, always sent: **"Don't forget to log your expenses today."** at 1:00 PM and
**"Spent anything today? Log your expenses before the day ends."** at 8:00 PM. Tapping the notification
(or its **Log Expense** button on Android/desktop) opens `/expenses?add=1`, which lands straight in the log flow.

## How it fits together
- `public/sw.js` — service worker: shows the push, opens the link on tap. No caching.
- `public/manifest.webmanifest` + icons — makes the site installable (required for iPhone push).
- `src/domains/notifications/` + `src/components/RemindersCard.tsx` — the "Turn on reminders" button in the bell drawer.
- `supabase/migrations/0009_push_subscriptions.sql` — stores each phone's subscription (RLS: only the owner).
- `supabase/functions/send-reminders/` — Edge Function that sends the pushes (`web-push`).
- `supabase/schedule-reminders.sql` — two `pg_cron` jobs: 09:00 UTC (1 PM) and 16:00 UTC (8 PM). Dubai has no DST.

## One-time setup (needs your Supabase + Vercel access)
The keys were generated locally into `.env.local` (gitignored): `VITE_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`.
The private key and cron secret must never go in a `VITE_*` variable or git.

1. **Migration** — run `supabase/migrations/0009_push_subscriptions.sql` in the Supabase SQL Editor.
2. **Secrets + deploy** (Supabase CLI, logged in and linked with `supabase link --project-ref <ref>`):
   ```sh
   set -a; . ./.env.local; set +a
   supabase secrets set VAPID_PUBLIC_KEY="$VITE_VAPID_PUBLIC_KEY" VAPID_PRIVATE_KEY="$VAPID_PRIVATE_KEY" \
     CRON_SECRET="$CRON_SECRET" VAPID_SUBJECT="mailto:you@example.com"
   supabase functions deploy send-reminders --no-verify-jwt
   ```
   (Do not use `--env-file .env.local`: that would upload your account password too.)
3. **Vercel** — add `VITE_VAPID_PUBLIC_KEY` (same value as in `.env.local`) under Environment Variables and redeploy.
4. **Schedule** — open `supabase/schedule-reminders.sql`, replace `<PROJECT_REF>` and `<CRON_SECRET>` in the SQL Editor
   copy (don't commit them) and run it. Confirm with `select jobname, schedule from cron.job;`.
5. **On your phone** — open https://mission-dubai.vercel.app/ .
   - **iPhone:** Share → *Add to Home Screen*, then open it from the Home Screen (iOS 16.4+; push does not work in a normal Safari tab).
   - **Android:** works in Chrome, or install via *Add to Home screen*.
   - Tap the bell → **Turn on reminders** → Allow. You get an immediate "Reminders are on" confirmation.
6. **Test the server path now** instead of waiting for 1 PM:
   ```sh
   curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders \
     -H "x-cron-secret: $CRON_SECRET" -H "Content-Type: application/json" -d '{"slot":"afternoon"}'
   ```
   Expect `{"slot":"afternoon","sent":1,"removed":0}` and a notification on your phone.

## Limits and notes
- Pushes can arrive a few minutes late; the phone's OS controls delivery. `TTL` is 1 hour, so a push that can't be
  delivered within an hour is dropped rather than arriving stale.
- Every subscribed device gets both pushes. Turning reminders off (bell → Turn off) removes that device.
- Expired subscriptions (reinstalled app, revoked permission) are deleted automatically on the next send.
- The action button is not shown on iPhone; tapping the notification body does the same thing.
- The deployed site is public and the personal-account password is bundled in its JavaScript (see README) — protect the
  Vercel deployment before relying on this long-term.
