import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DateRange, PeriodPreset } from '@/domains/expenses/reports';
import { describeRange, isValidRange } from '@/domains/expenses/reports';

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

interface ReportFiltersProps {
  preset: PeriodPreset;
  range: DateRange | undefined;
  custom: DateRange;
  canStepForward: boolean;
  onPresetChange: (preset: PeriodPreset) => void;
  onStep: (direction: -1 | 1) => void;
  onToday: () => void;
  onCustomChange: (range: DateRange) => void;
}

const stepButton =
  'flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface-2/60 text-text-secondary transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light disabled:cursor-not-allowed disabled:opacity-40';
const dateInput =
  'min-h-11 w-full rounded-lg border border-border bg-surface-2/60 px-3 text-sm text-text-primary [color-scheme:dark] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light';

export function ReportFilters({ preset, range, custom, canStepForward, onPresetChange, onStep, onToday, onCustomChange }: ReportFiltersProps) {
  const customInvalid = preset === 'custom' && !isValidRange(range);
  return (
    <section aria-label="Report period" className="flex flex-col gap-3 rounded-lg border border-border bg-surface/[0.85] p-4 shadow-card backdrop-blur-md">
      <div role="group" aria-label="Period" className="grid grid-cols-4 gap-1 rounded-xl bg-surface-2/60 p-1">
        {PRESET_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={preset === option.value}
            onClick={() => onPresetChange(option.value)}
            className={clsx(
              'min-h-11 rounded-lg px-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light',
              preset === option.value ? 'bg-primary text-white shadow-card' : 'text-text-secondary hover:text-text-primary',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {preset === 'custom' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            From
            <input
              type="date"
              className={dateInput}
              value={custom.start}
              max={custom.end || undefined}
              aria-invalid={customInvalid}
              onChange={(e) => onCustomChange({ ...custom, start: e.target.value })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">
            To
            <input
              type="date"
              className={dateInput}
              value={custom.end}
              min={custom.start || undefined}
              aria-invalid={customInvalid}
              onChange={(e) => onCustomChange({ ...custom, end: e.target.value })}
            />
          </label>
          {customInvalid && (
            <p role="alert" className="text-sm text-error sm:col-span-2">
              Choose a start date that is on or before the end date.
            </p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={stepButton} aria-label={`Previous ${preset === 'daily' ? 'day' : preset === 'weekly' ? 'week' : 'month'}`} onClick={() => onStep(-1)}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <div className="flex min-w-0 flex-col items-center text-center">
            <p aria-live="polite" className="truncate text-sm font-semibold text-text-primary">
              {range ? describeRange(range) : ''}
            </p>
            <button type="button" onClick={onToday} className="min-h-11 text-xs font-medium text-primary-light underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-light">
              Jump to {preset === 'daily' ? 'today' : preset === 'weekly' ? 'this week' : 'this month'}
            </button>
          </div>
          <button type="button" className={stepButton} aria-label={`Next ${preset === 'daily' ? 'day' : preset === 'weekly' ? 'week' : 'month'}`} onClick={() => onStep(1)} disabled={!canStepForward}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
