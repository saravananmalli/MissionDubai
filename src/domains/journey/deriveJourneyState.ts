import { computeApplicationFunnel, computeJourneyProgress } from '@/domains/analytics/utils';
import { computeBurnRate, getBudgetAlertLevel } from '@/domains/expenses/utils';
import { hoursUntilInterview } from '@/domains/interviews/utils';
import { daysUntil } from '@/domains/travel/utils';
import { computePipelineBreakdown } from '@/domains/applications/utils';
import { getGlobalRecommendations } from '@/domains/applications/recommendations';
import type { OfferWithCompany } from '@/domains/analytics/api';
import type { ApplicationWithVisits, FollowUp } from '@/domains/applications/api';
import type { Budget, Expense } from '@/domains/expenses/api';
import type { InterviewWithApplication } from '@/domains/interviews/api';
import type { TravelSummary } from '@/domains/travel/api';
import type { Trip } from '@/lib/trips';
import type { JourneyBudgetStatus, JourneyInterview, JourneyState } from '@/domains/journey/types';

/** Journey length assumed when a trip has no explicit target_end_date yet — matches the product's "60-day Dubai Odyssey" framing. */
const DEFAULT_TRIP_LENGTH_DAYS = 60;

export interface DeriveJourneyStateInput {
  trip: Trip | null | undefined;
  travelSummary: TravelSummary | undefined;
  applications: ApplicationWithVisits[] | undefined;
  interviews: InterviewWithApplication[] | undefined;
  budget: Budget | null | undefined;
  expenses: Expense[] | undefined;
  offers: OfferWithCompany[] | undefined;
  followUps: FollowUp[] | undefined;
  now?: Date;
}

// Local-midnight formatting throughout this file, never toISOString() (UTC) —
// matches the convention already established in
// domains/analytics/utils.test.ts, since a UTC-based date string can silently
// shift by a day depending on the runtime's timezone relative to the local date.
function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDaysISO(startISO: string, days: number): string {
  const d = new Date(`${startISO}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toLocalISODate(d);
}

function todayISO(now: Date): string {
  return toLocalISODate(now);
}

/** Pure derivation — every downstream page and the suggestion engine read from this instead of re-deriving journey facts themselves. */
export function deriveJourneyState(input: DeriveJourneyStateInput): JourneyState {
  const now = input.now ?? new Date();
  const trip = input.trip ?? null;
  const applications = input.applications ?? [];
  const interviews = input.interviews ?? [];
  const expenses = input.expenses ?? [];
  const offers = input.offers ?? [];
  const followUps = input.followUps ?? [];
  const budget = input.budget ?? null;
  const visaRow = input.travelSummary?.visa ?? null;
  const accommodationRow = input.travelSummary?.accommodation ?? null;

  const targetEndDate = trip ? (trip.target_end_date ?? addDaysISO(trip.start_date, DEFAULT_TRIP_LENGTH_DAYS)) : null;
  const progress = trip
    ? computeJourneyProgress(trip.start_date, targetEndDate!, now)
    : { daysElapsed: 0, daysRemaining: DEFAULT_TRIP_LENGTH_DAYS, totalDays: DEFAULT_TRIP_LENGTH_DAYS, percentComplete: 0 };

  const visa = visaRow
    ? {
        issueDate: visaRow.issue_date,
        expiryDate: visaRow.expiry_date,
        durationDays: visaRow.duration_days,
        daysUntilExpiry: daysUntil(visaRow.expiry_date, now),
        isExpired: daysUntil(visaRow.expiry_date, now) < 0,
      }
    : null;

  const accommodation = accommodationRow
    ? {
        name: accommodationRow.name,
        address: accommodationRow.address,
        monthlyRentAed: accommodationRow.monthly_rent_aed,
        checkOutDate: accommodationRow.check_out_date,
      }
    : null;

  const interviewedApplicationIds = new Set(interviews.map((i) => i.application_id));
  const offeredApplicationIds = new Set(offers.map((o) => o.application_id));
  const funnel = computeApplicationFunnel(applications.length, interviewedApplicationIds.size, offeredApplicationIds.size);

  const lastAppliedDate = applications.map((a) => a.applied_date).sort().at(-1);
  const daysSinceLastApplication = lastAppliedDate ? -daysUntil(lastAppliedDate, now) : null;

  const pipeline = computePipelineBreakdown(applications, interviews);
  const recommendations = getGlobalRecommendations(applications, interviews, followUps, now);
  const today = todayISO(now);
  const overdueFollowUpCount = followUps.filter((f) => f.status === 'pending' && f.due_date < today).length;

  const upcomingInterviews: JourneyInterview[] = interviews
    .map((i) => ({
      id: i.id,
      companyName: i.companyName,
      positionTitle: i.positionTitle,
      interviewDate: i.interview_date,
      interviewTime: i.interview_time,
      hoursUntil: hoursUntilInterview(i.interview_date, i.interview_time, now),
    }))
    // Keep interviews that are imminent/ongoing (small negative grace window) or still ahead.
    .filter((i) => i.hoursUntil >= -1)
    .sort((a, b) => a.hoursUntil - b.hoursUntil);

  const totalSpentAed = expenses.reduce((sum, e) => sum + e.amount_aed, 0);
  const budgetStatus: JourneyBudgetStatus | null = budget
    ? (() => {
        const percentUsed = budget.amount_aed > 0 ? Math.round((totalSpentAed / budget.amount_aed) * 100) : 0;
        return {
          amountAed: budget.amount_aed,
          spentAed: totalSpentAed,
          remainingAed: budget.amount_aed - totalSpentAed,
          percentUsed,
          alertLevel: getBudgetAlertLevel(percentUsed),
          burnRate: computeBurnRate(totalSpentAed, budget.amount_aed, progress.daysElapsed, progress.daysRemaining),
        };
      })()
    : null;

  const hasExpenseToday = expenses.some((e) => e.expense_date === today);
  const pendingOffers = offers.filter((o) => o.status === 'pending');

  return {
    now,
    trip,
    progress,
    visa,
    accommodation,
    applications: { total: applications.length, funnel, daysSinceLastApplication, pipeline, recommendations },
    nextInterview: upcomingInterviews[0] ?? null,
    upcomingInterviews,
    budget: budgetStatus,
    hasExpenseToday,
    pendingOffers,
    overdueFollowUpCount,
    hasAnyData: Boolean(trip),
  };
}
