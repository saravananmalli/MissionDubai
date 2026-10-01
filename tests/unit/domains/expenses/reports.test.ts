import { describe, expect, it } from 'vitest';
import { averageDailySpend, categoryRows, computeBudgetStatus, formatPercent } from '@/domains/expenses/overall';
import type { Expense } from '@/domains/expenses/api';
import {
  breakdownBy,
  computeDelta,
  filterByRange,
  isValidRange,
  parsePeriodParams,
  itemKey,
  previousRange,
  resolveRange,
  shiftAnchor,
  summarize,
  toISO,
  trendSeries,
} from '@/domains/expenses/reports';

function exp(date: string, amount: number, extra: Partial<Expense> = {}): Expense {
  return {
    id: `${date}-${amount}`,
    user_id: 'u',
    trip_id: 't',
    category: 'meals',
    amount_aed: amount,
    expense_date: date,
    description: null,
    receipt_photo_path: null,
    location: null,
    payment_method: null,
    created_at: '2026-01-01T00:00:00Z',
    ...extra,
  };
}

describe('resolveRange / previousRange', () => {
  const anchor = new Date(2026, 9, 1); // Thu 1 Oct 2026

  it('daily is the single day, previous is yesterday', () => {
    const r = resolveRange('daily', anchor);
    expect(r).toEqual({ start: '2026-10-01', end: '2026-10-01' });
    expect(previousRange('daily', r)).toEqual({ start: '2026-09-30', end: '2026-09-30' });
  });

  it('weekly runs Mon–Sun, previous is the prior week', () => {
    const r = resolveRange('weekly', anchor);
    expect(r).toEqual({ start: '2026-09-28', end: '2026-10-04' });
    expect(previousRange('weekly', r)).toEqual({ start: '2026-09-21', end: '2026-09-27' });
  });

  it('monthly previous handles different month lengths and year boundary', () => {
    expect(previousRange('monthly', resolveRange('monthly', anchor))).toEqual({ start: '2026-09-01', end: '2026-09-30' });
    expect(previousRange('monthly', resolveRange('monthly', new Date(2026, 0, 15)))).toEqual({ start: '2025-12-01', end: '2025-12-31' });
    expect(previousRange('monthly', resolveRange('monthly', new Date(2026, 2, 31)))).toEqual({ start: '2026-02-01', end: '2026-02-28' });
  });

  it('custom previous is the same-length window ending the day before', () => {
    expect(previousRange('custom', { start: '2026-10-10', end: '2026-10-16' })).toEqual({ start: '2026-10-03', end: '2026-10-09' });
  });

  it('shiftAnchor steps months without day-overflow', () => {
    expect(shiftAnchor('monthly', new Date(2026, 0, 31), 1).getMonth()).toBe(1);
    expect(shiftAnchor('weekly', anchor, -1).getDate()).toBe(24);
  });

  it('isValidRange rejects missing and inverted ranges', () => {
    expect(isValidRange(undefined)).toBe(false);
    expect(isValidRange({ start: '2026-10-05', end: '2026-10-01' })).toBe(false);
    expect(isValidRange({ start: '2026-10-01', end: '2026-10-01' })).toBe(true);
  });
});

describe('filterByRange / summarize', () => {
  const data = [exp('2026-09-30', 50), exp('2026-10-01', 100), exp('2026-10-01', 30, { receipt_photo_path: 'p' }), exp('2026-10-02', 20)];

  it('includes both range boundaries', () => {
    expect(filterByRange(data, { start: '2026-10-01', end: '2026-10-02' })).toHaveLength(3);
  });

  it('summarises totals, average, largest, active days and receipts', () => {
    const range = { start: '2026-10-01', end: '2026-10-31' };
    const s = summarize(filterByRange(data, range), range, '2026-10-02');
    expect(s.total).toBe(150);
    expect(s.count).toBe(3);
    expect(s.averagePerTransaction).toBe(50);
    expect(s.largest?.amount_aed).toBe(100);
    expect(s.activeDays).toBe(2);
    expect(s.receiptCount).toBe(1);
    expect(s.dailyAverage).toBe(75); // 150 over 2 elapsed days, not 31
  });

  it('returns zeros for an empty period without NaN', () => {
    const range = { start: '2026-11-01', end: '2026-11-30' };
    const s = summarize([], range, '2026-10-01'); // period is in the future
    expect(s).toMatchObject({ total: 0, count: 0, averagePerTransaction: 0, dailyAverage: 0, largest: null });
  });
});

describe('computeDelta', () => {
  it('computes percent change', () => {
    expect(computeDelta(150, 100)).toEqual({ absolute: 50, percent: 50 });
    expect(computeDelta(50, 100).percent).toBe(-50);
  });
  it('has no percent when the previous period is zero', () => {
    expect(computeDelta(40, 0)).toEqual({ absolute: 40, percent: null });
    expect(computeDelta(0, 0)).toEqual({ absolute: 0, percent: null });
  });
});

describe('breakdownBy / itemKey', () => {
  it('groups, sorts desc and computes shares summing to 100', () => {
    const rows = breakdownBy([exp('2026-10-01', 75, { category: 'transport' }), exp('2026-10-01', 25), exp('2026-10-02', 0, { category: 'visa' })], (e) => e.category);
    expect(rows.map((r) => r.key)).toEqual(['transport', 'meals', 'visa']);
    expect(rows[0]?.share).toBe(75);
    expect(rows.reduce((s, r) => s + r.share, 0)).toBe(100);
  });
  it('gives 0 share (not NaN) when the total is zero', () => {
    expect(breakdownBy([exp('2026-10-01', 0)], (e) => e.category)[0]?.share).toBe(0);
  });
  it('normalises descriptions and falls back to a label', () => {
    expect(itemKey(exp('d', 1, { description: '  coFFee  shop ' }), 'Meals')).toBe('Coffee shop');
    expect(itemKey(exp('d', 1, { description: '   ' }), 'Meals')).toBe('Meals');
  });
});

describe('trendSeries', () => {
  it('fills zero-spend days and aligns the previous-period overlay by index', () => {
    const range = { start: '2026-10-05', end: '2026-10-11' };
    const prev = { start: '2026-09-28', end: '2026-10-04' };
    const all = [exp('2026-10-06', 40), exp('2026-09-29', 10)];
    const pts = trendSeries(filterByRange(all, range), range, { range: prev, expenses: filterByRange(all, prev) });
    expect(pts).toHaveLength(7);
    expect(pts[1]).toMatchObject({ date: '2026-10-06', total: 40, count: 1, previousTotal: 10 });
    expect(pts[0]?.total).toBe(0);
  });
  it('buckets by week for long custom ranges', () => {
    const range = { start: '2026-01-01', end: '2026-04-10' }; // 100 days
    const pts = trendSeries([exp('2026-01-02', 5), exp('2026-01-09', 7)], range);
    expect(pts).toHaveLength(15);
    expect(pts[0]?.total).toBe(5);
    expect(pts[1]?.total).toBe(7);
  });
});

describe('parsePeriodParams', () => {
  const today = new Date(2026, 9, 1);
  it('defaults to monthly on today for empty or garbage params', () => {
    const s = parsePeriodParams(new URLSearchParams('period=yearly&date=2026-13-45'), today);
    expect(s.preset).toBe('monthly');
    expect(toISO(s.anchor)).toBe('2026-10-01');
    expect(s.custom).toEqual({ start: '2026-09-02', end: '2026-10-01' });
  });
  it('reads a valid weekly period and custom range', () => {
    const s = parsePeriodParams(new URLSearchParams('period=custom&from=2026-09-01&to=2026-09-15&date=2026-09-10'), today);
    expect(s.preset).toBe('custom');
    expect(s.custom).toEqual({ start: '2026-09-01', end: '2026-09-15' });
    expect(toISO(s.anchor)).toBe('2026-09-10');
  });
});

describe('overall analytics helpers', () => {
  it('computes budget status with one-decimal precision inputs', () => {
    const s = computeBudgetStatus(20000, 13500);
    expect(s).toMatchObject({ remaining: 6500, overBy: 0, percentUsed: 67.5, level: 'ok' });
    expect(formatPercent(s!.percentUsed)).toBe('67.5%');
  });
  it('flags over-budget spend', () => {
    expect(computeBudgetStatus(1000, 1250)).toMatchObject({ remaining: -250, overBy: 250, percentUsed: 125, level: 'exceeded' });
  });
  it('treats exactly-spent budget as exceeded with zero overage', () => {
    expect(computeBudgetStatus(1000, 1000)).toMatchObject({ remaining: 0, overBy: 0, level: 'exceeded' });
  });
  it('returns null without a usable budget', () => {
    expect(computeBudgetStatus(null, 50)).toBeNull();
    expect(computeBudgetStatus(0, 50)).toBeNull();
  });
  it('lists every category with zero-spend ones last', () => {
    const rows = categoryRows([exp('2026-10-01', 30, { category: 'visa' }), exp('2026-10-01', 70, { category: 'flight' }), exp('2026-10-02', 0, { category: 'flight' })]);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatchObject({ category: 'flight', total: 70, share: 70, count: 2 });
    expect(rows[1]).toMatchObject({ category: 'visa', count: 1 });
    expect(rows[8]?.total).toBe(0);
    expect(categoryRows([]).every((r) => r.share === 0)).toBe(true);
  });
  it('averages daily spend from the first expense date', () => {
    expect(averageDailySpend([exp('2026-10-01', 100), exp('2026-10-04', 100)], '2026-10-05')).toBe(40);
    expect(averageDailySpend([], '2026-10-05')).toBe(0);
    expect(averageDailySpend([exp('2026-10-09', 90)], '2026-10-05')).toBe(90); // future-dated: floor at 1 day
  });
});
