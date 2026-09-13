import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useChatFlow } from '@/chat-flow/useChatFlow';
import type { FlowDefinition } from '@/chat-flow/types';

interface DemoAnswers extends Record<string, unknown> {
  source?: 'linkedin' | 'company_site';
  company?: string;
  salary?: string;
  contactEmail?: string;
  confidence?: number;
}

function makeLinearFlow(onComplete = vi.fn().mockResolvedValue(undefined)): FlowDefinition<DemoAnswers> {
  return {
    id: 'demo-linear',
    onComplete,
    steps: [
      { id: 'company', type: 'text', prompt: 'Company name?' },
      {
        id: 'salary',
        type: 'quick-tap',
        prompt: 'Expected salary?',
        options: [{ label: '100-150k', value: '100-150k' }],
        skippable: true,
        skipValue: 'will_update_later',
      },
      {
        id: 'confidence',
        type: 'slider',
        prompt: 'Confidence?',
        min: 1,
        max: 10,
        validate: (value) => (typeof value === 'number' && value >= 1 && value <= 10 ? null : 'Pick 1-10'),
      },
    ],
  };
}

describe('useChatFlow', () => {
  it('walks a linear flow to completion and calls onComplete with all answers', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useChatFlow(makeLinearFlow(onComplete)));

    expect(result.current.currentStep?.id).toBe('company');

    act(() => result.current.submitAnswer('Tech Corp UAE'));
    expect(result.current.currentStep?.id).toBe('salary');

    act(() => result.current.submitAnswer('100-150k'));
    expect(result.current.currentStep?.id).toBe('confidence');

    act(() => result.current.submitAnswer(8));

    await waitFor(() => expect(result.current.isComplete).toBe(true));
    expect(onComplete).toHaveBeenCalledWith({
      company: 'Tech Corp UAE',
      salary: '100-150k',
      confidence: 8,
    });
  });

  it('records the skip sentinel and advances when a skippable step is skipped', () => {
    const { result } = renderHook(() => useChatFlow(makeLinearFlow()));

    act(() => result.current.submitAnswer('Tech Corp UAE'));
    act(() => result.current.skip());

    expect(result.current.answers.salary).toBe('will_update_later');
    expect(result.current.currentStep?.id).toBe('confidence');
  });

  it('blocks advancing on a validation failure and surfaces the error message', () => {
    const { result } = renderHook(() => useChatFlow(makeLinearFlow()));

    act(() => result.current.submitAnswer('Tech Corp UAE'));
    act(() => result.current.skip());

    act(() => result.current.submitAnswer(99));
    expect(result.current.currentStep?.id).toBe('confidence');
    expect(result.current.validationError).toBe('Pick 1-10');

    act(() => result.current.submitAnswer(7));
    expect(result.current.validationError).toBeNull();
  });

  it('skips a step whose visibleIf returns false', () => {
    const flow: FlowDefinition<DemoAnswers> = {
      id: 'demo-visible-if',
      onComplete: vi.fn().mockResolvedValue(undefined),
      steps: [
        {
          id: 'source',
          type: 'quick-tap',
          prompt: 'Where did you find this?',
          options: [
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Company Site', value: 'company_site' },
          ],
        },
        {
          id: 'contactEmail',
          type: 'text',
          prompt: 'Contact email?',
          visibleIf: (answers) => answers.source === 'company_site',
        },
        { id: 'company', type: 'text', prompt: 'Company name?' },
      ],
    };
    const { result } = renderHook(() => useChatFlow(flow));

    act(() => result.current.submitAnswer('linkedin'));
    // contactEmail's visibleIf is false for linkedin, so it's skipped straight to company.
    expect(result.current.currentStep?.id).toBe('company');
  });

  it('branches via a dynamic next(), replacing the two bespoke LinkedIn/company-site flows with one definition', () => {
    const flow: FlowDefinition<DemoAnswers> = {
      id: 'demo-branching',
      onComplete: vi.fn().mockResolvedValue(undefined),
      steps: [
        {
          id: 'source',
          type: 'quick-tap',
          prompt: 'Where did you find this?',
          options: [
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'Company Site', value: 'company_site' },
          ],
          next: (value) => (value === 'company_site' ? 'contactEmail' : 'company'),
        },
        { id: 'contactEmail', type: 'text', prompt: 'Contact email?' },
        { id: 'company', type: 'text', prompt: 'Company name?' },
      ],
    };

    const linkedinRun = renderHook(() => useChatFlow(flow));
    act(() => linkedinRun.result.current.submitAnswer('linkedin'));
    expect(linkedinRun.result.current.currentStep?.id).toBe('company');

    const companySiteRun = renderHook(() => useChatFlow(flow));
    act(() => companySiteRun.result.current.submitAnswer('company_site'));
    expect(companySiteRun.result.current.currentStep?.id).toBe('contactEmail');
  });

  it('goBack returns to the previous step and allows overwriting its answer', () => {
    const { result } = renderHook(() => useChatFlow(makeLinearFlow()));

    expect(result.current.canGoBack).toBe(false);

    act(() => result.current.submitAnswer('Tech Corp UAE'));
    act(() => result.current.submitAnswer('100-150k'));
    expect(result.current.currentStep?.id).toBe('confidence');
    expect(result.current.canGoBack).toBe(true);

    act(() => result.current.goBack());
    expect(result.current.currentStep?.id).toBe('salary');

    act(() => result.current.submitAnswer('150-200k'));
    expect(result.current.answers.salary).toBe('150-200k');
  });

  it('preserves collected answers on a submission failure and resubmits on retry without re-entering steps', async () => {
    const onComplete = vi.fn().mockRejectedValueOnce(new Error('network down')).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useChatFlow(makeLinearFlow(onComplete)));

    act(() => result.current.submitAnswer('Tech Corp UAE'));
    act(() => result.current.skip());
    act(() => result.current.submitAnswer(8));

    await waitFor(() => expect(result.current.submitError).toBe('network down'));
    expect(result.current.answers).toEqual({ company: 'Tech Corp UAE', salary: 'will_update_later', confidence: 8 });

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.isComplete).toBe(true));
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});
