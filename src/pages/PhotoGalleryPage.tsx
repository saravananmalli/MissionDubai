import { ErrorState } from '@/components/ErrorState';
import { SecondaryPageHeader } from '@/components/SecondaryPageHeader';
import { EmptyState } from '@/components/EmptyState';
import { useApplications, useSignedPhotoUrls } from '@/domains/applications/api';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';

export default function PhotoGalleryPage() {
  const tripQuery = useCurrentTrip();
  const applicationsQuery = useApplications(tripQuery.data?.id);

  const applications = applicationsQuery.data ?? [];
  const entries = applications.flatMap((application) =>
    application.visits.flatMap((visit) =>
      visit.photos.map((photo) => ({ photo, visit, companyName: application.company_name })),
    ),
  );
  const urlsQuery = useSignedPhotoUrls(entries.map((e) => e.photo.storage_path));
  const header = <SecondaryPageHeader title="Company Visit Photos" />;

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

  if (tripQuery.isError || applicationsQuery.isError) {
    return (
      <>
        {header}
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState
            message="Couldn't load your photos. Check your connection and try again."
            onRetry={() => {
              void tripQuery.refetch();
              void applicationsQuery.refetch();
            }}
          />
        </main>
      </>
    );
  }

  return (
    <>
      {header}
      <main className="flex flex-col gap-4 px-4 py-6">
        {entries.length === 0 && <EmptyState message="No visit photos yet." />}

        <div className="grid grid-cols-2 gap-3">
          {entries.map(({ photo, visit, companyName }) => {
            const url = urlsQuery.data?.[photo.storage_path];
            return (
              <figure key={photo.id} className="flex flex-col gap-1">
                {url ? (
                  <img src={url} alt={`${companyName} visit on ${visit.visit_date}`} className="aspect-square rounded-md object-cover" />
                ) : (
                  <div className="aspect-square rounded-md bg-surface-2" aria-hidden="true" />
                )}
                <figcaption className="text-xs text-text-secondary">
                  {companyName} · {visit.visit_date}
                </figcaption>
              </figure>
            );
          })}
        </div>
      </main>
    </>
  );
}
