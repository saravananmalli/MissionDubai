import { clsx } from 'clsx';

/** A single placeholder block. Decorative only — the surrounding region carries the loading announcement. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={clsx('rounded-md bg-surface-2/70 motion-safe:animate-pulse', className)} />;
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx('flex flex-col gap-3 rounded-lg border border-border bg-surface/[0.85] p-5 shadow-card', className)}
    >
      <Skeleton className="h-3 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={clsx('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function SkeletonKpiCard() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border bg-surface/[0.85] p-4 shadow-card">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-7 w-3/4" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  );
}

export function SkeletonChartCard({ height = 'h-56', className }: { height?: string; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx('flex flex-col gap-4 rounded-lg border border-border bg-surface/[0.85] p-5 shadow-card', className)}
    >
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className={clsx('w-full', height)} />
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-surface/[0.85] p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  );
}

/**
 * Full-page placeholder used while a page's data (or its code chunk) loads, so no
 * half-rendered page is ever shown. Announces itself once to assistive tech.
 */
export function PageSkeleton({ label = 'Loading page', variant = 'dashboard' }: { label?: string; variant?: 'dashboard' | 'list' }) {
  return (
    <main role="status" aria-busy="true" aria-live="polite" className="flex flex-col gap-4 px-4 py-6">
      <span className="sr-only">{label}…</span>
      {variant === 'dashboard' ? (
        <>
          <div aria-hidden="true" className="grid grid-cols-2 gap-3">
            <SkeletonKpiCard />
            <SkeletonKpiCard />
          </div>
          <SkeletonChartCard />
          <SkeletonCard lines={4} />
        </>
      ) : (
        <>
          <Skeleton className="h-10 w-full" />
          <SkeletonList rows={4} />
        </>
      )}
    </main>
  );
}
