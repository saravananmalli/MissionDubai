import { useState, type FormEvent } from 'react';
import { clsx } from 'clsx';
import type { StepDefinition, StepOption, StepType } from '@/chat-flow/types';

interface StepRendererProps<A extends Record<string, unknown> = Record<string, unknown>> {
  step: StepDefinition<A>;
  options?: StepOption[];
  validationError: string | null;
  onSubmit: (value: unknown) => void;
}

// The leaf input components below only ever read `id`/`type`/`min`/`max` and
// check `typeof prompt === 'string'` — they never call a function-form prompt.
// Typing `prompt` against `never` here (rather than importing the generic
// StepDefinition<A>) makes this shape accept a StepDefinition<A> for any A:
// a function requiring only `never` accepts any narrower function contravariantly.
interface DisplayStep {
  id: string;
  type: StepType;
  prompt: string | ((answers: never) => string);
  min?: number;
  max?: number;
  dateShortcut?: 'tomorrow' | 'yesterday';
}

const QUICK_TAP_BUTTON_CLASS =
  'min-h-11 min-w-11 rounded-full border border-ink-200 bg-cream-100 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:border-gold hover:bg-gold-light/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-dark';

const PRIMARY_BUTTON_CLASS =
  'min-h-11 rounded-md bg-cta px-4 py-2 font-semibold text-white shadow-primary transition-transform active:scale-95 hover:brightness-110 disabled:opacity-50 disabled:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-light';

export function StepRenderer<A extends Record<string, unknown>>({
  step,
  options,
  validationError,
  onSubmit,
}: StepRendererProps<A>) {
  switch (step.type) {
    case 'quick-tap':
      return (
        <div className="flex flex-wrap gap-2" role="group" aria-label={typeof step.prompt === 'string' ? step.prompt : step.id}>
          {options?.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              className={QUICK_TAP_BUTTON_CLASS}
              onClick={() => onSubmit(option.value)}
            >
              {option.label}
            </button>
          ))}
          {validationError && (
            <p role="alert" className="w-full text-sm text-terracotta-dark">
              {validationError}
            </p>
          )}
        </div>
      );
    case 'multi-select':
      return <MultiSelectInput step={step} options={options ?? []} validationError={validationError} onSubmit={onSubmit} />;
    case 'date':
      return <ShortcutDateInput step={step} validationError={validationError} onSubmit={onSubmit} />;
    case 'time':
    case 'text':
    case 'number':
      return <FreeTextInput step={step} validationError={validationError} onSubmit={onSubmit} />;
    case 'slider':
      return <SliderInput step={step} validationError={validationError} onSubmit={onSubmit} />;
    case 'photo':
      return <PhotoInput onSubmit={onSubmit} />;
    case 'confirm':
      return (
        <div className="flex gap-2">
          <button type="button" className={QUICK_TAP_BUTTON_CLASS} onClick={() => onSubmit(true)}>
            Yes
          </button>
          <button type="button" className={QUICK_TAP_BUTTON_CLASS} onClick={() => onSubmit(false)}>
            No
          </button>
        </div>
      );
    default:
      return null;
  }
}

function FreeTextInput({
  step,
  validationError,
  onSubmit,
}: {
  step: DisplayStep;
  validationError: string | null;
  onSubmit: (value: unknown) => void;
}) {
  const [value, setValue] = useState('');
  const inputType = step.type === 'number' ? 'number' : step.type === 'time' ? 'time' : 'text';

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(step.type === 'number' ? Number(value) : value);
  }

  return (
    <form className="flex flex-col gap-2" onSubmit={handleSubmit}>
      <label htmlFor={`step-${step.id}`} className="sr-only">
        {typeof step.prompt === 'string' ? step.prompt : step.id}
      </label>
      <div className="flex gap-2">
        <input
          id={`step-${step.id}`}
          type={inputType}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-h-11 flex-1 rounded-lg border border-ink-200 bg-cream-100 px-3 py-2 text-ink-800 placeholder:text-ink-400 focus:border-gold-dark focus:outline-none focus:ring-1 focus:ring-gold-dark"
          aria-invalid={validationError ? true : undefined}
        />
        <button type="submit" className={PRIMARY_BUTTON_CLASS}>
          Send
        </button>
      </div>
      {validationError && (
        <p role="alert" className="text-sm text-terracotta-dark">
          {validationError}
        </p>
      )}
    </form>
  );
}

function ShortcutDateInput({
  step,
  validationError,
  onSubmit,
}: {
  step: DisplayStep;
  validationError: string | null;
  onSubmit: (value: unknown) => void;
}) {
  const [customValue, setCustomValue] = useState('');
  const today = new Date();
  const shortcut = step.dateShortcut ?? 'tomorrow';
  const otherDay = new Date(today);
  otherDay.setDate(today.getDate() + (shortcut === 'yesterday' ? -1 : 1));
  const toISODate = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={QUICK_TAP_BUTTON_CLASS} onClick={() => onSubmit(toISODate(today))}>
          Today
        </button>
        <button type="button" className={QUICK_TAP_BUTTON_CLASS} onClick={() => onSubmit(toISODate(otherDay))}>
          {shortcut === 'yesterday' ? 'Yesterday' : 'Tomorrow'}
        </button>
      </div>
      <div className="flex gap-2">
        <label htmlFor={`step-${step.id}`} className="sr-only">
          Pick a date
        </label>
        <input
          id={`step-${step.id}`}
          type="date"
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          className="min-h-11 flex-1 rounded-lg border border-ink-200 bg-cream-100 px-3 py-2 text-ink-800 focus:border-gold-dark focus:outline-none focus:ring-1 focus:ring-gold-dark"
        />
        <button
          type="button"
          disabled={!customValue}
          className={PRIMARY_BUTTON_CLASS}
          onClick={() => onSubmit(customValue)}
        >
          Pick Date
        </button>
      </div>
      {validationError && (
        <p role="alert" className="text-sm text-terracotta-dark">
          {validationError}
        </p>
      )}
    </div>
  );
}

function SliderInput({
  step,
  validationError,
  onSubmit,
}: {
  step: DisplayStep;
  validationError: string | null;
  onSubmit: (value: unknown) => void;
}) {
  const min = step.min ?? 1;
  const max = step.max ?? 10;
  const [value, setValue] = useState(Math.round((min + max) / 2));

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="font-serif text-2xl font-medium text-ink-800">
        {value}
      </p>
      <input
        id={`step-${step.id}`}
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={typeof step.prompt === 'string' ? step.prompt : step.id}
        onChange={(e) => setValue(Number(e.target.value))}
        className="min-h-11 accent-gold-dark"
      />
      <button type="button" className={clsx(PRIMARY_BUTTON_CLASS, 'self-start')} onClick={() => onSubmit(value)}>
        Confirm
      </button>
      {validationError && (
        <p role="alert" className="text-sm text-terracotta-dark">
          {validationError}
        </p>
      )}
    </div>
  );
}

function MultiSelectInput({
  step,
  options,
  validationError,
  onSubmit,
}: {
  step: DisplayStep;
  options: StepOption[];
  validationError: string | null;
  onSubmit: (value: unknown) => void;
}) {
  // Defaults to all options selected — the only current multi-select use case
  // (interview reminders) matches the product doc's "all pre-checked" UX.
  const [selected, setSelected] = useState<Set<string | number>>(() => new Set(options.map((o) => o.value)));

  function toggle(value: string | number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={typeof step.prompt === 'string' ? step.prompt : step.id}>
        {options.map((option) => {
          const isSelected = selected.has(option.value);
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(option.value)}
              className={clsx(
                QUICK_TAP_BUTTON_CLASS,
                isSelected && 'border-border-active bg-primary/15 text-white hover:bg-primary/20',
              )}
            >
              {isSelected ? '✓ ' : ''}
              {option.label}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={() => onSubmit(Array.from(selected))} className={clsx(PRIMARY_BUTTON_CLASS, 'self-start')}>
        Confirm
      </button>
      {validationError && (
        <p role="alert" className="text-sm text-terracotta-dark">
          {validationError}
        </p>
      )}
    </div>
  );
}

function PhotoInput({ onSubmit }: { onSubmit: (value: unknown) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className={clsx(QUICK_TAP_BUTTON_CLASS, 'cursor-pointer')}>
        📸 Take Photos
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="sr-only"
          onChange={(e) => onSubmit(Array.from(e.target.files ?? []))}
        />
      </label>
      <label className={clsx(QUICK_TAP_BUTTON_CLASS, 'cursor-pointer')}>
        Upload
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => onSubmit(Array.from(e.target.files ?? []))}
        />
      </label>
    </div>
  );
}
