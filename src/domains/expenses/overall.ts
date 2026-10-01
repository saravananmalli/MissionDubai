import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { Expense } from '@/domains/expenses/api';
import { getBudgetAlertLevel, type BudgetAlertLevel } from '@/domains/expenses/utils';
import type { ExpenseCategory } from '@/lib/database.types';
import { CATEGORY_LABELS } from '@/domains/expenses/categories';

export interface BudgetStatus {
  budget: number;
  spent: number;
  /** Negative when over budget. */
  remaining: number;
  overBy: number;
  /** Unrounded; callers format it. Can exceed 100. */
  percentUsed: number;
  level: BudgetAlertLevel;
}

/** Returns null when no budget (or a zero budget) is set, so callers show a "set a budget" prompt instead of 0%/NaN. */
export function computeBudgetStatus(budgetAmount: number | null | undefined, spent: number): BudgetStatus | null {
  if (!budgetAmount || budgetAmount <= 0) return null;
  const percentUsed = (spent / budgetAmount) * 100;
  return {
    budget: budgetAmount,
    spent,
    remaining: budgetAmount - spent,
    overBy: Math.max(0, spent - budgetAmount),
    percentUsed,
    level: getBudgetAlertLevel(percentUsed),
  };
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export interface CategoryRow {
  category: ExpenseCategory;
  label: string;
  total: number;
  share: number;
  count: number;
}

/** Every supported category is returned (zero-spend ones last) so the user sees the full set, not just what they happened to use. */
export function categoryRows(expenses: Expense[]): CategoryRow[] {
  const grand = expenses.reduce((s, e) => s + e.amount_aed, 0);
  const rows = (Object.keys(CATEGORY_LABELS) as ExpenseCategory[]).map((category) => {
    const inCat = expenses.filter((e) => e.category === category);
    const total = inCat.reduce((s, e) => s + e.amount_aed, 0);
    return { category, label: CATEGORY_LABELS[category], total, share: grand > 0 ? (total / grand) * 100 : 0, count: inCat.length };
  });
  return rows.sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
}

/** Average over the days from the first expense to today (inclusive), never fewer than one day. */
export function averageDailySpend(expenses: Expense[], todayISO: string): number {
  if (expenses.length === 0) return 0;
  const first = expenses.reduce((min, e) => (e.expense_date < min ? e.expense_date : min), expenses[0]!.expense_date);
  const days = Math.max(1, differenceInCalendarDays(parseISO(todayISO), parseISO(first)) + 1);
  return expenses.reduce((s, e) => s + e.amount_aed, 0) / days;
}
