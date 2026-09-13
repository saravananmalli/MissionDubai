import { useCallback, useEffect, useMemo, useReducer } from 'react';
import type { FlowDefinition, StepDefinition } from '@/chat-flow/types';

interface SubmissionState {
  status: 'idle' | 'submitting' | 'error' | 'success';
  error: string | null;
}

interface ChatFlowState<A extends Record<string, unknown>> {
  answers: Partial<A>;
  history: string[];
  currentStepId: string | 'END';
  submission: SubmissionState;
  /** Bumped by RESET_SUBMISSION so the submit effect (keyed on this + currentStepId,
   *  deliberately not on submission.status) knows to run again on retry. */
  submitToken: number;
  validationError: string | null;
}

type ChatFlowAction =
  | { type: 'ANSWER'; stepId: string; value: unknown; nextStepId: string | 'END' }
  | { type: 'SET_VALIDATION_ERROR'; message: string | null }
  | { type: 'GO_BACK' }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; message: string }
  | { type: 'RESET_SUBMISSION' };

function getStepById<A extends Record<string, unknown>>(
  flow: FlowDefinition<A>,
  stepId: string,
): StepDefinition<A> | undefined {
  return flow.steps.find((step) => step.id === stepId);
}

function firstVisibleStepId<A extends Record<string, unknown>>(
  flow: FlowDefinition<A>,
  answers: Partial<A>,
): string | 'END' {
  const step = flow.steps.find((s) => !s.visibleIf || s.visibleIf(answers));
  return step?.id ?? 'END';
}

function resolveNextStepId<A extends Record<string, unknown>>(
  flow: FlowDefinition<A>,
  currentStep: StepDefinition<A>,
  value: unknown,
  answersAfter: Partial<A>,
): string | 'END' {
  if (currentStep.next) {
    return currentStep.next(value, answersAfter);
  }
  const currentIndex = flow.steps.findIndex((s) => s.id === currentStep.id);
  for (let i = currentIndex + 1; i < flow.steps.length; i++) {
    const step = flow.steps[i]!;
    if (!step.visibleIf || step.visibleIf(answersAfter)) {
      return step.id;
    }
  }
  return 'END';
}

function chatFlowReducer<A extends Record<string, unknown>>(
  state: ChatFlowState<A>,
  action: ChatFlowAction,
): ChatFlowState<A> {
  switch (action.type) {
    case 'SET_VALIDATION_ERROR':
      return { ...state, validationError: action.message };
    case 'ANSWER': {
      const answers = { ...state.answers, [action.stepId]: action.value } as Partial<A>;
      return {
        ...state,
        answers,
        history: [...state.history, action.stepId],
        currentStepId: action.nextStepId,
        validationError: null,
      };
    }
    case 'GO_BACK': {
      if (state.history.length === 0) return state;
      const history = state.history.slice(0, -1);
      const previousStepId = state.history[state.history.length - 1]!;
      return {
        ...state,
        history,
        currentStepId: previousStepId,
        validationError: null,
        submission: { status: 'idle', error: null },
      };
    }
    case 'SUBMIT_START':
      return { ...state, submission: { status: 'submitting', error: null } };
    case 'SUBMIT_SUCCESS':
      return { ...state, submission: { status: 'success', error: null } };
    case 'SUBMIT_ERROR':
      return { ...state, submission: { status: 'error', error: action.message } };
    case 'RESET_SUBMISSION':
      return { ...state, submission: { status: 'idle', error: null }, submitToken: state.submitToken + 1 };
    default:
      return state;
  }
}

export function useChatFlow<A extends Record<string, unknown>>(flow: FlowDefinition<A>) {
  const [state, dispatch] = useReducer(chatFlowReducer<A>, undefined, () => ({
    answers: {},
    history: [] as string[],
    currentStepId: firstVisibleStepId(flow, {}),
    submission: { status: 'idle', error: null } as SubmissionState,
    submitToken: 0,
    validationError: null,
  }));

  const currentStep = state.currentStepId === 'END' ? null : getStepById(flow, state.currentStepId) ?? null;

  const submitAnswer = useCallback(
    (value: unknown) => {
      if (!currentStep) return;
      const validationMessage = currentStep.validate ? currentStep.validate(value, state.answers) : null;
      if (validationMessage) {
        dispatch({ type: 'SET_VALIDATION_ERROR', message: validationMessage });
        return;
      }
      const answersAfter = { ...state.answers, [currentStep.id]: value } as Partial<A>;
      const nextStepId = resolveNextStepId(flow, currentStep, value, answersAfter);
      dispatch({ type: 'ANSWER', stepId: currentStep.id, value, nextStepId });
    },
    [currentStep, flow, state.answers],
  );

  const skip = useCallback(() => {
    if (!currentStep || !currentStep.skippable) return;
    const value = currentStep.skipValue;
    const answersAfter = { ...state.answers, [currentStep.id]: value } as Partial<A>;
    const nextStepId = resolveNextStepId(flow, currentStep, value, answersAfter);
    dispatch({ type: 'ANSWER', stepId: currentStep.id, value, nextStepId });
  }, [currentStep, flow, state.answers]);

  const goBack = useCallback(() => dispatch({ type: 'GO_BACK' }), []);

  const retry = useCallback(() => dispatch({ type: 'RESET_SUBMISSION' }), []);

  // Submission is a side effect of reaching 'END', kept out of the reducer so
  // the reducer itself (branching/skip/validate/back) stays pure and testable
  // without mocking async work. Deliberately keyed on submitToken rather than
  // submission.status: SUBMIT_START below changes status, and if status were
  // a dependency that write would immediately re-run (and cancel) this same
  // effect before the promise it just started ever resolves.
  useEffect(() => {
    if (state.currentStepId !== 'END') return;
    let cancelled = false;
    dispatch({ type: 'SUBMIT_START' });
    flow
      .onComplete(state.answers as A)
      .then(() => {
        if (!cancelled) dispatch({ type: 'SUBMIT_SUCCESS' });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          dispatch({ type: 'SUBMIT_ERROR', message: err instanceof Error ? err.message : 'Something went wrong.' });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally excludes `flow`/`state.answers`: resubmission is driven only by reaching END or bumping submitToken via retry()
  }, [state.currentStepId, state.submitToken]);

  const resolvedPrompt = useMemo(() => {
    if (!currentStep) return null;
    return typeof currentStep.prompt === 'function' ? currentStep.prompt(state.answers) : currentStep.prompt;
  }, [currentStep, state.answers]);

  const resolvedOptions = useMemo(() => {
    if (!currentStep?.options) return undefined;
    return typeof currentStep.options === 'function' ? currentStep.options(state.answers) : currentStep.options;
  }, [currentStep, state.answers]);

  return {
    currentStep,
    prompt: resolvedPrompt,
    options: resolvedOptions,
    answers: state.answers,
    history: state.history,
    canGoBack: state.history.length > 0,
    isComplete: state.submission.status === 'success',
    isSubmitting: state.submission.status === 'submitting',
    submitError: state.submission.error,
    validationError: state.validationError,
    submitAnswer,
    skip,
    goBack,
    retry,
  };
}
