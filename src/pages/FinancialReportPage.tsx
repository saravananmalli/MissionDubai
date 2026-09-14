import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { SecondaryPageHeader } from '@/components/SecondaryPageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useBudget, useExpenses } from '@/domains/expenses/api';
import { computeBurnRate } from '@/domains/expenses/utils';
import { daysUntil } from '@/domains/travel/utils';

// Dark-safe categorical palette built from the app's design tokens
// (primary, secondary, success, warning, error, primary-light) — kept out of
// Tailwind since Recharts needs literal color strings, not utility classes.
const CATEGORY_COLORS = ['#A83CFF', '#9B6CFF', '#52D6A0', '#E8B45A', '#F06A83', '#B47CFF'];
const CHART_GRID_COLOR = 'rgba(190, 90, 255, 0.15)';
const CHART_TOOLTIP_STYLE = {
  background: '#301542',
  border: '1px solid rgba(190, 90, 255, 0.2)',
  borderRadius: 14,
  color: '#FFFFFF',
};
const CHART_AXIS_TICK = { fill: '#B9AABD' };
const DEFAULT_TRIP_LENGTH_DAYS = 60;

export default function FinancialReportPage() {
  const tripQuery = useCurrentTrip();
  const budgetQuery = useBudget(tripQuery.data?.id);
  const expensesQuery = useExpenses(tripQuery.data?.id);
  const header = <SecondaryPageHeader title="Financial Report" />;

  if (tripQuery.isLoading) {
    return (
      <>
        {header}
        <main className="px-4 py-6">
          <p role="status">Loading…</p>
        </main>
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

  const trip = tripQuery.data;
  const expenses = expensesQuery.data ?? [];
  const budgetAmount = budgetQuery.data?.amount_aed ?? 0;
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount_aed, 0);

  const categoryTotals = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_aed;
    return acc;
  }, {});
  const pieData = Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));

  const burnRate = trip
    ? (() => {
        const startDate = new Date(`${trip.start_date}T00:00:00`);
        const daysElapsed = Math.max(0, Math.round((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        const assumedEndISO =
          trip.target_end_date ??
          new Date(startDate.getTime() + DEFAULT_TRIP_LENGTH_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const daysRemaining = daysUntil(assumedEndISO);
        return computeBurnRate(totalSpent, budgetAmount, daysElapsed, daysRemaining);
      })()
    : null;

  return (
    <>
      {header}
      <main className="flex flex-col gap-4 px-4 py-6">
        {expensesQuery.isError && (
          <ErrorState
            message="Couldn't load your expenses. Check your connection and try again."
            onRetry={() => void expensesQuery.refetch()}
          />
        )}

        {pieData.length === 0 ? (
          <EmptyState message="No expenses yet to report on." />
        ) : (
          <Card title="Expense Categories">
            {/* Recharts renders to canvas/SVG with no inherent screen-reader
                representation; this list is the accessible equivalent of the
                same data the chart shows visually. */}
            <ul className="sr-only">
              {pieData.map((entry) => (
                <li key={entry.name}>
                  {entry.name}: {entry.value.toLocaleString()} AED
                </li>
              ))}
            </ul>
            <ResponsiveContainer width="100%" height={220} aria-hidden="true">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={80} label>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ color: '#B9AABD' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        <Card title="Budget vs Spent">
          <p className="sr-only">
            Budget: {budgetAmount.toLocaleString()} AED. Spent: {totalSpent.toLocaleString()} AED.
          </p>
          <ResponsiveContainer width="100%" height={160} aria-hidden="true">
            <BarChart data={[{ name: 'This trip', Budget: budgetAmount, Spent: totalSpent }]}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_COLOR} />
              <XAxis dataKey="name" tick={CHART_AXIS_TICK} />
              <YAxis tick={CHART_AXIS_TICK} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ color: '#B9AABD' }} />
              <Bar dataKey="Budget" fill="#9B6CFF" />
              <Bar dataKey="Spent" fill="#A83CFF" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {burnRate && (
          <Card title="Burn Rate">
            <p className="text-sm text-text-secondary">Daily Average: {burnRate.dailyAverageAed.toFixed(0)} AED</p>
            <p className="text-sm text-text-secondary">Budget will last: {burnRate.willBudgetLast ? 'YES ✓' : 'NO ⚠️'}</p>
            <p className="text-sm text-text-secondary">Estimated left at trip end: {burnRate.estimatedRemainingAed.toFixed(0)} AED</p>
          </Card>
        )}
      </main>
    </>
  );
}
