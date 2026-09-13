export function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="px-4 py-6">
      <h1 className="text-xl font-bold text-text-primary">{title}</h1>
      <p className="mt-2 text-sm text-text-secondary">Coming in a later phase.</p>
    </main>
  );
}
