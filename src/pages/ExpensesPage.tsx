import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Car,
  CircleDollarSign,
  Download,
  Home,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Shirt,
  Ticket,
  Utensils,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { ChatFlow } from '@/chat-flow';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { PrimaryPageHeader } from '@/components/PrimaryPageHeader';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useBudget, useExpenses, useSaveBudget, type Expense } from '@/domains/expenses/api';
import { expenseFlow } from '@/domains/expenses/flowConfig';
import { computeBurnRate, getBudgetAlertLevel } from '@/domains/expenses/utils';
import { computeJourneyProgress } from '@/domains/analytics/utils';
import type { ExpenseCategory } from '@/lib/database.types';

const CATEGORY_ICONS: Record<ExpenseCategory, LucideIcon> = {
  meals: Utensils,
  transport: Car,
  clothes: Shirt,
  shopping: ShoppingBag,
  activities: Ticket,
  pg_rent: Home,
  flight: Plane,
  visa: ShieldCheck,
  other: CircleDollarSign,
};

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  meals: 'Meals',
  transport: 'Transport',
  clothes: 'Clothes',
  shopping: 'Shopping',
  activities: 'Activities',
  pg_rent: 'PG Rent',
  flight: 'Flight',
  visa: 'Visa',
  other: 'Other',
};

const QUICK_LOG_CATEGORIES: ExpenseCategory[] = ['meals', 'transport', 'shopping', 'activities'];

const ALERT_COPY: Record<string, { text: string; className: string }> = {
  warning: { text: "You've used 80% of your budget.", className: 'text-warning' },
  danger: { text: 'Warning: 90% of budget used.', className: 'text-error' },
  exceeded: { text: 'Budget limit reached.', className: 'text-error font-semibold' },
};

function VaultRing({ percentUsed }: { percentUsed: number }) {
  const clamped = Math.min(100, Math.max(0, percentUsed));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36" role="img" aria-label={`${clamped}% of budget spent`}>
      <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" className="stroke-surface-elevated-2" />
      <circle
        cx="60"
        cy="60"
        r={radius}
        fill="none"
        stroke="url(#vault-gradient)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 60 60)"
      />
      <defs>
        <linearGradient id="vault-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8b32e8" />
          <stop offset="100%" stopColor="#f03cc6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function downloadExpensesCsv(expenses: Expense[]) {
  const header = 'Date,Category,Amount (AED),Description\n';
  const rows = expenses.map((expense) =>
    [expense.expense_date, CATEGORY_LABELS[expense.category], expense.amount_aed, expense.description ?? '']
      .map((value) => `"${String(value).replace(/"/g, '""')}"`)
      .join(','),
  );
  const blob = new Blob([header + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `mission-dubai-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function ExpensesPage() {
  const tripQuery = useCurrentTrip();
  const budgetQuery = useBudget(tripQuery.data?.id);
  const expensesQuery = useExpenses(tripQuery.data?.id);
  const saveBudgetMutation = useSaveBudget();
  const [budgetInput, setBudgetInput] = useState('');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  if (tripQuery.isLoading) {
    return (
      <>
        <PrimaryPageHeader />
        <main className="px-4 py-6">
          <p role="status">Loading…</p>
        </main>
      </>
    );
  }

  if (tripQuery.isError) {
    return (
      <>
        <PrimaryPageHeader />
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState message="Couldn't load your trip. Check your connection and try again." onRetry={() => void tripQuery.refetch()} />
        </main>
      </>
    );
  }

  const expenses = expensesQuery.data ?? [];
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount_aed, 0);
  const budgetAmount = budgetQuery.data?.amount_aed ?? 0;
  const percentUsed = budgetAmount > 0 ? Math.round((totalSpent / budgetAmount) * 100) : 0;
  const alertLevel = budgetQuery.data ? getBudgetAlertLevel(percentUsed) : 'ok';
  const alertCopy = ALERT_COPY[alertLevel];

  const trip = tripQuery.data;
  const progress = trip
    ? computeJourneyProgress(trip.start_date, trip.target_end_date ?? trip.start_date, new Date())
    : { daysElapsed: 0, daysRemaining: 0, totalDays: 0, percentComplete: 0 };
  const burnRate = budgetQuery.data
    ? computeBurnRate(totalSpent, budgetAmount, progress.daysElapsed, progress.daysRemaining)
    : null;

  const categoryTotals = expenses.reduce<Partial<Record<ExpenseCategory, number>>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_aed;
    return acc;
  }, {});
  const sortedCategories = (Object.entries(categoryTotals) as [ExpenseCategory, number][]).sort((a, b) => b[1] - a[1]);

  function handleSaveBudget(event: FormEvent) {
    event.preventDefault();
    const amount = Number(budgetInput);
    if (Number.isFinite(amount) && amount >= 0) {
      saveBudgetMutation.mutate(amount, {
        onSuccess: () => {
          setBudgetInput('');
          setIsEditingBudget(false);
        },
      });
    }
  }

  function handleExpenseFinished() {
    setIsAddingExpense(false);
    void tripQuery.refetch();
    void expensesQuery.refetch();
    void budgetQuery.refetch();
  }

  return (
    <>
      <PrimaryPageHeader />
      <main className="flex flex-col gap-4 px-4 py-6 pb-10">
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-secondary">Burn analytics for the rest of your trip.</p>
          <Link to="/financial-report" className="text-sm text-text-secondary underline hover:text-primary-light">
            Full Report
          </Link>
        </div>

        <Card title="Allocated Vault">
        {budgetQuery.data ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              <VaultRing percentUsed={percentUsed} />
              <div className="absolute flex flex-col items-center">
                <span className="text-[10px] uppercase tracking-wide text-text-muted">Allocated Vault</span>
                <span className="text-xl font-bold text-text-primary">{budgetAmount.toLocaleString()}</span>
                <span className="text-[10px] text-text-muted">AED</span>
                <span className="mt-1 rounded-full bg-surface-elevated-2 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                  {percentUsed}% Spent
                </span>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-3">
              <div className="rounded-md border border-border bg-surface-2/70 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Total Spent</p>
                <p className="text-lg font-semibold text-text-primary">AED {totalSpent.toLocaleString()}</p>
              </div>
              <div className="rounded-md border border-primary-light/30 bg-primary/10 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-text-muted">Remaining Vault</p>
                <p className="text-lg font-semibold text-primary-light">AED {(budgetAmount - totalSpent).toLocaleString()}</p>
              </div>
            </div>

            {burnRate && (
              <div className="flex w-full items-center justify-between gap-2 text-sm">
                <span className="text-text-secondary">Burn Velocity: {Math.round(burnRate.dailyAverageAed)} AED/day</span>
                <span className={burnRate.willBudgetLast ? 'text-success' : 'text-error'}>
                  {burnRate.willBudgetLast ? 'On pace' : 'Running short'}
                </span>
              </div>
            )}

            {alertCopy && (
              <p role="alert" className={clsx('w-full text-sm', alertCopy.className)}>
                {alertCopy.text}
              </p>
            )}

            <SecondaryButton type="button" onClick={() => setIsEditingBudget((v) => !v)} className="self-start">
              {isEditingBudget ? 'Cancel' : 'Edit Budget'}
            </SecondaryButton>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No budget set yet — set one below to unlock burn-rate tracking.</p>
        )}

        {(isEditingBudget || !budgetQuery.data) && (
          <form onSubmit={handleSaveBudget} className="flex gap-2">
            <label htmlFor="budget-amount" className="sr-only">
              Budget amount (AED)
            </label>
            <input
              id="budget-amount"
              type="number"
              min={0}
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              placeholder="10000"
              className="min-h-11 flex-1 rounded-sm border border-border bg-surface-2 px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <PrimaryButton type="submit">Save</PrimaryButton>
          </form>
        )}
      </Card>

      {sortedCategories.length > 0 && (
        <Card title="Category Allocation">
          <ul className="flex flex-col gap-3">
            {sortedCategories.map(([category, amount]) => {
              const Icon = CATEGORY_ICONS[category];
              const share = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
              return (
                <li key={category} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1.5 text-text-primary">
                      <Icon size={15} className="text-primary-light" /> {CATEGORY_LABELS[category]}
                    </span>
                    <span className="text-text-secondary">
                      AED {amount.toLocaleString()} · {share}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-elevated-2">
                    <div className="h-full bg-cta" style={{ width: `${share}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Card title="Instant AI Log">
        <div className="flex flex-wrap gap-2">
          {QUICK_LOG_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category];
            return (
              <button
                key={category}
                type="button"
                onClick={() => setIsAddingExpense(true)}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface-2/70 px-3 py-1.5 text-xs font-medium text-text-secondary transition-transform active:scale-95"
              >
                <Icon size={14} /> {CATEGORY_LABELS[category]}
              </button>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-text-muted">
          <Zap size={12} className="shrink-0" aria-hidden="true" />
          Free-text AI logging ("Taxi to Gate Towers 35 AED") arrives in a future update — tap a category to log now.
        </p>
      </Card>

      {expensesQuery.isError && (
        <ErrorState
          message="Couldn't load your expenses. Check your connection and try again."
          onRetry={() => void expensesQuery.refetch()}
        />
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Audited Activity Log</h2>
          {expenses.length > 0 && (
            <button
              type="button"
              onClick={() => downloadExpensesCsv(expenses)}
              className="inline-flex items-center gap-1 text-xs text-primary-light underline"
            >
              <Download size={12} aria-hidden="true" /> Export CSV
            </button>
          )}
        </div>
        {expenses.length === 0 && <EmptyState message="No expenses logged yet." />}
        {expenses.map((expense) => {
          const Icon = CATEGORY_ICONS[expense.category];
          return (
            <div key={expense.id} className="flex items-center gap-3 rounded-md border border-border bg-surface-2/50 px-3 py-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated-2">
                <Icon size={15} className="text-primary-light" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text-primary">{expense.description || CATEGORY_LABELS[expense.category]}</p>
                <p className="text-xs text-text-muted">{expense.expense_date}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">-{expense.amount_aed.toLocaleString()} AED</p>
                <p className="text-xs capitalize text-text-muted">{CATEGORY_LABELS[expense.category]}</p>
              </div>
            </div>
          );
        })}
      </div>

        {isAddingExpense ? (
          <ChatFlow flow={expenseFlow} onFinished={handleExpenseFinished} />
        ) : (
          <PrimaryButton type="button" onClick={() => setIsAddingExpense(true)} className="self-start">
            + Log Expense in 20s
          </PrimaryButton>
        )}
      </main>
    </>
  );
}
