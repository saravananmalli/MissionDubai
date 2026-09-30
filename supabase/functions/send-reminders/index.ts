// Sends the scheduled web-push expense reminders. Invoked by pg_cron at
// 1:00 PM and 8:00 PM Dubai time (see supabase/schedule-reminders.sql).
//
// Secrets (supabase secrets set): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
// VAPID_SUBJECT (mailto:), CRON_SECRET. SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY are provided by the platform.
// Deploy with --no-verify-jwt: callers authenticate with x-cron-secret instead.

import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3';
import { getReminderMessage, isReminderSlot } from './messages.ts';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  const provided = request.headers.get('x-cron-secret') ?? '';
  if (!cronSecret || !timingSafeEqual(provided, cronSecret)) return json(401, { error: 'unauthorized' });

  const { slot } = await request.json().catch(() => ({ slot: undefined }));
  if (!isReminderSlot(slot)) return json(400, { error: 'slot must be "afternoon" or "evening"' });

  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) return json(500, { error: 'VAPID keys are not configured' });
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com', publicKey, privateKey);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: subscriptions, error } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth');
  if (error) return json(500, { error: 'could not load subscriptions' });

  const payload = JSON.stringify(getReminderMessage(slot));
  let sent = 0;
  const expired: string[] = [];

  await Promise.all(
    (subscriptions ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload, {
          TTL: 60 * 60, // an hour-late reminder is still useful; a next-day one is not
        });
        sent++;
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) expired.push(sub.id); // phone unsubscribed or reinstalled
        else console.error('push failed', status ?? 'unknown');
      }
    }),
  );

  if (expired.length > 0) await supabase.from('push_subscriptions').delete().in('id', expired);
  return json(200, { slot, sent, removed: expired.length });
});
