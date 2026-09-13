import { describe, expect, it } from 'vitest';
import { daysUntil } from '@/domains/travel/utils';

describe('daysUntil', () => {
  const from = new Date('2026-09-13T15:30:00');

  it('returns 0 for today', () => {
    expect(daysUntil('2026-09-13', from)).toBe(0);
  });

  it('returns a positive count for a future date', () => {
    expect(daysUntil('2026-10-19', from)).toBe(36);
  });

  it('returns a negative count for a past date', () => {
    expect(daysUntil('2026-09-01', from)).toBe(-12);
  });

  it('ignores time-of-day on both ends', () => {
    expect(daysUntil('2026-09-14', new Date('2026-09-13T23:59:00'))).toBe(1);
  });
});
