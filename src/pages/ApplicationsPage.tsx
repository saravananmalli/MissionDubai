import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChatFlow } from '@/chat-flow';
import { ErrorState } from '@/components/ErrorState';
import { PrimaryPageHeader } from '@/components/PrimaryPageHeader';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/Button';
import { applicationFlow } from '@/domains/applications/flowConfig';
import { useApplications } from '@/domains/applications/api';
import { ApplicationCard } from '@/domains/applications/components/ApplicationCard';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';

export default function ApplicationsPage() {
  const tripQuery = useCurrentTrip();
  const applicationsQuery = useApplications(tripQuery.data?.id);
  const [searchParams] = useSearchParams();
  // Lets a link (e.g. the Agents matrix's "Log Application" button) jump straight into the add flow instead of just landing on the list.
  const [isAddingApplication, setIsAddingApplication] = useState(() => searchParams.get('action') === 'add');

  if (tripQuery.isLoading) {
    return (
      <>
        <PrimaryPageHeader />
        <main className="px-4 py-6">
          <p role="status">Loading…</p>
        </main>
      </>
    );
  }

  if (tripQuery.isError) {
    return (
      <>
        <PrimaryPageHeader />
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState message="Couldn't load your trip. Check your connection and try again." onRetry={() => void tripQuery.refetch()} />
        </main>
      </>
    );
  }

  const applications = applicationsQuery.data ?? [];

  function handleFinished() {
    setIsAddingApplication(false);
    void tripQuery.refetch();
    void applicationsQuery.refetch();
  }

  return (
    <>
      <PrimaryPageHeader />
      <main className="flex flex-col gap-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-text-primary">Applications & Company Visits</h1>
          <div className="flex gap-3 text-sm text-text-secondary">
            <Link to="/photos" className="underline hover:text-primary-light">
              Photos
            </Link>
            <Link to="/interviews" className="underline hover:text-primary-light">
              Interviews
            </Link>
          </div>
        </div>

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
    </>
  );
}
