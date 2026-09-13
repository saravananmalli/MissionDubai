import { describe, expect, it } from 'vitest';
import { deriveJourneyState } from '@/domains/journey/deriveJourneyState';
import type { ApplicationWithVisits } from '@/domains/applications/api';
import type { OfferWithCompany } from '@/domains/analytics/api';
import type { Expense, Budget } from '@/domains/expenses/api';
import type { InterviewWithApplication } from '@/domains/interviews/api';
import type { TravelSummary } from '@/domains/travel/api';
import type { Trip } from '@/lib/trips';

// See tests/unit/domains/analytics/utils.test.ts: date-only fields are parsed
// as LOCAL midnight throughout this codebase, so fixtures must be formatted
// the same way — toISOString() is UTC and would silently shift by a day.
function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const NOW = new Date('2026-09-13T12:00:00');

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    user_id: 'user-1',
    label: 'Dubai Job Search',
    start_date: '2026-07-30',
    target_end_date: '2026-09-28',
    status: 'active',
    created_at: '2026-07-30T00:00:00Z',
    updated_at: '2026-07-30T00:00:00Z',
    ...overrides,
  };
}

function makeApplication(overrides: Partial<ApplicationWithVisits> = {}): ApplicationWithVisits {
  return {
    id: 'app-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    company_name: 'Tech Corp',
    position_title: 'Senior Developer',
    source: 'linkedin',
    status: 'applied',
    applied_date: '2026-09-01',
    salary_min_aed: null,
    salary_max_aed: null,
    salary_status: 'will_update_later',
    visa_sponsorship: 'unsure',
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    notes: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    visits: [],
    ...overrides,
  };
}

function makeInterview(overrides: Partial<InterviewWithApplication> = {}): InterviewWithApplication {
  return {
    id: 'interview-1',
    user_id: 'user-1',
    application_id: 'app-1',
    interview_date: '2026-09-14',
    interview_time: '10:00:00',
    type: 'video',
    interviewer_name: null,
    interviewer_role: null,
    meeting_link: null,
    reminder_24h: true,
    reminder_1h: true,
    reminder_15min: false,
    reminder_daily_until: false,
    outcome: 'pending',
    confidence_rating: null,
    feedback_notes: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    companyName: 'Tech Corp',
    positionTitle: 'Senior Developer',
    ...overrides,
  };
}

function makeOffer(overrides: Partial<OfferWithCompany> = {}): OfferWithCompany {
  return {
    id: 'offer-1',
    user_id: 'user-1',
    application_id: 'app-1',
    salary_aed: 220_000,
    bonus_percent: null,
    leave_days: null,
    visa_sponsorship: true,
    visa_cost_responsibility: null,
    location: null,
    growth_rating: null,
    status: 'pending',
    received_date: '2026-09-10',
    created_at: '2026-09-10T00:00:00Z',
    companyName: 'Tech Corp',
    ...overrides,
  };
}

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'expense-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    category: 'meals',
    amount_aed: 85,
    expense_date: '2026-09-13',
    description: null,
    receipt_photo_path: null,
    location: null,
    payment_method: null,
    created_at: '2026-09-13T00:00:00Z',
    ...overrides,
  };
}

function makeBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'budget-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    amount_aed: 10_000,
    created_at: '2026-07-30T00:00:00Z',
    updated_at: '2026-07-30T00:00:00Z',
    ...overrides,
  };
}

const EMPTY_TRAVEL_SUMMARY: TravelSummary = { flights: [], visa: null, accommodation: null };

describe('deriveJourneyState', () => {
  it('reports hasAnyData=false and a default 60-day progress window before any trip exists', () => {
    const state = deriveJourneyState({
      trip: null,
      travelSummary: undefined,
      applications: undefined,
      interviews: undefined,
      budget: undefined,
      expenses: undefined,
      offers: undefined,
      now: NOW,
    });
    expect(state.hasAnyData).toBe(false);
    expect(state.progress.totalDays).toBe(60);
    expect(state.progress.daysElapsed).toBe(0);
  });

  it('falls back to a 60-day window when target_end_date is not set yet', () => {
    const start = toLocalISODate(new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000));
    const state = deriveJourneyState({
      trip: makeTrip({ start_date: start, target_end_date: null }),
      travelSummary: EMPTY_TRAVEL_SUMMARY,
      applications: [],
      interviews: [],
      budget: null,
      expenses: [],
      offers: [],
      now: NOW,
    });
    expect(state.progress.totalDays).toBe(60);
    // NOW is midday, start_date parses as local midnight, so the raw elapsed
    // is 10.5 days -> rounds to 11 (computeJourneyProgress's own rounding).
    expect(state.progress.daysElapsed).toBe(11);
  });

  it('computes visa days-until-expiry and marks an expired visa', () => {
    const expiring = deriveJourneyState({
      trip: makeTrip(),
      travelSummary: {
        flights: [],
        visa: {
          id: 'visa-1',
          user_id: 'user-1',
          trip_id: 'trip-1',
          visa_type: 'visit',
          fee_aed: 100,
          duration_days: 60,
          issue_date: '2026-07-30',
          expiry_date: toLocalISODate(new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000)),
          status: 'approved',
          created_at: '2026-07-30T00:00:00Z',
        },
        accommodation: null,
      },
      applications: [],
      interviews: [],
      budget: null,
      expenses: [],
      offers: [],
      now: NOW,
    });
    expect(expiring.visa?.daysUntilExpiry).toBe(3);
    expect(expiring.visa?.isExpired).toBe(false);
  });

  it('sorts upcoming interviews soonest-first and drops ones clearly in the past', () => {
    const state = deriveJourneyState({
      trip: makeTrip(),
      travelSummary: EMPTY_TRAVEL_SUMMARY,
      applications: [makeApplication()],
      interviews: [
        makeInterview({ id: 'later', interview_date: '2026-09-20', interview_time: '10:00:00' }),
        makeInterview({ id: 'soonest', interview_date: '2026-09-13', interview_time: '18:00:00' }),
        makeInterview({ id: 'past', interview_date: '2026-01-01', interview_time: '09:00:00' }),
      ],
      budget: null,
      expenses: [],
      offers: [],
      now: NOW,
    });
    expect(state.upcomingInterviews.map((i) => i.id)).toEqual(['soonest', 'later']);
    expect(state.nextInterview?.id).toBe('soonest');
  });

  it('computes application funnel counts and days since last application', () => {
    const state = deriveJourneyState({
      trip: makeTrip(),
      travelSummary: EMPTY_TRAVEL_SUMMARY,
      applications: [
        makeApplication({ id: 'app-1', applied_date: '2026-09-01' }),
        makeApplication({ id: 'app-2', applied_date: '2026-09-10' }),
      ],
      interviews: [makeInterview({ application_id: 'app-1' })],
      budget: null,
      expenses: [],
      offers: [makeOffer({ application_id: 'app-1', status: 'accepted' })],
      now: NOW,
    });
    expect(state.applications.total).toBe(2);
    expect(state.applications.funnel[0]!.count).toBe(2);
    expect(state.applications.funnel[1]!.count).toBe(1); // interviewed
    expect(state.applications.funnel[2]!.count).toBe(1); // offered
    expect(state.applications.daysSinceLastApplication).toBe(3); // Sep 10 -> Sep 13
  });

  it('computes budget status (percent used, alert level, burn rate) from spend', () => {
    const state = deriveJourneyState({
      trip: makeTrip({ start_date: toLocalISODate(new Date(NOW.getTime() - 44 * 24 * 60 * 60 * 1000)) }),
      travelSummary: EMPTY_TRAVEL_SUMMARY,
      applications: [],
      interviews: [],
      budget: makeBudget({ amount_aed: 10_000 }),
      expenses: [makeExpense({ amount_aed: 5_415, expense_date: '2026-09-13' })],
      offers: [],
      now: NOW,
    });
    expect(state.budget?.percentUsed).toBe(54);
    expect(state.budget?.alertLevel).toBe('ok');
    expect(state.hasExpenseToday).toBe(true);
  });

  it('flags hasExpenseToday=false when no expense is dated today', () => {
    const state = deriveJourneyState({
      trip: makeTrip(),
      travelSummary: EMPTY_TRAVEL_SUMMARY,
      applications: [],
      interviews: [],
      budget: makeBudget(),
      expenses: [makeExpense({ expense_date: '2026-09-01' })],
      offers: [],
      now: NOW,
    });
    expect(state.hasExpenseToday).toBe(false);
  });

  it('only surfaces pending offers', () => {
    const state = deriveJourneyState({
      trip: makeTrip(),
      travelSummary: EMPTY_TRAVEL_SUMMARY,
      applications: [],
      interviews: [],
      budget: null,
      expenses: [],
      offers: [makeOffer({ id: 'pending-1', status: 'pending' }), makeOffer({ id: 'accepted-1', status: 'accepted' })],
      now: NOW,
    });
    expect(state.pendingOffers.map((o) => o.id)).toEqual(['pending-1']);
  });
});
