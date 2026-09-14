import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { clsx } from 'clsx';
import { ChatFlow } from '@/chat-flow';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { SecondaryButton } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { SecondaryPageHeader } from '@/components/SecondaryPageHeader';
import { useApplication, useApplicationEvents, useSubmitStatusUpdate } from '@/domains/applications/api';
import { useInterviewsForApplication } from '@/domains/interviews/api';
import { createFinalOutcomeFlow, createFollowUpFlow, createResumeFlow } from '@/domains/applications/flowConfig';
import { createInterviewRoundFlow } from '@/domains/interviews/flowConfig';
import { ApplicationEditForm } from '@/domains/applications/components/ApplicationEditForm';
import { RoundsTimeline } from '@/domains/applications/components/RoundsTimeline';
import { ApplicationTimeline } from '@/domains/applications/components/ApplicationTimeline';
import { getApplicationRecommendations } from '@/domains/applications/recommendations';
import { formatEnumLabel, formatSourceLabel } from '@/domains/applications/utils';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import type { ApplicationStatus } from '@/lib/database.types';

const STATUS_OPTIONS: ApplicationStatus[] = [
  'saved',
  'applied',
  'waiting_response',
  'response_received',
  'interviewing',
  'offer',
  'hired',
  'on_hold',
  'no_response',
  'rejected',
  'candidate_rejected',
  'withdrawn',
  'closed',
];

type ActivePanel = 'edit' | 'interview' | 'followup' | 'resume' | 'outcome' | null;

export default function ApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const tripQuery = useCurrentTrip();
  const applicationQuery = useApplication(applicationId);
  const interviewsQuery = useInterviewsForApplication(applicationId);
  const eventsQuery = useApplicationEvents(applicationId);
  const statusMutation = useSubmitStatusUpdate(tripQuery.data?.id);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);

  const header = <SecondaryPageHeader title="Application Details" />;

  if (applicationQuery.isLoading) {
    return (
      <>
        {header}
        <main className="px-4 py-6">
          <p role="status">Loading…</p>
        </main>
      </>
    );
  }

  if (applicationQuery.isError || !applicationQuery.data) {
    return (
      <>
        {header}
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState
            message="Couldn't load this application. Check your connection and try again."
            onRetry={() => void applicationQuery.refetch()}
          />
        </main>
      </>
    );
  }

  const application = applicationQuery.data;
  const interviews = interviewsQuery.data ?? [];
  const events = eventsQuery.data ?? [];
  const recommendations = getApplicationRecommendations(application, interviews, events);

  function togglePanel(panel: ActivePanel) {
    setActivePanel((current) => (current === panel ? null : panel));
  }

  function closePanel() {
    setActivePanel(null);
    void interviewsQuery.refetch();
    void eventsQuery.refetch();
    void applicationQuery.refetch();
  }

  return (
    <>
      {header}
      <main className="flex flex-col gap-4 px-4 py-6">
        <Card title={application.company_name}>
          <p className="text-base font-medium text-text-primary">{application.position_title}</p>
          {application.location && <p className="text-sm text-text-secondary">{application.location}</p>}
          <div className="flex flex-wrap gap-2">
            <Chip>{formatEnumLabel(application.status)}</Chip>
            {application.final_outcome && <Chip tone="success">{formatEnumLabel(application.final_outcome)}</Chip>}
          </div>
        </Card>

        {recommendations.length > 0 && (
          <Card title="AI Recommendations">
            <div className="flex flex-col gap-2">
              {recommendations.map((message) => (
                <Chip key={message} tone="warning">
                  {message}
                </Chip>
              ))}
            </div>
          </Card>
        )}

        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={() => togglePanel('edit')}>
            Edit
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => togglePanel('interview')}>
            Add Interview
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => togglePanel('followup')}>
            Add Follow-up
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => togglePanel('resume')}>
            Resume
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => togglePanel('outcome')}>
            Set Final Outcome
          </SecondaryButton>
        </div>

        {activePanel === 'edit' && (
          <ApplicationEditForm application={application} tripId={tripQuery.data?.id} onSaved={closePanel} onCancel={() => setActivePanel(null)} />
        )}
        {activePanel === 'interview' && (
          <ChatFlow flow={createInterviewRoundFlow(application.id, application.company_name)} onFinished={closePanel} />
        )}
        {activePanel === 'followup' && <ChatFlow flow={createFollowUpFlow(application.id)} onFinished={closePanel} />}
        {activePanel === 'resume' && <ChatFlow flow={createResumeFlow(application.id)} onFinished={closePanel} />}
        {activePanel === 'outcome' && <ChatFlow flow={createFinalOutcomeFlow(application.id)} onFinished={closePanel} />}

        <Card title="Job Details">
          <p className="text-sm text-text-secondary">Source: {formatSourceLabel(application.source, application.source_name)}</p>
          {application.application_url && (
            <a href={application.application_url} className="text-sm text-primary-light underline">
              Job posting
            </a>
          )}
        </Card>

        <Card title="Application Details">
          <p className="text-sm text-text-secondary">Applied: {application.applied_date}</p>
          {application.salary_status === 'will_update_later' ? (
            <Chip tone="warning">⚠️ Salary: (Will update later)</Chip>
          ) : (
            <p className="text-sm text-text-secondary">
              Salary: {application.salary_min_aed?.toLocaleString()}–{application.salary_max_aed?.toLocaleString()} AED/month
            </p>
          )}
          <p className="text-sm text-text-secondary">Visa sponsorship: {formatEnumLabel(application.visa_sponsorship)}</p>
          {application.contact_name ? (
            <p className="text-sm text-text-secondary">Contact: {application.contact_name}</p>
          ) : (
            <Chip tone="warning">⚠️ Contact: (Not added)</Chip>
          )}
        </Card>

        <Card title="Resume / Documents">
          <p className="text-sm text-text-secondary">Status: {formatEnumLabel(application.resume_status)}</p>
          {application.resume_version && <p className="text-sm text-text-secondary">Version: {application.resume_version}</p>}
          {application.resume_submitted_date && <p className="text-sm text-text-secondary">Submitted: {application.resume_submitted_date}</p>}
          <p className="text-sm text-text-secondary">Cover letter: {application.cover_letter_submitted ? 'Yes' : 'No'}</p>
        </Card>

        <Card title="Interview Rounds">
          <RoundsTimeline interviews={interviews} />
        </Card>

        <Card title="Timeline">
          <ApplicationTimeline events={events} />
        </Card>

        <Card title="Notes">
          <p className="text-sm text-text-secondary">{application.notes || 'No notes yet.'}</p>
        </Card>

        <Card title="Update Status">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => statusMutation.mutate({ applicationId: application.id, status }, { onSuccess: closePanel })}
                className={clsx(
                  'min-h-11 rounded-full px-3 py-1 text-xs font-medium capitalize ring-1 ring-inset',
                  status === application.status ? 'bg-primary-light/20 text-primary-light ring-primary-light' : 'text-text-secondary ring-border',
                )}
              >
                {formatEnumLabel(status)}
              </button>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
