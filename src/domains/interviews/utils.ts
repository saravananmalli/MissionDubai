/** Hours from `now` until the interview's date+time. Negative once it's passed. */
export function hoursUntilInterview(interviewDateISO: string, interviewTimeISO: string, now: Date = new Date()): number {
  const target = new Date(`${interviewDateISO}T${interviewTimeISO}`);
  return (target.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export interface ReminderFlags {
  reminder_24h: boolean;
  reminder_1h: boolean;
  reminder_15min: boolean;
  reminder_daily_until: boolean;
}

/**
 * In-app-banner reminder logic (no OS push notifications — see plan's Known
 * Limitations): true when at least one enabled reminder's window has opened
 * for an interview that hasn't happened yet.
 */
export function isReminderActive(flags: ReminderFlags, hoursUntil: number): boolean {
  if (hoursUntil < 0) return false;
  if (flags.reminder_15min && hoursUntil <= 0.25) return true;
  if (flags.reminder_1h && hoursUntil <= 1) return true;
  if (flags.reminder_24h && hoursUntil <= 24) return true;
  if (flags.reminder_daily_until && hoursUntil <= 24 * 7) return true;
  return false;
}
