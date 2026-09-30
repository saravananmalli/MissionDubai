-- Run ONCE in the Supabase SQL Editor after deploying the send-reminders
-- function. Replace the three placeholders first; do NOT commit real values.
--   <PROJECT_REF>   e.g. abcdefghijklmnop (from your Supabase URL)
--   <CRON_SECRET>   the same value you set with `supabase secrets set CRON_SECRET=...`
-- Dubai is UTC+4 all year (no daylight saving): 1:00 PM = 09:00 UTC, 8:00 PM = 16:00 UTC.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'expense-reminder-1pm',
  '0 9 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
       headers := '{"Content-Type": "application/json", "x-cron-secret": "<CRON_SECRET>"}'::jsonb,
       body := '{"slot": "afternoon"}'::jsonb
     ) $$
);

select cron.schedule(
  'expense-reminder-8pm',
  '0 16 * * *',
  $$ select net.http_post(
       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
       headers := '{"Content-Type": "application/json", "x-cron-secret": "<CRON_SECRET>"}'::jsonb,
       body := '{"slot": "evening"}'::jsonb
     ) $$
);

-- Check:   select jobname, schedule from cron.job;
-- Remove:  select cron.unschedule('expense-reminder-1pm'); select cron.unschedule('expense-reminder-8pm');
