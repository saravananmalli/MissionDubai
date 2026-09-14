import { useState } from 'react';
import { ChatFlow } from '@/chat-flow';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { SecondaryPageHeader } from '@/components/SecondaryPageHeader';
import { EmptyState } from '@/components/EmptyState';
import { PrimaryButton } from '@/components/Button';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import { useApplications } from '@/domains/applications/api';
import { useInterviews } from '@/domains/interviews/api';
import { useExpenses } from '@/domains/expenses/api';
import { useTravelSummary } from '@/domains/travel/api';
import { useOffers } from '@/domains/analytics/api';
import { createOfferFlow } from '@/domains/analytics/flowConfig';
import {
  compareOffers,
  computeApplicationFunnel,
  computeJobSearchMetrics,
  computeJourneyProgress,
  computeSalaryAnalysis,
} from '@/domains/analytics/utils';

const DEFAULT_TRIP_LENGTH_DAYS = 60;

function daysBetween(startISO: string, endISO: string): number {
  const ms = new Date(`${endISO}T00:00:00`).getTime() - new Date(`${startISO}T00:00:00`).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

export default function AnalyticsPage() {
  const tripQuery = useCurrentTrip();
  const applicationsQuery = useApplications(tripQuery.data?.id);
  const interviewsQuery = useInterviews(tripQuery.data?.id);
  const expensesQuery = useExpenses(tripQuery.data?.id);
  const travelSummaryQuery = useTravelSummary(tripQuery.data?.id);
  const offersQuery = useOffers(tripQuery.data?.id);
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  useScrollToHash(Boolean(tripQuery.data));
  const header = <SecondaryPageHeader title="Analytics & Offers" />;

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

  const trip = tripQuery.data;
  const applications = applicationsQuery.data ?? [];
  const interviews = interviewsQuery.data ?? [];
  const expenses = expensesQuery.data ?? [];
  const offers = offersQuery.data ?? [];
  const travelSummary = travelSummaryQuery.data;

  const interviewedApplicationIds = new Set(interviews.map((i) => i.application_id));
  const offeredApplicationIds = new Set(offers.map((o) => o.application_id));

  const journeyProgress = trip
    ? computeJourneyProgress(
        trip.start_date,
        trip.target_end_date ??
          (() => {
            const end = new Date(`${trip.start_date}T00:00:00`);
            end.setDate(end.getDate() + DEFAULT_TRIP_LENGTH_DAYS);
            return end.toISOString().slice(0, 10);
          })(),
      )
    : null;

  const funnel = computeApplicationFunnel(applications.length, interviewedApplicationIds.size, offeredApplicationIds.size);

  const flightTotal = travelSummary?.flights.reduce((sum, f) => sum + f.cost_aed, 0) ?? 0;
  const visaFee = travelSummary?.visa?.fee_aed ?? 0;
  const pgRent = travelSummary?.accommodation?.monthly_rent_aed ?? 0;
  const otherExpensesTotal = expenses.reduce((sum, e) => sum + e.amount_aed, 0);
  const tripTotalCostAed = flightTotal + visaFee + pgRent + otherExpensesTotal;

  const applicationById = new Map(applications.map((a) => [a.id, a]));
  const daysToFirstInterview: number[] = [];
  for (const applicationId of interviewedApplicationIds) {
    const application = applicationById.get(applicationId);
    const firstInterview = interviews
      .filter((i) => i.application_id === applicationId)
      .sort((a, b) => a.interview_date.localeCompare(b.interview_date))[0];
    if (application && firstInterview) {
      daysToFirstInterview.push(daysBetween(application.applied_date, firstInterview.interview_date));
    }
  }
  const daysToOffer: number[] = offers
    .map((o) => {
      const application = applicationById.get(o.application_id);
      return application ? daysBetween(application.applied_date, o.received_date) : null;
    })
    .filter((v): v is number => v !== null);

  const jobSearchMetrics = computeJobSearchMetrics({
    totalSpentAed: tripTotalCostAed,
    applicationCount: applications.length,
    interviewedApplicationCount: interviewedApplicationIds.size,
    offerCount: offers.length,
    daysToFirstInterview,
    daysToOffer,
  });

  const salaryAnalysis = computeSalaryAnalysis(
    offers.map((o) => o.salary_aed),
    applications
      .filter((a) => a.salary_status === 'provided' && a.salary_min_aed !== null && a.salary_max_aed !== null)
      .map((a) => ({ min: a.salary_min_aed!, max: a.salary_max_aed! })),
  );

  const comparison =
    offers.length >= 2
      ? compareOffers(
          offers.map((o) => ({
            id: o.id,
            salaryAed: o.salary_aed,
            bonusPercent: o.bonus_percent,
            leaveDays: o.leave_days,
            visaSponsorship: o.visa_sponsorship,
            growthRating: o.growth_rating,
          })),
        )
      : null;

  function handleOfferFinished() {
    setIsAddingOffer(false);
    void applicationsQuery.refetch();
    void offersQuery.refetch();
  }

  return (
    <>
      {header}
      <main className="flex flex-col gap-4 px-4 py-6">
      {journeyProgress && (
        <Card title="Journey Progress">
          <p className="text-base font-medium text-text-primary">
            Day {journeyProgress.daysElapsed} of {journeyProgress.totalDays} · {journeyProgress.daysRemaining} days left
          </p>
          <div className="h-2 w-full rounded-full bg-surface-2">
            <div className="h-2 rounded-full bg-cta" style={{ width: `${journeyProgress.percentComplete}%` }} />
          </div>
        </Card>
      )}

      <Card title="Companies Tracker">
        <p className="text-sm text-text-secondary">Applied: {applications.length}</p>
        <p className="text-sm text-text-secondary">
          Visited: {applications.filter((a) => a.visits.length > 0).length}
        </p>
        <p className="text-sm text-text-secondary">Interviews: {interviewedApplicationIds.size}</p>
        <p className="text-sm text-text-secondary">Offers: {offers.length}</p>
      </Card>

      <Card title="Application Funnel">
        {funnel.map((stage) => (
          <p key={stage.label} className="text-sm text-text-secondary">
            {stage.label}: {stage.count}
            {stage.conversionFromPreviousPercent !== null && ` (${stage.conversionFromPreviousPercent}%)`}
          </p>
        ))}
      </Card>

      <Card title="Financial Summary">
        <p className="text-sm text-text-secondary">Total Spent: {tripTotalCostAed.toLocaleString()} AED</p>
        <p className="text-sm text-text-secondary">├─ Flight: {flightTotal.toLocaleString()} AED</p>
        <p className="text-sm text-text-secondary">├─ Visa: {visaFee.toLocaleString()} AED</p>
        <p className="text-sm text-text-secondary">├─ PG Rent: {pgRent.toLocaleString()} AED</p>
        <p className="text-sm text-text-secondary">└─ Other expenses: {otherExpensesTotal.toLocaleString()} AED</p>
      </Card>

      <Card title="Job Search Metrics">
        <p className="text-sm text-text-secondary">
          Cost per Application: {jobSearchMetrics.costPerApplicationAed?.toFixed(0) ?? '—'} AED
        </p>
        <p className="text-sm text-text-secondary">Cost per Interview: {jobSearchMetrics.costPerInterviewAed?.toFixed(0) ?? '—'} AED</p>
        <p className="text-sm text-text-secondary">Cost per Offer: {jobSearchMetrics.costPerOfferAed?.toFixed(0) ?? '—'} AED</p>
        <p className="text-sm text-text-secondary">
          Interview Success Rate: {jobSearchMetrics.interviewSuccessRatePercent ?? '—'}%
        </p>
        <p className="text-sm text-text-secondary">
          Time to Interview: {jobSearchMetrics.avgDaysToFirstInterview?.toFixed(0) ?? '—'} days avg
        </p>
        <p className="text-sm text-text-secondary">Time to Offer: {jobSearchMetrics.avgDaysToOffer?.toFixed(0) ?? '—'} days avg</p>
      </Card>

      {(salaryAnalysis.minOfferedAed !== null || salaryAnalysis.averageExpectedAed !== null) && (
        <Card title="Salary Analysis">
          {salaryAnalysis.minOfferedAed !== null && (
            <p className="text-sm text-text-secondary">
              Range Offered: {salaryAnalysis.minOfferedAed.toLocaleString()}–{salaryAnalysis.maxOfferedAed!.toLocaleString()} AED
            </p>
          )}
          {salaryAnalysis.averageExpectedAed !== null && (
            <p className="text-sm text-text-secondary">Average Expected: {salaryAnalysis.averageExpectedAed.toLocaleString()} AED</p>
          )}
        </Card>
      )}

      {offers.length > 0 && (
        <Card title="Offers Received">
          <ul className="flex flex-col gap-1 text-sm text-text-secondary">
            {offers.map((offer) => (
              <li key={offer.id}>
                {offer.companyName}: {offer.salary_aed.toLocaleString()} AED
                {offer.id === comparison?.recommendedOfferId && ' 🏆'}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {comparison && (
        <div id="recommendation">
          <Card title="Recommendation">
            <p className="text-base font-medium text-text-primary">
              🏆 {offers.find((o) => o.id === comparison.recommendedOfferId)?.companyName} looks best overall
            </p>
            {comparison.reasons.length > 0 && (
              <p className="text-sm text-text-secondary">({comparison.reasons.join(', ')})</p>
            )}
          </Card>
        </div>
      )}

      {applications.length === 0 ? (
        <EmptyState message="Add a job application first before logging an offer." />
      ) : isAddingOffer ? (
        <ChatFlow flow={createOfferFlow(applications.map((a) => ({ id: a.id, company_name: a.company_name })))} onFinished={handleOfferFinished} />
      ) : (
        <PrimaryButton type="button" onClick={() => setIsAddingOffer(true)} className="self-start">
          + Add Offer
        </PrimaryButton>
      )}
      </main>
    </>
  );
}
