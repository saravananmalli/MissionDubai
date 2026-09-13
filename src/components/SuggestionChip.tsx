import { Radar, Receipt, Rocket, Scale, ShieldAlert, TrendingDown, Video, X, type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import type { Suggestion } from '@/domains/suggestions/types';

const ICONS: Record<string, LucideIcon> = {
  Rocket,
  ShieldAlert,
  Video,
  Radar,
  TrendingDown,
  Receipt,
  Scale,
};

/**
 * The one genuinely interactive/tappable chip in the app — `components/Chip.tsx`
 * stays a non-interactive status badge used elsewhere, so this is deliberately
 * a separate component rather than an overload of it.
 */
export function SuggestionChip({
  suggestion,
  onSelect,
  onDismiss,
  className,
}: {
  suggestion: Suggestion;
  onSelect: (suggestion: Suggestion) => void;
  onDismiss?: (suggestion: Suggestion) => void;
  className?: string;
}) {
  const Icon = ICONS[suggestion.icon] ?? Rocket;

  return (
    <div className={clsx('relative flex-shrink-0', className)}>
      <button
        type="button"
        onClick={() => onSelect(suggestion)}
        className="flex min-h-11 max-w-[220px] items-start gap-2 rounded-md border border-primary-light/30 bg-surface-2/80 py-2 pl-3 pr-4 text-left shadow-card backdrop-blur-md transition-transform active:scale-95"
      >
        <Icon size={16} className="mt-0.5 shrink-0 text-primary-light" aria-hidden="true" />
        <span className="flex flex-col">
          <span className="text-sm font-medium leading-tight text-text-primary">{suggestion.title}</span>
          <span className="text-xs leading-tight text-text-secondary">{suggestion.reason}</span>
        </span>
      </button>
      {suggestion.dismissible && onDismiss && (
        <button
          type="button"
          aria-label={`Dismiss: ${suggestion.title}`}
          onClick={() => onDismiss(suggestion)}
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated-2 text-text-muted hover:text-text-primary"
        >
          <X size={12} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
