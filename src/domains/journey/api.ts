import { useApplications } from '@/domains/applications/api';
import { useOffers } from '@/domains/analytics/api';
import { useBudget, useExpenses } from '@/domains/expenses/api';
import { useInterviews } from '@/domains/interviews/api';
import { useTravelSummary } from '@/domains/travel/api';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { deriveJourneyState } from '@/domains/journey/deriveJourneyState';
import type { JourneyState } from '@/domains/journey/types';

export interface UseJourneyStateResult {
  data: JourneyState;
  isLoading: boolean;
  isError: boolean;
}

/** Composes the existing per-domain hooks — no new query keys, no duplicate fetches beyond what each page already does. */
export function useJourneyState(): UseJourneyStateResult {
  const tripQuery = useCurrentTrip();
  const tripId = tripQuery.data?.id;

  const travelSummaryQuery = useTravelSummary(tripId);
  const applicationsQuery = useApplications(tripId);
  const interviewsQuery = useInterviews(tripId);
  const budgetQuery = useBudget(tripId);
  const expensesQuery = useExpenses(tripId);
  const offersQuery = useOffers(tripId);

  const data = deriveJourneyState({
    trip: tripQuery.data,
    travelSummary: travelSummaryQuery.data,
    applications: applicationsQuery.data,
    interviews: interviewsQuery.data,
    budget: budgetQuery.data,
    expenses: expensesQuery.data,
    offers: offersQuery.data,
  });

  const dependentQueriesLoading =
    Boolean(tripId) &&
    (travelSummaryQuery.isLoading ||
      applicationsQuery.isLoading ||
      interviewsQuery.isLoading ||
      budgetQuery.isLoading ||
      expensesQuery.isLoading ||
      offersQuery.isLoading);

  return {
    data,
    isLoading: tripQuery.isLoading || dependentQueriesLoading,
    isError:
      tripQuery.isError ||
      travelSummaryQuery.isError ||
      applicationsQuery.isError ||
      interviewsQuery.isError ||
      budgetQuery.isError ||
      expensesQuery.isError ||
      offersQuery.isError,
  };
}
