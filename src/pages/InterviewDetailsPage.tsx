import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChatFlow } from '@/chat-flow';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { SecondaryPageHeader } from '@/components/SecondaryPageHeader';
import { Chip } from '@/components/Chip';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import { useCancelInterview, useInterview } from '@/domains/interviews/api';
import { createFeedbackFlow, createInterviewRescheduleFlow, createRoundResultFlow } from '@/domains/interviews/flowConfig';
import { hoursUntilInterview, isReminderActive } from '@/domains/interviews/utils';
import { formatEnumLabel } from '@/domains/applications/utils';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';

const PREP_SECTIONS = [
  {
    title: '📚 Research Company',
    items: ['Recent news', 'Products & services', 'Team size', 'Glassdoor rating', 'Culture notes'],
  },
  {
    title: '💻 Study Technical Topics',
    items: ['System Design', 'API Design', 'Data Structures', 'Algorithms', 'Problem solving'],
  },
  {
    title: '🎤 Practice Questions',
    items: [
      'Tell about your biggest challenge',
      'Why this company?',
      'Strengths & weaknesses?',
      'Where do you see yourself?',
    ],
  },
  { title: '🧪 Test Your Setup', items: ['Webcam working?', 'Microphone clear?', 'Internet speed OK?', 'Good lighting?'] },
  { title: '📝 Prepare Questions', items: ['Team structure?', 'Tech stack?', 'Career growth?', 'Next steps timeline?'] },
];

type ActivePanel = 'feedback' | 'round-result' | 'reschedule' | null;

export default function InterviewDetailsPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const tripQuery = useCurrentTrip();
  const interviewQuery = useInterview(interviewId);
  const cancelMutation = useCancelInterview(tripQuery.data?.id);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const header = <SecondaryPageHeader title="Interview Details & Prep" />;

  if (interviewQuery.isLoading) {
    return (
      <>
        {header}
        <main className="px-4 py-6">
          <p role="status">Loading…</p>
        </main>
      </>
    );
  }

  if (interviewQuery.isError || !interviewQuery.data) {
    return (
      <>
        {header}
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState
            message="Couldn't load this interview. Check your connection and try again."
            onRetry={() => void interviewQuery.refetch()}
          />
        </main>
      </>
    );
  }

  const interview = interviewQuery.data;
  const hoursUntil = hoursUntilInterview(interview.interview_date, interview.interview_time);
  const reminderActive = isReminderActive(interview, hoursUntil);
  const feedbackFlow = createFeedbackFlow(interview.id);
  const roundResultFlow = createRoundResultFlow(interview.id);
  const rescheduleFlow = createInterviewRescheduleFlow(interview.id);

  function closePanel() {
    setActivePanel(null);
    void interviewQuery.refetch();
  }

  return (
    <>
      {header}
      <main className="flex flex-col gap-4 px-4 py-6">
        <Card title={interview.companyName}>
          <p className="text-base font-medium text-text-primary">{interview.positionTitle}</p>
          <p className="text-sm text-text-secondary">
            Round {interview.round_number} · {formatEnumLabel(interview.type)}
          </p>
          <p className="text-sm text-text-secondary">
            {interview.interview_date} @ {interview.interview_time}
          </p>
          <div className="flex flex-wrap gap-2">
            <Chip>{formatEnumLabel(interview.interview_status)}</Chip>
            {interview.round_result !== 'pending' && <Chip tone="success">{formatEnumLabel(interview.round_result)}</Chip>}
          </div>
          {(interview.interviewer_name || interview.interviewer_role) && (
            <p className="text-sm text-text-secondary">
              With: {interview.interviewer_name} {interview.interviewer_role && `(${interview.interviewer_role})`}
            </p>
          )}
          {interview.meeting_link && (
            <a href={interview.meeting_link} className="text-sm text-primary-light underline">
              Join video call
            </a>
          )}
          {interview.prep_notes && <p className="text-sm text-text-secondary">Prep notes: {interview.prep_notes}</p>}
          {reminderActive && hoursUntil >= 0 && (
            <Chip tone="warning">
              <span role="status">
                🔔 {Math.round(hoursUntil)} hour{Math.round(hoursUntil) === 1 ? '' : 's'} left
              </span>
            </Chip>
          )}
          {interview.interview_status !== 'cancelled' && (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton type="button" onClick={() => setActivePanel(activePanel === 'round-result' ? null : 'round-result')}>
                Mark Round Result
              </SecondaryButton>
              <SecondaryButton type="button" onClick={() => setActivePanel(activePanel === 'reschedule' ? null : 'reschedule')}>
                Reschedule
              </SecondaryButton>
              <SecondaryButton type="button" disabled={cancelMutation.isPending} onClick={() => cancelMutation.mutate(interview.id, { onSuccess: () => void interviewQuery.refetch() })}>
                Cancel Interview
              </SecondaryButton>
            </div>
          )}
        </Card>

        {activePanel === 'round-result' && <ChatFlow flow={roundResultFlow} onFinished={closePanel} />}
        {activePanel === 'reschedule' && <ChatFlow flow={rescheduleFlow} onFinished={closePanel} />}

        {PREP_SECTIONS.map((section) => (
          <Card key={section.title} title={section.title}>
            <ul className="list-inside list-disc text-sm text-text-secondary">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}

        {interview.outcome === 'pending' ? (
          activePanel === 'feedback' ? (
            <ChatFlow flow={feedbackFlow} onFinished={closePanel} />
          ) : (
            <PrimaryButton type="button" onClick={() => setActivePanel('feedback')} className="self-start">
              Log Post-Interview Feedback
            </PrimaryButton>
          )
        ) : (
          <Card title="Feedback">
            <p className="text-base font-medium capitalize text-text-primary">{interview.outcome.replace('_', ' ')}</p>
            <p className="text-sm text-text-secondary">Confidence: {interview.confidence_rating}/10</p>
            {interview.feedback_notes && <p className="text-sm text-text-secondary">{interview.feedback_notes}</p>}
          </Card>
        )}
      </main>
    </>
  );
}
