import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useBudget, useExpenses } from '@/domains/expenses/api';
import { computeBudgetStatus } from '@/domains/expenses/overall';
import { computeDelta, filterByRange, previousRange, resolveRange, toISO } from '@/domains/expenses/reports';

/** One place that composes the (already cached) trip/budget/expense queries for the dashboard card and the detail page. */
export function useOverallAnalytics() {
  const tripQuery = useCurrentTrip();
  const budgetQuery = useBudget(tripQuery.data?.id);
  const expensesQuery = useExpenses(tripQuery.data?.id);

  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);
  const totalSpent = useMemo(() => expenses.reduce((s, e) => s + e.amount_aed, 0), [expenses]);
  const status = computeBudgetStatus(budgetQuery.data?.amount_aed, totalSpent);

  const monthComparison = useMemo(() => {
    const now = new Date();
    const current = resolveRange('monthly', now);
    const previous = previousRange('monthly', current);
    const sum = (r: typeof current) => filterByRange(expenses, r).reduce((s, e) => s + e.amount_aed, 0);
    const previousTotal = sum(previous);
    return { delta: computeDelta(sum(current), previousTotal), previousLabel: format(parseISO(previous.start), 'MMM'), hasPrevious: previousTotal > 0, todayISO: toISO(now) };
  }, [expenses]);

  return {
    trip: tripQuery.data,
    isLoading: tripQuery.isLoading || (Boolean(tripQuery.data) && (budgetQuery.isLoading || expensesQuery.isLoading)),
    isError: tripQuery.isError || budgetQuery.isError || expensesQuery.isError,
    refetch: () => {
      void tripQuery.refetch();
      void budgetQuery.refetch();
      void expensesQuery.refetch();
    },
    expenses,
    totalSpent,
    status,
    monthComparison,
  };
}
