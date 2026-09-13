import type { ReactNode } from 'react';

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <span aria-hidden="true" className="mb-2 block h-1 w-8 rounded-full bg-cta" />
        <h1 className="font-sans text-2xl font-bold text-text-primary">{title}</h1>
      </div>
      {action}
    </div>
  );
}
