import type { ReactNode } from 'react';

export function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-border bg-surface/[0.85] p-5 shadow-card backdrop-blur-md">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">{title}</h2>
      {children}
    </section>
  );
}
