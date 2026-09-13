export type BudgetAlertLevel = 'ok' | 'warning' | 'danger' | 'exceeded';

/** 80/90/100% thresholds, fixed per the product doc (not user-configurable). */
export function getBudgetAlertLevel(percentUsed: number): BudgetAlertLevel {
  if (percentUsed >= 100) return 'exceeded';
  if (percentUsed >= 90) return 'danger';
  if (percentUsed >= 80) return 'warning';
  return 'ok';
}

export interface BurnRateResult {
  dailyAverageAed: number;
  estimatedRemainingAed: number;
  willBudgetLast: boolean;
}

/**
 * Projects whether the budget will last the rest of the trip, assuming
 * spending continues at the same daily average observed so far.
 */
export function computeBurnRate(
  totalSpentAed: number,
  budgetAed: number,
  daysElapsed: number,
  daysRemaining: number,
): BurnRateResult {
  const dailyAverageAed = daysElapsed > 0 ? totalSpentAed / daysElapsed : 0;
  const projectedRemainingSpend = dailyAverageAed * Math.max(daysRemaining, 0);
  const estimatedRemainingAed = budgetAed - totalSpentAed - projectedRemainingSpend;
  return { dailyAverageAed, estimatedRemainingAed, willBudgetLast: estimatedRemainingAed >= 0 };
}
