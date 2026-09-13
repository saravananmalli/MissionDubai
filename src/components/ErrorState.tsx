export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-2 rounded-xl border border-terracotta-light bg-terracotta-light/60 p-4 text-sm text-terracotta-dark">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 self-start rounded-lg border border-terracotta/40 px-4 py-1.5 font-medium text-terracotta-dark transition-colors hover:bg-terracotta-light"
        >
          Retry
        </button>
      )}
    </div>
  );
}
