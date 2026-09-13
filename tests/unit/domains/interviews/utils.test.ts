import { describe, expect, it } from 'vitest';
import { hoursUntilInterview, isReminderActive } from '@/domains/interviews/utils';

describe('hoursUntilInterview', () => {
  it('returns a positive count for a future interview', () => {
    const now = new Date('2026-09-13T10:00:00');
    expect(hoursUntilInterview('2026-09-14', '10:00', now)).toBe(24);
  });

  it('returns a negative count once the interview has passed', () => {
    const now = new Date('2026-09-13T10:00:00');
    expect(hoursUntilInterview('2026-09-13', '09:00', now)).toBe(-1);
  });
});

describe('isReminderActive', () => {
  const allEnabled = { reminder_24h: true, reminder_1h: true, reminder_15min: true, reminder_daily_until: true };
  const noneEnabled = { reminder_24h: false, reminder_1h: false, reminder_15min: false, reminder_daily_until: false };

  it('is never active once the interview has passed', () => {
    expect(isReminderActive(allEnabled, -0.01)).toBe(false);
  });

  it('is inactive with no enabled reminders, no matter how close', () => {
    expect(isReminderActive(noneEnabled, 0)).toBe(false);
  });

  it('activates exactly at the 24h boundary, not before', () => {
    expect(isReminderActive({ ...noneEnabled, reminder_24h: true }, 24)).toBe(true);
    expect(isReminderActive({ ...noneEnabled, reminder_24h: true }, 24.01)).toBe(false);
  });

  it('activates exactly at the 1h boundary, not before', () => {
    expect(isReminderActive({ ...noneEnabled, reminder_1h: true }, 1)).toBe(true);
    expect(isReminderActive({ ...noneEnabled, reminder_1h: true }, 1.01)).toBe(false);
  });

  it('activates exactly at the 15min (0.25h) boundary, not before', () => {
    expect(isReminderActive({ ...noneEnabled, reminder_15min: true }, 0.25)).toBe(true);
    expect(isReminderActive({ ...noneEnabled, reminder_15min: true }, 0.26)).toBe(false);
  });

  it('daily-until covers up to a week out', () => {
    expect(isReminderActive({ ...noneEnabled, reminder_daily_until: true }, 24 * 7)).toBe(true);
    expect(isReminderActive({ ...noneEnabled, reminder_daily_until: true }, 24 * 7 + 0.01)).toBe(false);
  });
});
