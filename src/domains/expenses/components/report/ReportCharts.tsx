import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BreakdownRow, TrendPoint } from '@/domains/expenses/reports';
import { formatAed, formatCompact } from '@/domains/expenses/components/report/format';

const GRID = 'rgba(190, 90, 255, 0.15)';
const TICK = { fill: '#B9AABD', fontSize: 11 };
const TOOLTIP_STYLE = { background: '#301542', border: '1px solid rgba(190, 90, 255, 0.2)', borderRadius: 14, color: '#FFFFFF' };
const PRIMARY = '#A83CFF';
const PREVIOUS = '#E8B45A';

/** Recharts has no screen-reader representation, so every chart is aria-hidden and paired with this visually-hidden table. */
function SrTable({ caption, rows }: { caption: string; rows: [string, string][] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SpendTrendChart({ data, showPrevious, previousLabel }: { data: TrendPoint[]; showPrevious: boolean; previousLabel: string }) {
  return (
    <>
      <SrTable caption="Spend trend" rows={data.map((d) => [d.label, formatAed(d.total)])} />
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.45} />
                <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={TICK} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tick={TICK} tickFormatter={formatCompact} width={44} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, name) => [formatAed(v), name]} />
            {showPrevious && <Line type="monotone" dataKey="previousTotal" name={previousLabel} stroke={PREVIOUS} strokeDasharray="5 4" dot={false} strokeWidth={2} connectNulls />}
            <Area type="monotone" dataKey="total" name="Spent" stroke={PRIMARY} strokeWidth={2.5} fill="url(#spendFill)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

export function TransactionsTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <>
      <SrTable caption="Transactions trend" rows={data.map((d) => [d.label, String(d.count)])} />
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
            <XAxis dataKey="label" tick={TICK} interval="preserveStartEnd" minTickGap={16} />
            <YAxis tick={TICK} allowDecimals={false} width={32} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(190, 90, 255, 0.1)' }} formatter={(v: number) => [v, 'Transactions']} />
            <Bar dataKey="count" name="Transactions" fill="#52D6A0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/** Donut with the breakdown listed beside it, so colour is never the only way to read a slice. */
export function BreakdownDonut({
  title,
  rows,
  labelFor,
  colorFor,
}: {
  title: string;
  rows: BreakdownRow[];
  labelFor: (key: string) => string;
  colorFor: (key: string) => string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <SrTable caption={title} rows={rows.map((r) => [labelFor(r.key), `${formatAed(r.total)}, ${r.share.toFixed(0)}%`])} />
      <div aria-hidden="true" className="h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="total" nameKey="key" innerRadius={46} outerRadius={74} paddingAngle={2} stroke="none">
              {rows.map((r) => (
                <Cell key={r.key} fill={colorFor(r.key)} />
              ))}
            </Pie>
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number, _n, item) => [formatAed(v), labelFor(String(item.payload.key))]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex w-full min-w-0 flex-col gap-2 text-sm" aria-hidden="true">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorFor(r.key) }} />
            <span className="min-w-0 flex-1 truncate text-text-primary">{labelFor(r.key)}</span>
            <span className="text-text-secondary">{r.share.toFixed(0)}%</span>
            <span className="w-24 text-right font-medium text-text-primary">{formatAed(r.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CategoryBarChart({ rows }: { rows: { label: string; total: number; color: string }[] }) {
  return (
    <>
      <SrTable caption="Spend by category comparison" rows={rows.map((r) => [r.label, formatAed(r.total)])} />
      <div aria-hidden="true">
        <ResponsiveContainer width="100%" height={Math.max(160, rows.length * 38)}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
            <XAxis type="number" tick={TICK} tickFormatter={formatCompact} />
            <YAxis type="category" dataKey="label" tick={TICK} width={76} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(190, 90, 255, 0.1)' }} formatter={(v: number) => [formatAed(v), 'Spent']} />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {rows.map((r) => (
                <Cell key={r.label} fill={r.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
