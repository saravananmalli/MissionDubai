import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Car,
  CircleDollarSign,
  Download,
  Plus,
  Home,
  Plane,
  ShieldCheck,
  ShoppingBag,
  Shirt,
  Ticket,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { ChatFlow } from '@/chat-flow';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { PrimaryPageHeader } from '@/components/PrimaryPageHeader';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton, SecondaryButton, TertiaryButton } from '@/components/Button';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useTravelSummary } from '@/domains/travel/api';
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

function localIsoDate(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

function dayLabel(isoDate: string, now: Date): string {
  const today = localIsoDate(now);
  const yesterday = localIsoDate(new Date(now.getTime() - 86_400_000));
  if (isoDate === today) return 'Today';
  if (isoDate === yesterday) return 'Yesterday';
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function groupByDay(expenses: Expense[], now: Date): { label: string; items: Expense[] }[] {
  const groups = new Map<string, Expense[]>();
  for (const expense of expenses) {
    const list = groups.get(expense.expense_date) ?? [];
    list.push(expense);
    groups.set(expense.expense_date, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => ({ label: dayLabel(date, now), items }));
}

function StatTile({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'accent' | 'danger' }) {
  return (
    <div
      className={clsx(
        'rounded-md border p-3 text-center',
        tone === 'accent' && 'border-primary-light/30 bg-primary/10',
        tone === 'danger' && 'border-error/40 bg-error/10',
        tone === 'default' && 'border-border bg-surface-2/70',
      )}
    >
      <p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className={clsx('text-lg font-semibold', tone === 'accent' ? 'text-primary-light' : tone === 'danger' ? 'text-error' : 'text-text-primary')}>
        {value}
      </p>
    </div>
  );
}

export default function ExpensesPage() {
  const tripQuery = useCurrentTrip();
  const budgetQuery = useBudget(tripQuery.data?.id);
  const expensesQuery = useExpenses(tripQuery.data?.id);
  const travelQuery = useTravelSummary(tripQuery.data?.id);
  const saveBudgetMutation = useSaveBudget();
  const [budgetInput, setBudgetInput] = useState('');
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  // Reminder notifications deep-link here with ?add=1 so one tap lands in the log flow.
  const [searchParams, setSearchParams] = useSearchParams();
  const [isAddingExpense, setIsAddingExpense] = useState(searchParams.get('add') === '1');

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

  const now = new Date();
  const expenses = expensesQuery.data ?? [];

  // Booked travel costs count toward the budget too: flights, visa fee, and the first month's rent.
  const travel = travelQuery.data;
  const bookedTravel: { category: ExpenseCategory; label: string; amount: number }[] = [
    { category: 'flight' as const, label: 'Flights', amount: (travel?.flights ?? []).reduce((sum, f) => sum + Number(f.cost_aed), 0) },
    { category: 'visa' as const, label: 'Visa', amount: Number(travel?.visa?.fee_aed ?? 0) },
    { category: 'pg_rent' as const, label: 'Accommodation (first month)', amount: Number(travel?.accommodation?.monthly_rent_aed ?? 0) },
  ].filter((item) => item.amount > 0);
  const bookedTotal = bookedTravel.reduce((sum, item) => sum + item.amount, 0);
  const loggedTotal = expenses.reduce((sum, e) => sum + e.amount_aed, 0);
  const totalSpent = loggedTotal + bookedTotal;

  const budgetAmount = budgetQuery.data?.amount_aed ?? 0;
  const percentUsed = budgetAmount > 0 ? Math.round((totalSpent / budgetAmount) * 100) : 0;
  const alertLevel = budgetQuery.data ? getBudgetAlertLevel(percentUsed) : 'ok';
  const alertCopy = ALERT_COPY[alertLevel];
  const remaining = budgetAmount - totalSpent;

  const trip = tripQuery.data;
  const progress = trip
    ? computeJourneyProgress(trip.start_date, trip.target_end_date ?? trip.start_date, new Date())
    : { daysElapsed: 0, daysRemaining: 0, totalDays: 0, percentComplete: 0 };
  const burnRate = budgetQuery.data
    ? computeBurnRate(totalSpent, budgetAmount, progress.daysElapsed, progress.daysRemaining)
    : null;

  const categoryTotals: Partial<Record<ExpenseCategory, number>> = {};
  for (const e of expenses) categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount_aed;
  for (const item of bookedTravel) categoryTotals[item.category] = (categoryTotals[item.category] ?? 0) + item.amount;
  const sortedCategories = (Object.entries(categoryTotals) as [ExpenseCategory, number][]).sort((a, b) => b[1] - a[1]);
  const dayGroups = groupByDay(expenses, now);

  function openBudgetEditor() {
    setBudgetInput(budgetQuery.data ? String(budgetQuery.data.amount_aed) : '');
    saveBudgetMutation.reset();
    setIsEditingBudget(true);
  }

  function handleSaveBudget(event: FormEvent) {
    event.preventDefault();
    const amount = Number(budgetInput);
    if (budgetInput.trim() !== '' && Number.isFinite(amount) && amount >= 0) {
      saveBudgetMutation.mutate(amount, {
        onSuccess: () => {
          setBudgetInput('');
          setIsEditingBudget(false);
        },
      });
    }
  }

  function closeExpenseFlow() {
    setIsAddingExpense(false);
    if (searchParams.has('add')) setSearchParams({}, { replace: true });
  }

  function handleExpenseFinished() {
    closeExpenseFlow();
    void tripQuery.refetch();
    void expensesQuery.refetch();
    void budgetQuery.refetch();
  }

  const showBudgetForm = isEditingBudget || !budgetQuery.data;

  return (
    <>
      <PrimaryPageHeader />
      <main className="flex flex-col gap-4 px-4 py-6 pb-36">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Finances</h1>
            <p className="text-sm text-text-secondary">Your Dubai budget, at a glance.</p>
          </div>
          <Link to="/financial-report" className="shrink-0 text-sm text-primary-light underline">
            Full Report
          </Link>
        </div>

        {isAddingExpense ? (
          <Card title="Log an expense">
            <ChatFlow flow={expenseFlow} onFinished={handleExpenseFinished} />
            <TertiaryButton type="button" onClick={closeExpenseFlow} className="self-start">
              Cancel
            </TertiaryButton>
          </Card>
        ) : (
          <PrimaryButton type="button" onClick={() => setIsAddingExpense(true)} className="w-full">
            <Plus size={18} aria-hidden="true" /> Log Expense
          </PrimaryButton>
        )}

        <Card title="Budget">
          {budgetQuery.data ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center">
                <VaultRing percentUsed={percentUsed} />
                <div className="absolute flex flex-col items-center">
                  <span className="text-[10px] uppercase tracking-wide text-text-muted">Budget</span>
                  <span className="text-xl font-bold text-text-primary">{budgetAmount.toLocaleString()}</span>
                  <span className="text-[10px] text-text-muted">AED</span>
                  <span className="mt-1 rounded-full bg-surface-elevated-2 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
                    {percentUsed}% Spent
                  </span>
                </div>
              </div>

              <div className="grid w-full grid-cols-2 gap-3">
                <StatTile label="Total Spent" value={`AED ${totalSpent.toLocaleString()}`} />
                <StatTile
                  label={remaining < 0 ? 'Over Budget' : 'Remaining'}
                  value={`AED ${Math.abs(remaining).toLocaleString()}`}
                  tone={remaining < 0 ? 'danger' : 'accent'}
                />
              </div>

              {burnRate && (
                <div className="flex w-full items-center justify-between gap-2 text-sm">
                  <span className="text-text-secondary">Spending {Math.round(burnRate.dailyAverageAed)} AED/day</span>
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
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Set a total budget in AED to track how much you have left.</p>
          )}

          {showBudgetForm ? (
            <form onSubmit={handleSaveBudget} className="flex flex-col gap-2">
              <label htmlFor="budget-amount" className="text-xs text-text-secondary">
                Budget amount (AED)
              </label>
              <div className="flex gap-2">
                <input
                  id="budget-amount"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={budgetInput}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="10000"
                  className="min-h-11 flex-1 rounded-sm border border-border bg-surface-2 px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <PrimaryButton type="submit" disabled={saveBudgetMutation.isPending}>
                  {saveBudgetMutation.isPending ? 'Saving…' : 'Save'}
                </PrimaryButton>
                {budgetQuery.data && (
                  <SecondaryButton type="button" onClick={() => setIsEditingBudget(false)}>
                    Cancel
                  </SecondaryButton>
                )}
              </div>
              {saveBudgetMutation.isError && (
                <p role="alert" className="text-sm text-error">
                  Couldn't save your budget. Check your connection and try again.
                </p>
              )}
            </form>
          ) : (
            <SecondaryButton type="button" onClick={openBudgetEditor} className="w-full">
              Edit Budget
            </SecondaryButton>
          )}
        </Card>

        {sortedCategories.length > 0 && (
          <Card title="Where it went">
            <ul className="flex flex-col gap-3">
              {sortedCategories.map(([category, amount]) => {
                const Icon = CATEGORY_ICONS[category];
                const share = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
                return (
                  <li key={category} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="inline-flex items-center gap-1.5 text-text-primary">
                        <Icon size={15} className="text-primary-light" aria-hidden="true" /> {CATEGORY_LABELS[category]}
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

        {bookedTravel.length > 0 && (
          <Card title="Booked travel">
            <ul className="flex flex-col gap-2">
              {bookedTravel.map((item) => {
                const Icon = CATEGORY_ICONS[item.category];
                return (
                  <li key={item.category} className="flex items-center gap-3 rounded-md border border-border bg-surface-2/50 px-3 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-elevated-2">
                      <Icon size={15} className="text-primary-light" aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-sm text-text-primary">{item.label}</span>
                    <span className="text-sm font-semibold text-text-primary">AED {item.amount.toLocaleString()}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-text-muted">Counted in your budget automatically. Edit these on the Travel page.</p>
          </Card>
        )}

        {expensesQuery.isError && (
          <ErrorState
            message="Couldn't load your expenses. Check your connection and try again."
            onRetry={() => void expensesQuery.refetch()}
          />
        )}

        <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="activity-heading" className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Recent activity
            </h2>
            {expenses.length > 0 && (
              <button
                type="button"
                onClick={() => downloadExpensesCsv(expenses)}
                className="inline-flex min-h-9 items-center gap-1 text-xs text-primary-light underline"
              >
                <Download size={12} aria-hidden="true" /> Export CSV
              </button>
            )}
          </div>

          {expensesQuery.isLoading && <p role="status" className="text-sm text-text-secondary">Loading expenses…</p>}

          {!expensesQuery.isLoading && !expensesQuery.isError && expenses.length === 0 && (
            <EmptyState
              message="No expenses yet. Log your first one — it takes about 20 seconds."
              action={
                !isAddingExpense && (
                  <SecondaryButton type="button" onClick={() => setIsAddingExpense(true)}>
                    Start logging
                  </SecondaryButton>
                )
              }
            />
          )}

          {dayGroups.map((group) => (
            <div key={group.label} className="flex flex-col gap-2">
              <h3 className="text-xs font-medium text-text-muted">{group.label}</h3>
              {group.items.map((expense) => {
                const Icon = CATEGORY_ICONS[expense.category];
                return (
                  <div key={expense.id} className="flex items-center gap-3 rounded-md border border-border bg-surface-2/50 px-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-elevated-2">
                      <Icon size={16} className="text-primary-light" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-primary">{expense.description || CATEGORY_LABELS[expense.category]}</p>
                      <p className="text-xs text-text-muted">{CATEGORY_LABELS[expense.category]}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-text-primary">-{expense.amount_aed.toLocaleString()} AED</p>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
