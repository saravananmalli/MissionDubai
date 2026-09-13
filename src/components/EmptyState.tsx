import type { ReactNode } from 'react';

export function EmptyState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface/40 p-5 text-sm text-text-secondary">
      <p>{message}</p>
      {action}
    </div>
  );
}
