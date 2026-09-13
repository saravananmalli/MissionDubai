import type { JourneyState } from '@/domains/journey/types';

export const NOW = new Date('2026-09-13T12:00:00');

/** A "quiet" baseline journey — no rule should fire against this unmodified. */
export function makeJourneyState(overrides: Partial<JourneyState> = {}): JourneyState {
  return {
    now: NOW,
    trip: {
      id: 'trip-1',
      user_id: 'user-1',
      label: 'Dubai Job Search',
      start_date: '2026-08-01',
      target_end_date: '2026-09-30',
      status: 'active',
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
    },
    progress: { daysElapsed: 43, daysRemaining: 17, totalDays: 60, percentComplete: 72 },
    visa: { issueDate: '2026-08-20', expiryDate: '2026-10-19', durationDays: 60, daysUntilExpiry: 36, isExpired: false },
    accommodation: null,
    applications: { total: 3, funnel: [], daysSinceLastApplication: 1 },
    nextInterview: null,
    upcomingInterviews: [],
    budget: { amountAed: 10_000, spentAed: 3_000, remainingAed: 7_000, percentUsed: 30, alertLevel: 'ok', burnRate: { dailyAverageAed: 70, estimatedRemainingAed: 5000, willBudgetLast: true } },
    hasExpenseToday: true,
    pendingOffers: [],
    hasAnyData: true,
    ...overrides,
  };
}
