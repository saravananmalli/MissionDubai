import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatFlow } from '@/chat-flow/ChatFlow';
import type { FlowDefinition } from '@/chat-flow/types';

interface DemoAnswers extends Record<string, unknown> {
  source?: string;
  company?: string;
}

function demoFlow(onComplete = vi.fn().mockResolvedValue(undefined)): FlowDefinition<DemoAnswers> {
  return {
    id: 'demo',
    onComplete,
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
        id: 'company',
        type: 'text',
        prompt: 'Company name?',
        skippable: true,
        skipValue: 'will_update_later',
        skipLabel: "Skip - I'll update later",
      },
    ],
  };
}

describe('ChatFlow', () => {
  it('renders the transcript for completed steps and calls onFinished with the final answers', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const onFinished = vi.fn();

    render(<ChatFlow flow={demoFlow(onComplete)} onFinished={onFinished} />);

    expect(screen.getByText('Where did you find this?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'LinkedIn' }));

    // The answered step now shows in the transcript log, and the next prompt appears.
    expect(await screen.findByText('LinkedIn')).toBeInTheDocument();
    expect(await screen.findByLabelText('Company name?')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Company name?'), 'Tech Corp UAE');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(onFinished).toHaveBeenCalledWith({ source: 'linkedin', company: 'Tech Corp UAE' }));
    expect(onComplete).toHaveBeenCalledWith({ source: 'linkedin', company: 'Tech Corp UAE' });
  });

  it("shows the skip sentinel's label in the transcript when a skippable step is skipped", async () => {
    const user = userEvent.setup();
    render(<ChatFlow flow={demoFlow()} />);

    await user.click(screen.getByRole('button', { name: 'LinkedIn' }));
    await user.click(screen.getByRole('button', { name: "Skip - I'll update later" }));

    expect(await screen.findByText("Skip - I'll update later")).toBeInTheDocument();
  });

  it('multi-select accumulates toggled choices and only submits once, on Confirm', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn().mockResolvedValue(undefined);
    const flow: FlowDefinition<{ reminders?: string[] }> = {
      id: 'reminders-demo',
      onComplete,
      steps: [
        {
          id: 'reminders',
          type: 'multi-select',
          prompt: 'Which reminders?',
          options: [
            { label: '24 hours before', value: '24h' },
            { label: '1 hour before', value: '1h' },
            { label: '15 minutes before', value: '15min' },
          ],
        },
      ],
    };

    render(<ChatFlow flow={flow} />);

    // All options default selected (checkmarked), matching the doc's "all pre-checked" UX.
    expect(screen.getByRole('button', { name: '✓ 24 hours before' })).toHaveAttribute('aria-pressed', 'true');

    // Deselecting one, clicking buttons must not submit immediately.
    await user.click(screen.getByRole('button', { name: '✓ 15 minutes before' }));
    expect(onComplete).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith({ reminders: ['24h', '1h'] }));
  });
});
