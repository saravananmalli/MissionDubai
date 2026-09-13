import { describe, expect, it } from 'vitest';
import { computeBurnRate, getBudgetAlertLevel } from '@/domains/expenses/utils';

describe('getBudgetAlertLevel', () => {
  it('is ok just below the warning threshold', () => {
    expect(getBudgetAlertLevel(79.99)).toBe('ok');
  });

  it('crosses into warning exactly at 80%', () => {
    expect(getBudgetAlertLevel(80)).toBe('warning');
  });

  it('stays warning just below the danger threshold', () => {
    expect(getBudgetAlertLevel(89.99)).toBe('warning');
  });

  it('crosses into danger exactly at 90%', () => {
    expect(getBudgetAlertLevel(90)).toBe('danger');
  });

  it('stays danger just below 100%', () => {
    expect(getBudgetAlertLevel(99.99)).toBe('danger');
  });

  it('is exceeded exactly at 100% and beyond', () => {
    expect(getBudgetAlertLevel(100)).toBe('exceeded');
    expect(getBudgetAlertLevel(150)).toBe('exceeded');
  });
});

describe('computeBurnRate', () => {
  it('matches the product doc\'s worked example', () => {
    // Spent 2,000 over 20 days elapsed, 10,000 budget, 45 days remaining.
    const result = computeBurnRate(2000, 10_000, 20, 45);
    expect(result.dailyAverageAed).toBe(100);
    expect(result.estimatedRemainingAed).toBe(10_000 - 2000 - 100 * 45); // 3,500
    expect(result.willBudgetLast).toBe(true);
  });

  it('flags the budget as not lasting when projected spend exceeds it', () => {
    const result = computeBurnRate(9000, 10_000, 10, 45);
    expect(result.willBudgetLast).toBe(false);
  });

  it('counts exactly zero estimated remaining as still lasting (boundary is inclusive)', () => {
    // 1,000 spent over 10 days = 100/day; 90 days remaining -> projects 9,000
    // more spend; 10,000 - 1,000 - 9,000 = exactly 0.
    const result = computeBurnRate(1000, 10_000, 10, 90);
    expect(result.estimatedRemainingAed).toBe(0);
    expect(result.willBudgetLast).toBe(true);
  });

  it('treats zero elapsed days as zero daily average rather than dividing by zero', () => {
    const result = computeBurnRate(0, 10_000, 0, 60);
    expect(result.dailyAverageAed).toBe(0);
    expect(Number.isFinite(result.estimatedRemainingAed)).toBe(true);
    expect(result.willBudgetLast).toBe(true);
  });

  it('never projects negative remaining days as adding spend', () => {
    const result = computeBurnRate(1000, 10_000, 10, -5);
    expect(result.estimatedRemainingAed).toBe(10_000 - 1000);
  });
});
