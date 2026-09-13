import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChatFlow } from '@/chat-flow';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { Chip } from '@/components/Chip';
import { PrimaryButton } from '@/components/Button';
import { useInterview } from '@/domains/interviews/api';
import { createFeedbackFlow } from '@/domains/interviews/flowConfig';
import { hoursUntilInterview, isReminderActive } from '@/domains/interviews/utils';

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

export default function InterviewDetailsPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const interviewQuery = useInterview(interviewId);
  const [isLoggingFeedback, setIsLoggingFeedback] = useState(false);

  if (interviewQuery.isLoading) {
    return (
      <main className="px-4 py-6">
        <p role="status">Loading…</p>
      </main>
    );
  }

  if (interviewQuery.isError || !interviewQuery.data) {
    return (
      <main className="flex flex-col gap-4 px-4 py-6">
        <PageHeader title="Interview Details & Prep" />
        <ErrorState
          message="Couldn't load this interview. Check your connection and try again."
          onRetry={() => void interviewQuery.refetch()}
        />
      </main>
    );
  }

  const interview = interviewQuery.data;
  const hoursUntil = hoursUntilInterview(interview.interview_date, interview.interview_time);
  const reminderActive = isReminderActive(interview, hoursUntil);
  const feedbackFlow = createFeedbackFlow(interview.id);

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <PageHeader title="Interview Details & Prep" />

      <Card title={interview.companyName}>
        <p className="text-base font-medium text-text-primary">{interview.positionTitle}</p>
        <p className="text-sm text-text-secondary">
          {interview.interview_date} @ {interview.interview_time} · {interview.type.replace('_', ' ')}
        </p>
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
        {reminderActive && hoursUntil >= 0 && (
          <Chip tone="warning">
            <span role="status">
              🔔 {Math.round(hoursUntil)} hour{Math.round(hoursUntil) === 1 ? '' : 's'} left
            </span>
          </Chip>
        )}
      </Card>

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
        isLoggingFeedback ? (
          <ChatFlow flow={feedbackFlow} onFinished={() => void interviewQuery.refetch()} />
        ) : (
          <PrimaryButton type="button" onClick={() => setIsLoggingFeedback(true)} className="self-start">
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
  );
}
