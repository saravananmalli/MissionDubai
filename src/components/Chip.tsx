import type { ReactNode } from 'react';
import { clsx } from 'clsx';

const TONES = {
  neutral: 'bg-surface-2/70 ring-border text-text-secondary',
  warning: 'bg-warning/10 ring-warning/30 text-warning',
  error: 'bg-error/10 ring-error/30 text-error',
  success: 'bg-success/10 ring-success/30 text-success',
} as const;

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: keyof typeof TONES }) {
  return (
    <span
      className={clsx(
        'inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
