import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { ChatFlow } from '@/chat-flow';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { SecondaryPageHeader } from '@/components/SecondaryPageHeader';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/Button';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useApplications } from '@/domains/applications/api';
import { useInterviews } from '@/domains/interviews/api';
import { createScheduleInterviewFlow } from '@/domains/interviews/flowConfig';

const CALENDAR_THEME_VARS = {
  '--rdp-accent-color': '#A83CFF',
  '--rdp-accent-background-color': '#301542',
  '--rdp-today-color': '#D72BC8',
} as CSSProperties;

export default function InterviewCalendarPage() {
  const tripQuery = useCurrentTrip();
  const applicationsQuery = useApplications(tripQuery.data?.id);
  const interviewsQuery = useInterviews(tripQuery.data?.id);
  const [isScheduling, setIsScheduling] = useState(false);
  const header = <SecondaryPageHeader title="Interview Calendar" />;

  if (tripQuery.isLoading || applicationsQuery.isLoading) {
    return (
      <>
        {header}
        <main className="px-4 py-6">
          <p role="status">Loading…</p>
        </main>
      </>
    );
  }

  if (tripQuery.isError) {
    return (
      <>
        {header}
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState message="Couldn't load your trip. Check your connection and try again." onRetry={() => void tripQuery.refetch()} />
        </main>
      </>
    );
  }

  const applications = applicationsQuery.data ?? [];
  const interviews = interviewsQuery.data ?? [];
  const interviewDates = interviews.map((interview) => new Date(`${interview.interview_date}T00:00:00`));
  const scheduleFlow = createScheduleInterviewFlow(applications.map((a) => ({ id: a.id, company_name: a.company_name })));

  function handleFinished() {
    setIsScheduling(false);
    void interviewsQuery.refetch();
  }

  return (
    <>
      {header}
      <main className="flex flex-col gap-4 px-4 py-6">
        <div className="rounded-2xl border border-ink-100 bg-cream-100 p-3 shadow-sm">
          <DayPicker
            modifiers={{ interview: interviewDates }}
            modifiersClassNames={{ interview: 'bg-primary text-white rounded-full' }}
            style={CALENDAR_THEME_VARS}
          />
        </div>

        {interviewsQuery.isError && (
          <ErrorState
            message="Couldn't load your interviews. Check your connection and try again."
            onRetry={() => void interviewsQuery.refetch()}
          />
        )}

        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">Upcoming Interviews</h2>
          {interviews.length === 0 && <EmptyState message="No interviews scheduled yet." />}
          {interviews.map((interview) => (
            <Link key={interview.id} to={`/interviews/${interview.id}`} className="block">
              <Card title={interview.companyName}>
                <p className="text-sm text-ink-500">
                  {interview.interview_date} @ {interview.interview_time} · {interview.type.replace('_', ' ')}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        {applications.length === 0 ? (
          <EmptyState message="Add a job application first before scheduling an interview." />
        ) : isScheduling ? (
          <ChatFlow flow={scheduleFlow} onFinished={handleFinished} />
        ) : (
          <PrimaryButton type="button" onClick={() => setIsScheduling(true)} className="self-start">
            + Schedule Interview
          </PrimaryButton>
        )}
      </main>
    </>
  );
}
