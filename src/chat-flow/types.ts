export type StepType = 'quick-tap' | 'text' | 'number' | 'date' | 'time' | 'multi-select' | 'slider' | 'photo' | 'confirm';

export interface StepOption {
  label: string;
  value: string | number;
}

export interface StepDefinition<A extends Record<string, unknown> = Record<string, unknown>> {
  /** Key this step's answer is written under in `answers`. */
  id: string;
  type: StepType;
  /** Bot message. Can reference prior answers for flows like "Confirm the {company} interview?" */
  prompt: string | ((answers: Partial<A>) => string);
  /** Quick-tap / multi-select choices. */
  options?: StepOption[] | ((answers: Partial<A>) => StepOption[]);
  /** Slider bounds, used when type === 'slider'. */
  min?: number;
  max?: number;
  /** Second quick shortcut for type === 'date': "Tomorrow" (default) or "Yesterday". */
  dateShortcut?: 'tomorrow' | 'yesterday';
  skippable?: boolean;
  /** Value recorded in `answers` when the user skips. Defaults to undefined. */
  skipValue?: unknown;
  skipLabel?: string;
  /** Return an error message to block the answer, or null to accept it. */
  validate?: (value: unknown, answers: Partial<A>) => string | null;
  /** Step is only reachable when this returns true (or is omitted). */
  visibleIf?: (answers: Partial<A>) => boolean;
  /** Dynamic branching: return the next step's id, or 'END' to finish the flow. */
  next?: (value: unknown, answers: Partial<A>) => string | 'END';
}

export interface FlowDefinition<A extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  steps: StepDefinition<A>[];
  onComplete: (answers: A) => Promise<void>;
}
