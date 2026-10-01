import { clsx } from 'clsx';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Delta } from '@/domains/expenses/reports';

/** 'spend': a rise is a caution and a fall is good. 'neutral': direction carries no judgement (e.g. transaction count). */
export type DeltaTone = 'spend' | 'neutral';

export function DeltaBadge({ delta, tone, previousLabel, format }: { delta: Delta; tone: DeltaTone; previousLabel: string; format: (n: number) => string }) {
  const direction = delta.absolute > 0 ? 'up' : delta.absolute < 0 ? 'down' : 'flat';
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  const color =
    direction === 'flat' || tone === 'neutral' ? 'text-text-secondary' : direction === 'up' ? 'text-warning' : 'text-success';
  const sign = direction === 'up' ? '+' : direction === 'down' ? '−' : '';
  const text =
    direction === 'flat'
      ? 'No change'
      : delta.percent === null
        ? `${sign}${format(Math.abs(delta.absolute))} (no prior data)`
        : `${sign}${Math.abs(delta.percent).toFixed(1)}%`;
  return (
    <p className={clsx('flex flex-wrap items-center gap-1 text-xs', color)}>
      <Icon size={14} aria-hidden="true" />
      <span>{text}</span>
      <span className="text-text-muted">vs {previousLabel}</span>
    </p>
  );
}

export function KpiCard({ label, value, footer, className }: { label: string; value: ReactNode; footer?: ReactNode; className?: string }) {
  return (
    <div className={clsx('flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-surface/[0.85] p-4 shadow-card backdrop-blur-md', className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{label}</p>
      <p className="truncate text-xl font-bold text-text-primary sm:text-2xl" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {value}
      </p>
      {footer}
    </div>
  );
}
