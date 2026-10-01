import { Skeleton, SkeletonCard, SkeletonChartCard, SkeletonKpiCard } from '@/components/Skeleton';

/** Mirrors the real report layout (filters, KPIs, charts, lists, table) so nothing jumps when data arrives. */
export function ReportSkeleton() {
  return (
    <main role="status" aria-busy="true" aria-live="polite" className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6">
      <span className="sr-only">Loading financial report…</span>
      <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border bg-surface/[0.85] p-4 shadow-card">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonKpiCard key={i} />
        ))}
      </div>
      <div aria-hidden="true" className="grid gap-4 lg:grid-cols-2">
        <SkeletonChartCard />
        <SkeletonChartCard />
      </div>
      <div aria-hidden="true" className="grid gap-4 lg:grid-cols-2">
        <SkeletonChartCard height="h-48" />
        <SkeletonChartCard height="h-48" />
      </div>
      <div aria-hidden="true" className="grid gap-4 lg:grid-cols-2">
        <SkeletonCard lines={5} />
        <SkeletonCard lines={5} />
      </div>
      <SkeletonCard lines={6} className="hidden sm:flex" />
    </main>
  );
}
