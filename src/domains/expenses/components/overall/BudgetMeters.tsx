import { clsx } from 'clsx';
import type { BudgetStatus } from '@/domains/expenses/overall';
import { formatPercent } from '@/domains/expenses/overall';
import { LEVEL_STYLES, statusLabel } from '@/domains/expenses/components/overall/levelStyles';

/** Linear Spent-of-Budget bar. Clamped at 100% visually; over-budget is conveyed in text and colour by the callers. */
export function BudgetBar({ status, label = 'Budget used', className }: { status: BudgetStatus; label?: string; className?: string }) {
  const style = LEVEL_STYLES[status.level];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.round(status.percentUsed))}
      aria-valuetext={`${formatPercent(status.percentUsed)} of budget used`}
      className={clsx('h-3 w-full overflow-hidden rounded-full bg-[#0D071B]', className)}
    >
      <div className={clsx('h-full rounded-full transition-[width] duration-500', style.fill)} style={{ width: `${Math.min(100, status.percentUsed)}%` }} />
    </div>
  );
}

export function BudgetRing({ status, size = 168 }: { status: BudgetStatus; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const style = LEVEL_STYLES[status.level];
  const filled = (Math.min(100, status.percentUsed) / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#0D071B" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={style.stroke}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-extrabold text-text-primary" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          {formatPercent(status.percentUsed)}
        </span>
        <span className={clsx('text-xs font-medium', style.text)}>{statusLabel(status)}</span>
      </div>
    </div>
  );
}
