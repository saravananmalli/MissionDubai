import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChatFlow } from '@/chat-flow';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { SecondaryButton } from '@/components/Button';
import { SecondaryPageHeader } from '@/components/SecondaryPageHeader';
import { travelFlow } from '@/domains/travel/flowConfig';
import { useTravelSummary } from '@/domains/travel/api';
import { AccommodationEditForm } from '@/domains/travel/components/AccommodationEditForm';
import { VisaEditForm } from '@/domains/travel/components/VisaEditForm';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';

type ActivePanel = 'edit-visa' | 'edit-accommodation' | null;

export default function TravelPage() {
  const tripQuery = useCurrentTrip();
  const summaryQuery = useTravelSummary(tripQuery.data?.id);
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const header = <SecondaryPageHeader title="Travel & Accommodation" />;

  if (tripQuery.isLoading) {
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

  const summary = summaryQuery.data;
  const hasTravelData = Boolean(summary && (summary.flights.length > 0 || summary.visa || summary.accommodation));

  if (!hasTravelData) {
    return (
      <>
        {header}
        <main className="flex flex-col gap-2 px-4 pt-6">
          {/* Refetch the trip itself, not just the summary: on the very first
              completion no trip existed yet, so summaryQuery was disabled and
              keyed off `undefined` — only once tripQuery re-resolves to the
              newly created trip does useTravelSummary key off a real id and
              fetch. Refetching just the (disabled) summary here would no-op. */}
          <ChatFlow flow={travelFlow} onFinished={() => void tripQuery.refetch()} />
        </main>
      </>
    );
  }

  if (summaryQuery.isError) {
    return (
      <>
        {header}
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState
            message="Couldn't load your travel details. Check your connection and try again."
            onRetry={() => void summaryQuery.refetch()}
          />
        </main>
      </>
    );
  }

  const totalCost =
    summary!.flights.reduce((sum, f) => sum + f.cost_aed, 0) +
    (summary!.visa?.fee_aed ?? 0) +
    (summary!.accommodation?.monthly_rent_aed ?? 0);

  function closePanel() {
    setActivePanel(null);
    void summaryQuery.refetch();
  }

  return (
    <>
      {header}
      <main className="flex flex-col gap-4 px-4 py-6">
        <Link to="/map" className="self-end text-sm text-primary-light underline hover:text-white">
          View Map
        </Link>

        {summary!.flights.map((flight) => (
          <Card key={flight.id} title={flight.direction === 'outbound' ? 'Outbound Flight' : 'Return Flight'}>
            <p className="text-base font-medium text-ink-800">
              {flight.airline} {flight.flight_number}
            </p>
            <p className="text-sm text-ink-500">
              {flight.departure_date} at {flight.departure_time}
            </p>
            <p className="text-sm text-ink-500">{flight.cost_aed} AED</p>
          </Card>
        ))}

        {summary!.visa &&
          (activePanel === 'edit-visa' ? (
            <VisaEditForm visa={summary!.visa} tripId={tripQuery.data?.id} onSaved={closePanel} onCancel={() => setActivePanel(null)} />
          ) : (
            <Card title="Visa">
              <p className="text-base font-medium capitalize text-ink-800">{summary!.visa.visa_type} visa</p>
              <p className="text-sm text-ink-500">
                {summary!.visa.fee_aed} AED · {summary!.visa.status}
              </p>
              <p className="text-sm text-ink-500">Expires {summary!.visa.expiry_date}</p>
              <SecondaryButton type="button" className="self-start" onClick={() => setActivePanel('edit-visa')}>
                Edit
              </SecondaryButton>
            </Card>
          ))}

        {summary!.accommodation &&
          (activePanel === 'edit-accommodation' ? (
            <AccommodationEditForm
              accommodation={summary!.accommodation}
              tripId={tripQuery.data?.id}
              onSaved={closePanel}
              onCancel={() => setActivePanel(null)}
            />
          ) : (
            <Card title="PG Accommodation">
              <p className="text-base font-medium text-ink-800">{summary!.accommodation.name}</p>
              <p className="text-sm text-ink-500">{summary!.accommodation.address}</p>
              <p className="text-sm text-ink-500">{summary!.accommodation.monthly_rent_aed.toLocaleString()} AED / month</p>
              <SecondaryButton type="button" className="self-start" onClick={() => setActivePanel('edit-accommodation')}>
                Edit
              </SecondaryButton>
            </Card>
          ))}

        <Card title="Total Trip Cost So Far">
          <p className="text-2xl font-bold text-text-primary">{totalCost.toLocaleString()} AED</p>
        </Card>
      </main>
    </>
  );
}
