import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { addDays, format, parseISO } from 'date-fns';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { SecondaryPageHeader } from '@/components/SecondaryPageHeader';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useBudget, useExpenses } from '@/domains/expenses/api';
import { CATEGORY_COLORS, CATEGORY_LABELS, PAYMENT_COLORS, PAYMENT_LABELS } from '@/domains/expenses/categories';
import { BreakdownDonut, SpendTrendChart, TransactionsTrendChart } from '@/domains/expenses/components/report/ReportCharts';
import { ReportFilters } from '@/domains/expenses/components/report/ReportFilters';
import { ReportSkeleton } from '@/domains/expenses/components/report/ReportSkeleton';
import { DeltaBadge, KpiCard } from '@/domains/expenses/components/report/KpiCard';
import { formatAed } from '@/domains/expenses/components/report/format';
import { computeBurnRate, getBudgetAlertLevel } from '@/domains/expenses/utils';
import {
  breakdownBy,
  computeDelta,
  daysInRange,
  describeRange,
  filterByRange,
  isValidRange,
  itemKey,
  parsePeriodParams,
  previousRange,
  resolveRange,
  shiftAnchor,
  summarize,
  toISO,
  trendSeries,
  type DateRange,
  type PeriodPreset,
} from '@/domains/expenses/reports';
import { daysUntil } from '@/domains/travel/utils';
import type { ExpenseCategory, PaymentMethod } from '@/lib/database.types';

const DEFAULT_TRIP_LENGTH_DAYS = 60;
const TRANSACTION_PREVIEW_COUNT = 8;
const TOP_ITEMS = 5;

function previousLabelFor(preset: PeriodPreset, previous: DateRange): string {
  if (preset === 'daily') return 'yesterday';
  if (preset === 'weekly') return 'last week';
  if (preset === 'monthly') return format(parseISO(previous.start), 'MMM');
  return 'prior period';
}

export default function FinancialReportPage() {
  const tripQuery = useCurrentTrip();
  const budgetQuery = useBudget(tripQuery.data?.id);
  const expensesQuery = useExpenses(tripQuery.data?.id);
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const today = useMemo(() => new Date(), []);
  const todayISO = toISO(today);
  const header = <SecondaryPageHeader title="Financial Report" />;

  const { preset, anchor, custom } = parsePeriodParams(searchParams, today);
  const range: DateRange | undefined = preset === 'custom' ? (isValidRange(custom) ? custom : undefined) : resolveRange(preset, anchor);
  const previous = range ? previousRange(preset, range) : undefined;

  const expenses = useMemo(() => expensesQuery.data ?? [], [expensesQuery.data]);

  const report = useMemo(() => {
    if (!range || !previous) return null;
    const current = filterByRange(expenses, range);
    const prior = filterByRange(expenses, previous);
    // A day view has no intra-day data, so its trend shows the 7 days ending on that day instead of a single point.
    const trendRange = preset === 'daily' ? { start: toISO(addDays(parseISO(range.end), -6)), end: range.end } : range;
    const trendExpenses = preset === 'daily' ? filterByRange(expenses, trendRange) : current;
    return {
      current,
      summary: summarize(current, range, todayISO),
      priorSummary: summarize(prior, previous, todayISO),
      categories: breakdownBy(current, (e) => e.category),
      payments: breakdownBy(current, (e) => e.payment_method ?? 'unspecified'),
      items: breakdownBy(current, (e) => itemKey(e, CATEGORY_LABELS[e.category])).slice(0, TOP_ITEMS),
      trend: trendSeries(trendExpenses, trendRange, preset === 'daily' ? undefined : { range: previous, expenses: prior }),
      trendRange,
    };
  }, [expenses, range, previous, preset, todayISO]);

  function updateParams(next: { preset: PeriodPreset; anchor?: Date; custom?: DateRange }) {
    const params = new URLSearchParams();
    params.set('period', next.preset);
    if (next.preset === 'custom') {
      params.set('from', next.custom?.start ?? '');
      params.set('to', next.custom?.end ?? '');
    } else {
      params.set('date', toISO(next.anchor ?? anchor));
    }
    setSearchParams(params, { replace: true });
    setShowAllTransactions(false);
  }

  if (tripQuery.isLoading || (tripQuery.data && (expensesQuery.isLoading || budgetQuery.isLoading))) {
    return (
      <>
        {header}
        <ReportSkeleton />
      </>
    );
  }

  if (tripQuery.isError) {
    return (
      <>
        {header}
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState message="Couldn't load your trip. Check your connection and try again." onRetry={() => void tripQuery.refetch()} />
        </main>
      </>
    );
  }

  if (expensesQuery.isError) {
    return (
      <>
        {header}
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState message="Couldn't load your expenses. Check your connection and try again." onRetry={() => void expensesQuery.refetch()} />
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
            message="No expenses yet to report on. Log your first expense and your insights will appear here."
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

  const trip = tripQuery.data;
  const budgetAmount = budgetQuery.data?.amount_aed ?? 0;
  const totalSpentAllTime = expenses.reduce((sum, e) => sum + e.amount_aed, 0);
  const budgetPercent = budgetAmount > 0 ? (totalSpentAllTime / budgetAmount) * 100 : 0;
  const alertLevel = getBudgetAlertLevel(budgetPercent);
  const burnRate = trip
    ? (() => {
        const startDate = new Date(`${trip.start_date}T00:00:00`);
        const daysElapsed = Math.max(0, Math.round((Date.now() - startDate.getTime()) / 86_400_000));
        const assumedEnd = trip.target_end_date ?? new Date(startDate.getTime() + DEFAULT_TRIP_LENGTH_DAYS * 86_400_000).toISOString().slice(0, 10);
        return computeBurnRate(totalSpentAllTime, budgetAmount, daysElapsed, daysUntil(assumedEnd));
      })()
    : null;

  const currentPeriodIsLatest = preset === 'custom' || (range !== undefined && range.end >= todayISO);
  const previousLabel = previous ? previousLabelFor(preset, previous) : '';
  const s = report?.summary;
  const p = report?.priorSummary;
  const unspecifiedShare = report?.payments.find((r) => r.key === 'unspecified')?.share ?? 0;
  const topCategory = report?.categories[0];
  const transactions = report?.current ?? [];
  const visibleTransactions = showAllTransactions ? transactions : transactions.slice(0, TRANSACTION_PREVIEW_COUNT);

  return (
    <>
      {header}
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
        <ReportFilters
          preset={preset}
          range={range}
          custom={custom}
          canStepForward={!currentPeriodIsLatest}
          onPresetChange={(next) => updateParams({ preset: next, anchor: today, custom })}
          onStep={(direction) => preset !== 'custom' && updateParams({ preset, anchor: shiftAnchor(preset, anchor, direction) })}
          onToday={() => updateParams({ preset, anchor: today })}
          onCustomChange={(next) => updateParams({ preset: 'custom', custom: next })}
        />

        {!report || !s || !p || !range || !previous ? (
          <EmptyState message="Pick a valid date range to see your report." />
        ) : (
          <>
            <section aria-label="Key figures" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <KpiCard
                label="Total spent"
                value={formatAed(s.total)}
                footer={<DeltaBadge delta={computeDelta(s.total, p.total)} tone="spend" previousLabel={previousLabel} format={formatAed} />}
              />
              <KpiCard
                label="Transactions"
                value={s.count.toLocaleString('en-US')}
                footer={<DeltaBadge delta={computeDelta(s.count, p.count)} tone="neutral" previousLabel={previousLabel} format={(n) => String(n)} />}
              />
              <KpiCard
                label="Avg per transaction"
                value={formatAed(s.averagePerTransaction)}
                footer={<DeltaBadge delta={computeDelta(s.averagePerTransaction, p.averagePerTransaction)} tone="spend" previousLabel={previousLabel} format={formatAed} />}
              />
              <KpiCard
                label="Daily average"
                value={formatAed(s.dailyAverage)}
                footer={<DeltaBadge delta={computeDelta(s.dailyAverage, p.dailyAverage)} tone="spend" previousLabel={previousLabel} format={formatAed} />}
              />
              <KpiCard
                label="Largest expense"
                value={s.largest ? formatAed(s.largest.amount_aed) : '—'}
                footer={<p className="truncate text-xs text-text-muted">{s.largest ? s.largest.description || CATEGORY_LABELS[s.largest.category] : 'Nothing logged'}</p>}
              />
              <KpiCard
                label="Budget left (trip)"
                value={budgetAmount > 0 ? formatAed(budgetAmount - totalSpentAllTime) : 'No budget'}
                footer={<p className="text-xs text-text-muted">{budgetAmount > 0 ? `${budgetPercent.toFixed(0)}% of budget used` : 'Set one on Expenses'}</p>}
              />
            </section>

            {report.current.length === 0 ? (
              <EmptyState
                message={`No expenses between ${describeRange(range)}. Try another period or widen the date range.`}
                action={
                  <Link to="/expenses?add=1" className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium text-primary-light">
                    Log an expense
                  </Link>
                }
              />
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card title={preset === 'daily' ? 'Spend trend · last 7 days' : 'Spend trend'}>
                    {preset !== 'daily' && daysInRange(range) <= 62 && (
                      <p className="flex items-center gap-3 text-xs text-text-secondary">
                        <span className="flex items-center gap-1.5">
                          <span className="h-0.5 w-4 bg-primary" aria-hidden="true" /> This period
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="h-0.5 w-4 border-t-2 border-dashed border-warning" aria-hidden="true" /> {previousLabel}
                        </span>
                      </p>
                    )}
                    <SpendTrendChart data={report.trend} showPrevious={preset !== 'daily' && daysInRange(range) <= 62} previousLabel={previousLabel} />
                  </Card>
                  <Card title={preset === 'daily' ? 'Transactions · last 7 days' : 'Transactions trend'}>
                    <TransactionsTrendChart data={report.trend} />
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card title="Spend by category">
                    <BreakdownDonut
                      title="Spend by category"
                      rows={report.categories}
                      labelFor={(k) => CATEGORY_LABELS[k as ExpenseCategory]}
                      colorFor={(k) => CATEGORY_COLORS[k as ExpenseCategory]}
                    />
                  </Card>
                  <Card title="Payment methods">
                    <BreakdownDonut
                      title="Payment methods"
                      rows={report.payments}
                      labelFor={(k) => PAYMENT_LABELS[k as PaymentMethod | 'unspecified']}
                      colorFor={(k) => PAYMENT_COLORS[k as PaymentMethod | 'unspecified']}
                    />
                    {unspecifiedShare > 0 && (
                      <p className="text-xs text-text-muted">{unspecifiedShare.toFixed(0)}% of spend has no payment method recorded — the expense log doesn&apos;t ask for one yet.</p>
                    )}
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card title="Top expenses">
                    <ol className="flex flex-col gap-3">
                      {report.items.map((item, index) => (
                        <li key={item.key} className="flex flex-col gap-1">
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate text-text-primary">
                              <span className="mr-2 text-text-muted">{index + 1}.</span>
                              {item.key}
                              {item.count > 1 && <span className="ml-1 text-xs text-text-muted">×{item.count}</span>}
                            </span>
                            <span className="shrink-0 font-medium text-text-primary">{formatAed(item.total)}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(item.share, 2)}%` }} />
                          </div>
                        </li>
                      ))}
                    </ol>
                  </Card>
                  <Card title="Spending insights">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div>
                        <dt className="text-xs text-text-muted">Top category</dt>
                        <dd className="font-medium text-text-primary">
                          {topCategory ? `${CATEGORY_LABELS[topCategory.key as ExpenseCategory]} · ${topCategory.share.toFixed(0)}%` : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-text-muted">Days with spending</dt>
                        <dd className="font-medium text-text-primary">
                          {s.activeDays} of {daysInRange(range)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-text-muted">Busiest day</dt>
                        <dd className="font-medium text-text-primary">
                          {(() => {
                            const top = [...report.trend].sort((a, b) => b.total - a.total)[0];
                            return top && top.total > 0 ? `${format(parseISO(top.date), 'd MMM')} · ${formatAed(top.total)}` : '—';
                          })()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-text-muted">Receipts attached</dt>
                        <dd className="font-medium text-text-primary">
                          {s.receiptCount} of {s.count}
                        </dd>
                      </div>
                    </dl>
                  </Card>
                </div>

                <Card title="Transactions">
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed text-left text-sm sm:table-auto">
                      <caption className="sr-only">Transactions for {describeRange(range)}</caption>
                      <thead className="text-xs text-text-muted">
                        <tr>
                          <th scope="col" className="w-16 py-2 pr-3 font-medium sm:w-auto">Date</th>
                          <th scope="col" className="py-2 pr-3 font-medium">Item</th>
                          <th scope="col" className="hidden py-2 pr-3 font-medium sm:table-cell">Category</th>
                          <th scope="col" className="w-24 py-2 text-right font-medium sm:w-auto">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleTransactions.map((e) => (
                          <tr key={e.id} className="border-t border-border">
                            <td className="whitespace-nowrap py-2.5 pr-3 text-text-secondary">{format(parseISO(e.expense_date), 'd MMM')}</td>
                            <td className="truncate py-2.5 pr-3 text-text-primary sm:max-w-xs">{e.description || CATEGORY_LABELS[e.category]}</td>
                            <td className="hidden py-2.5 pr-3 text-text-secondary sm:table-cell">{CATEGORY_LABELS[e.category]}</td>
                            <td className="whitespace-nowrap py-2.5 text-right font-medium text-text-primary">{formatAed(e.amount_aed)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {transactions.length > TRANSACTION_PREVIEW_COUNT && (
                    <button
                      type="button"
                      onClick={() => setShowAllTransactions((v) => !v)}
                      className="min-h-11 self-start text-sm font-medium text-primary-light hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light"
                    >
                      {showAllTransactions ? 'Show fewer' : `Show all ${transactions.length}`}
                    </button>
                  )}
                </Card>
              </>
            )}

            <Card title="Trip budget">
              {budgetQuery.isError ? (
                <ErrorState message="Couldn't load your budget." onRetry={() => void budgetQuery.refetch()} />
              ) : budgetAmount > 0 ? (
                <>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-text-secondary">
                      {formatAed(totalSpentAllTime)} of {formatAed(budgetAmount)}
                    </span>
                    <span className={alertLevel === 'ok' ? 'text-success' : alertLevel === 'warning' ? 'text-warning' : 'text-error'}>
                      {budgetPercent.toFixed(0)}% used
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Trip budget used"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.min(100, Math.round(budgetPercent))}
                    className="h-2.5 overflow-hidden rounded-full bg-surface-2"
                  >
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, budgetPercent)}%` }} />
                  </div>
                  {burnRate && (
                    <p className="text-sm text-text-secondary">
                      At {formatAed(burnRate.dailyAverageAed)}/day your budget {burnRate.willBudgetLast ? 'will last' : 'will not last'} the trip
                      {' '}({burnRate.estimatedRemainingAed >= 0 ? `≈ ${formatAed(burnRate.estimatedRemainingAed)} left` : `≈ ${formatAed(-burnRate.estimatedRemainingAed)} over`} at the end).
                    </p>
                  )}
                </>
              ) : (
                <EmptyState message="No budget set yet. Set one on the Expenses page to track burn rate." />
              )}
            </Card>
          </>
        )}
      </main>
    </>
  );
}
