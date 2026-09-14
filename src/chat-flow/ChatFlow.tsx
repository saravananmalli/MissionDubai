import { useEffect } from 'react';
import { useChatFlow } from '@/chat-flow/useChatFlow';
import { StepRenderer } from '@/chat-flow/StepRenderer';
import type { FlowDefinition, StepDefinition, StepOption } from '@/chat-flow/types';

interface ChatFlowProps<A extends Record<string, unknown>> {
  flow: FlowDefinition<A>;
  onFinished?: (answers: A) => void;
}

function resolveOptionsFor<A extends Record<string, unknown>>(
  step: StepDefinition<A>,
  answers: Partial<A>,
): StepOption[] | undefined {
  if (!step.options) return undefined;
  return typeof step.options === 'function' ? step.options(answers) : step.options;
}

function formatAnswer<A extends Record<string, unknown>>(step: StepDefinition<A>, value: unknown, answers: Partial<A>): string {
  if (step.skippable && value === step.skipValue) {
    return step.skipLabel ?? "Skipped — I'll update later";
  }
  const options = resolveOptionsFor(step, answers);
  const matchedOption = options?.find((option) => option.value === value);
  if (matchedOption) return matchedOption.label;
  if (Array.isArray(value)) return `${value.length} photo${value.length === 1 ? '' : 's'}`;
  return String(value);
}

export function ChatFlow<A extends Record<string, unknown>>({ flow, onFinished }: ChatFlowProps<A>) {
  const chat = useChatFlow(flow);

  useEffect(() => {
    if (chat.isComplete) onFinished?.(chat.answers as A);
  }, [chat.isComplete, chat.answers, onFinished]);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <ol role="log" aria-live="polite" aria-label="Conversation" className="flex flex-col gap-3">
        {chat.history.map((stepId) => {
          const step = flow.steps.find((s) => s.id === stepId);
          if (!step) return null;
          const prompt = typeof step.prompt === 'function' ? step.prompt(chat.answers) : step.prompt;
          return (
            <li key={stepId} className="flex flex-col gap-1">
              <p className="text-sm text-ink-500">{prompt}</p>
              <p className="self-end rounded-2xl bg-primary/20 px-3 py-1.5 text-sm text-white">
                {formatAnswer(step, chat.answers[stepId as keyof A], chat.answers)}
              </p>
            </li>
          );
        })}
      </ol>

      {chat.currentStep && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface/[0.85] p-5 shadow-card backdrop-blur-md">
          <p className="font-sans text-lg font-semibold text-text-primary">{chat.prompt}</p>
          <StepRenderer
            // Keyed by step id so each step gets a fresh input component instance —
            // without this, consecutive text/date/slider/multi-select steps reuse
            // the same mounted component and its internal (uncontrolled) local
            // state, so whatever was typed into one field bleeds into the next.
            key={chat.currentStep.id}
            step={chat.currentStep}
            options={chat.options}
            validationError={chat.validationError}
            onSubmit={chat.submitAnswer}
          />
          <div className="flex justify-between text-sm">
            {chat.canGoBack ? (
              <button type="button" onClick={chat.goBack} className="min-h-11 px-2 text-ink-500 underline hover:text-gold-dark">
                Back
              </button>
            ) : (
              <span />
            )}
            {chat.currentStep.skippable && (
              <button type="button" onClick={chat.skip} className="min-h-11 px-2 text-ink-500 underline hover:text-gold-dark">
                {chat.currentStep.skipLabel ?? "Skip — I'll update later"}
              </button>
            )}
          </div>
        </div>
      )}

      {chat.isSubmitting && (
        <p role="status" aria-live="polite" className="text-sm text-ink-500">
          Saving…
        </p>
      )}

      {chat.submitError && (
        <div role="alert" className="flex flex-col gap-2 rounded-xl border border-terracotta-light bg-terracotta-light/60 p-4 text-sm text-terracotta-dark">
          <p>{chat.submitError}</p>
          <button
            type="button"
            onClick={chat.retry}
            className="min-h-11 self-start rounded-lg border border-terracotta/40 px-4 py-1.5 font-medium hover:bg-terracotta-light"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
