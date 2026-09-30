import { BellRing } from 'lucide-react';
import { usePushReminders } from '@/domains/notifications/usePushReminders';

const HELP: Record<string, string> = {
  unsupported: "This browser can't show push notifications.",
  'needs-install': 'On iPhone: tap Share → "Add to Home Screen", then open Mission Dubai from your Home Screen and come back here.',
  denied: 'Notifications are blocked. Allow them for this site in your phone or browser settings, then reopen this screen.',
};

/** Opt-in for the daily 1:00 PM and 8:00 PM "log your expenses" pushes. Hidden until the VAPID key is configured. */
export function RemindersCard() {
  const { status, isBusy, error, enable, disable } = usePushReminders();
  if (status === 'unconfigured') return null;

  return (
    <section className="space-y-2 rounded-xl border border-purple-500/30 bg-[#1A122E] p-3" aria-label="Daily reminders">
      <div className="flex items-center gap-2 text-xs font-bold text-white">
        <BellRing className="h-4 w-4 text-pink-400" aria-hidden="true" />
        Daily expense reminders
      </div>
      <p className="text-[11px] leading-relaxed text-zinc-400">A nudge at 1:00 PM and 8:00 PM (Dubai time) to log your spending.</p>

      {status === 'off' && (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={isBusy}
          className="min-h-11 w-full rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-3 text-xs font-bold text-white disabled:opacity-60"
        >
          {isBusy ? 'Turning on…' : 'Turn on reminders'}
        </button>
      )}
      {status === 'on' && (
        <div className="flex items-center justify-between gap-2">
          <span role="status" className="text-xs font-semibold text-emerald-400">
            Reminders are on
          </span>
          <button
            type="button"
            onClick={() => void disable()}
            disabled={isBusy}
            className="min-h-11 rounded-xl border border-purple-500/40 px-3 text-xs font-bold text-white disabled:opacity-60"
          >
            {isBusy ? 'Turning off…' : 'Turn off'}
          </button>
        </div>
      )}
      {HELP[status] && <p className="text-[11px] leading-relaxed text-amber-300">{HELP[status]}</p>}
      {error && (
        <p role="alert" className="text-[11px] text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
