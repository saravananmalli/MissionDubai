import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { clsx } from 'clsx';
import { Paperclip } from 'lucide-react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SecondaryPageHeader } from '@/components/SecondaryPageHeader';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_LABELS, PAYMENT_LABELS } from '@/domains/expenses/categories';
import { BudgetBar, BudgetRing } from '@/domains/expenses/components/overall/BudgetMeters';
import { LEVEL_STYLES, statusLabel } from '@/domains/expenses/components/overall/levelStyles';
import { KpiCard } from '@/domains/expenses/components/report/KpiCard';
import { BreakdownDonut, CategoryBarChart, SpendTrendChart } from '@/domains/expenses/components/report/ReportCharts';
import { ReportSkeleton } from '@/domains/expenses/components/report/ReportSkeleton';
import { formatAed } from '@/domains/expenses/components/report/format';
import { averageDailySpend, categoryRows, formatPercent } from '@/domains/expenses/overall';
import { trendSeries } from '@/domains/expenses/reports';
import { useOverallAnalytics } from '@/domains/expenses/useOverallAnalytics';
import type { ExpenseCategory } from '@/lib/database.types';

const LOG_PAGE_SIZE = 15;

export default function OverallAnalyticsPage() {
  const { isLoading, isError, refetch, expenses, totalSpent, status, monthComparison } = useOverallAnalytics();
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(LOG_PAGE_SIZE);
  const header = <SecondaryPageHeader title="Overall Analytics" />;

  const todayISO = monthComparison.todayISO;
  const rows = useMemo(() => categoryRows(expenses), [expenses]);
  const trend = useMemo(() => {
    if (expenses.length === 0) return [];
    const first = expenses.reduce((min, e) => (e.expense_date < min ? e.expense_date : min), expenses[0]!.expense_date);
    const last = expenses.reduce((max, e) => (e.expense_date > max ? e.expense_date : max), todayISO);
    return trendSeries(expenses, { start: first, end: last });
  }, [expenses, todayISO]);
  const log = useMemo(
    () =>
      [...expenses]
        .filter((e) => categoryFilter === 'all' || e.category === categoryFilter)
        .sort((a, b) => b.expense_date.localeCompare(a.expense_date) || b.created_at.localeCompare(a.created_at)),
    [expenses, categoryFilter],
  );

  if (isLoading) {
    return (
      <>
        {header}
        <ReportSkeleton />
      </>
    );
  }
  if (isError) {
    return (
      <>
        {header}
        <main className="px-4 py-6">
          <ErrorState message="Couldn't load your financial data. Check your connection and try again." onRetry={refetch} />
        </main>
      </>
    );
  }
  if (expenses.length === 0) {
    return (
      <>
        {header}
        <main className="mx-auto w-full max-w-6xl px-4 py-6">
          <EmptyState
            message="No expenses yet. Log your first one and your overall analytics will appear here."
            action={
              <Link to="/expenses?add=1" className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-white">
                Log an expense
              </Link>
            }
          />
        </main>
      </>
    );
  }

  const highest = expenses.reduce((max, e) => (e.amount_aed > max.amount_aed ? e : max), expenses[0]!);
  const usedRows = rows.filter((r) => r.total > 0);
  const style = status ? LEVEL_STYLES[status.level] : null;
  const visibleLog = log.slice(0, visibleCount);

  return (
    <>
      {header}
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
        <section aria-label="Financial summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard label="Total budget" value={status ? formatAed(status.budget) : 'Not set'} footer={!status && <Link to="/expenses" className="text-xs text-primary-light underline">Set a budget</Link>} />
          <KpiCard label="Total expenses" value={formatAed(totalSpent)} />
          <KpiCard
            label={status && status.overBy > 0 ? 'Over budget by' : 'Remaining budget'}
            value={status ? formatAed(status.overBy > 0 ? status.overBy : status.remaining) : '—'}
            footer={status && <p className={clsx('text-xs', style?.text)}>{statusLabel(status)}</p>}
          />
          <KpiCard label="Budget utilization" value={status ? formatPercent(status.percentUsed) : '—'} />
          <KpiCard label="Avg daily spending" value={formatAed(averageDailySpend(expenses, todayISO))} />
          <KpiCard
            label="Highest expense"
            value={formatAed(highest.amount_aed)}
            footer={<p className="truncate text-xs text-text-muted">{highest.description || CATEGORY_LABELS[highest.category]}</p>}
          />
          <KpiCard className="col-span-2 md:col-span-1" label="Transactions" value={expenses.length.toLocaleString('en-US')} />
        </section>

        <Card title="Budget vs spending">
          {status && style ? (
            <div className="flex flex-col items-center gap-6 md:flex-row md:items-center">
              <BudgetRing status={status} />
              <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
                <dl className="grid grid-cols-3 gap-2 text-center sm:text-left">
                  <div>
                    <dt className="text-xs text-text-muted">Budget</dt>
                    <dd className="text-base font-bold text-text-primary sm:text-lg">{formatAed(status.budget)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">Spent</dt>
                    <dd className="text-base font-bold text-text-primary sm:text-lg">{formatAed(status.spent)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-muted">{status.overBy > 0 ? 'Over by' : 'Remaining'}</dt>
                    <dd className={clsx('text-base font-bold sm:text-lg', status.overBy > 0 ? 'text-error' : 'text-success')}>
                      {formatAed(status.overBy > 0 ? status.overBy : status.remaining)}
                    </dd>
                  </div>
                </dl>
                <BudgetBar status={status} label="Overall budget used" />
                <p className="text-sm text-text-secondary" role={status.overBy > 0 ? 'alert' : undefined}>
                  {status.overBy > 0
                    ? `You are ${formatAed(status.overBy)} over your ${formatAed(status.budget)} budget (${formatPercent(status.percentUsed)} used).`
                    : `${formatPercent(status.percentUsed)} used — ${formatAed(status.remaining)} left to spend.`}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              message={`No budget set, so there is nothing to compare against yet. You've spent ${formatAed(totalSpent)} so far.`}
              action={
                <Link to="/expenses" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium text-primary-light">
                  Set a budget
                </Link>
              }
            />
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Expense distribution">
            <BreakdownDonut
              title="Expense distribution"
              rows={usedRows.map((r) => ({ key: r.category, total: r.total, count: r.count, share: r.share }))}
              labelFor={(k) => CATEGORY_LABELS[k as ExpenseCategory]}
              colorFor={(k) => CATEGORY_COLORS[k as ExpenseCategory]}
            />
          </Card>
          <Card title="Category comparison">
            <CategoryBarChart rows={usedRows.map((r) => ({ label: r.label, total: r.total, color: CATEGORY_COLORS[r.category] }))} />
          </Card>
        </div>

        <Card title="Expense breakdown">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed text-left text-sm sm:table-auto">
              <caption className="sr-only">Expenses by category</caption>
              <thead className="text-xs text-text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-2 font-medium">Category</th>
                  <th scope="col" className="w-24 py-2 text-right font-medium sm:w-auto">Amount</th>
                  <th scope="col" className="w-12 py-2 text-right font-medium sm:w-auto sm:pl-4">% total</th>
                  <th scope="col" className="w-10 py-2 text-right font-medium sm:w-auto sm:pl-4">
                    <span className="sm:hidden" aria-hidden="true">Txns</span>
                    <span className="sr-only sm:not-sr-only">Transactions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const Icon = CATEGORY_ICONS[r.category];
                  return (
                    <tr key={r.category} className={clsx('border-t border-border', r.total === 0 && 'text-text-muted')}>
                      <td className="py-2.5 pr-2">
                        <span className="flex items-center gap-2">
                          <Icon size={16} aria-hidden="true" style={{ color: CATEGORY_COLORS[r.category] }} />
                          <span className="truncate text-text-primary">{r.label}</span>
                        </span>
                      </td>
                      <td className="whitespace-nowrap py-2.5 text-right font-medium text-text-primary">{formatAed(r.total)}</td>
                      <td className="py-2.5 text-right text-text-secondary sm:pl-4">{r.share.toFixed(0)}%</td>
                      <td className="py-2.5 text-right text-text-secondary sm:pl-4">{r.count}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border font-semibold text-text-primary">
                  <th scope="row" className="py-2.5 pr-2 text-left">Total</th>
                  <td className="whitespace-nowrap py-2.5 text-right">{formatAed(totalSpent)}</td>
                  <td className="py-2.5 text-right sm:pl-4">100%</td>
                  <td className="py-2.5 text-right sm:pl-4">{expenses.length}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        <Card title="Spending trend">
          <SpendTrendChart data={trend} showPrevious={false} previousLabel="" />
        </Card>

        <Card title="Expense log">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              Category
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value as ExpenseCategory | 'all');
                  setVisibleCount(LOG_PAGE_SIZE);
                }}
                className="min-h-11 rounded-lg border border-border bg-surface-2/60 px-3 text-sm text-text-primary [color-scheme:dark] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
              >
                <option value="all">All categories</option>
                {rows.map((r) => (
                  <option key={r.category} value={r.category}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <p role="status" className="text-xs text-text-muted">
              {log.length} {log.length === 1 ? 'expense' : 'expenses'}
            </p>
          </div>

          {log.length === 0 ? (
            <EmptyState message="No expenses in this category yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-sm sm:table-auto">
                <caption className="sr-only">Every logged expense, newest first</caption>
                <thead className="text-xs text-text-muted">
                  <tr>
                    <th scope="col" className="w-16 py-2 pr-3 font-medium sm:w-auto">Date</th>
                    <th scope="col" className="hidden py-2 pr-3 font-medium sm:table-cell">Category</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Description</th>
                    <th scope="col" className="hidden py-2 pr-3 font-medium md:table-cell">Payment</th>
                    <th scope="col" className="w-24 py-2 text-right font-medium sm:w-auto">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLog.map((e) => {
                    const Icon = CATEGORY_ICONS[e.category];
                    const payment = PAYMENT_LABELS[e.payment_method ?? 'unspecified'];
                    return (
                      <tr key={e.id} className="border-t border-border align-top">
                        <td className="whitespace-nowrap py-2.5 pr-3 text-text-secondary">{format(parseISO(e.expense_date), 'd MMM')}</td>
                        <td className="hidden py-2.5 pr-3 sm:table-cell">
                          <span className="flex items-center gap-2 text-text-secondary">
                            <Icon size={15} aria-hidden="true" style={{ color: CATEGORY_COLORS[e.category] }} /> {CATEGORY_LABELS[e.category]}
                          </span>
                        </td>
                        <td className="min-w-0 py-2.5 pr-3">
                          <p className="truncate text-text-primary">{e.description || CATEGORY_LABELS[e.category]}</p>
                          <p className="flex items-center gap-1.5 truncate text-xs text-text-muted">
                            <span className="sm:hidden">{CATEGORY_LABELS[e.category]}</span>
                            {e.location && <span className="truncate">{e.location}</span>}
                            <span className="md:hidden">{e.payment_method ? payment : ''}</span>
                            {e.receipt_photo_path && (
                              <span className="inline-flex items-center gap-0.5">
                                <Paperclip size={11} aria-hidden="true" /> Receipt
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="hidden py-2.5 pr-3 text-text-secondary md:table-cell">{payment}</td>
                        <td className="whitespace-nowrap py-2.5 text-right font-medium text-text-primary">{formatAed(e.amount_aed)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {visibleCount < log.length && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + LOG_PAGE_SIZE)}
              className="min-h-11 self-start text-sm font-medium text-primary-light hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
            >
              Show more ({log.length - visibleCount} remaining)
            </button>
          )}
        </Card>
      </main>
    </>
  );
}
