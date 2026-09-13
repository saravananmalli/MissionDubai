import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatFlow } from '@/chat-flow';
import { ErrorState } from '@/components/ErrorState';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/Button';
import { applicationFlow } from '@/domains/applications/flowConfig';
import { useApplications } from '@/domains/applications/api';
import { ApplicationCard } from '@/domains/applications/components/ApplicationCard';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';

export default function ApplicationsPage() {
  const tripQuery = useCurrentTrip();
  const applicationsQuery = useApplications(tripQuery.data?.id);
  const [isAddingApplication, setIsAddingApplication] = useState(false);

  if (tripQuery.isLoading) {
    return (
      <main className="px-4 py-6">
        <p role="status">Loading…</p>
      </main>
    );
  }

  if (tripQuery.isError) {
    return (
      <main className="flex flex-col gap-4 px-4 py-6">
        <PageHeader title="Applications & Company Visits" />
        <ErrorState message="Couldn't load your trip. Check your connection and try again." onRetry={() => void tripQuery.refetch()} />
      </main>
    );
  }

  const applications = applicationsQuery.data ?? [];

  function handleFinished() {
    setIsAddingApplication(false);
    void tripQuery.refetch();
    void applicationsQuery.refetch();
  }

  return (
    <main className="flex flex-col gap-4 px-4 py-6">
      <PageHeader
        title="Applications & Company Visits"
        action={
          <div className="flex gap-3 pt-1 text-sm text-text-secondary">
            <Link to="/photos" className="underline hover:text-primary-light">
              Photos
            </Link>
            <Link to="/interviews" className="underline hover:text-primary-light">
              Interviews
            </Link>
          </div>
        }
      />

      {applicationsQuery.isError && (
        <ErrorState
          message="Couldn't load your applications. Check your connection and try again."
          onRetry={() => void applicationsQuery.refetch()}
        />
      )}

      {applications.length === 0 && !isAddingApplication && (
        <EmptyState message="No applications yet — add your first one below." />
      )}

      {applications.map((application) => (
        <ApplicationCard key={application.id} application={application} onVisitAdded={() => void applicationsQuery.refetch()} />
      ))}

      {isAddingApplication ? (
        <ChatFlow flow={applicationFlow} onFinished={handleFinished} />
      ) : (
        <PrimaryButton type="button" onClick={() => setIsAddingApplication(true)} className="self-start">
          + Add Application
        </PrimaryButton>
      )}
    </main>
  );
}
