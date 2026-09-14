import { describe, expect, it } from 'vitest';
import {
  budgetBurnHighRule,
  firstRunPromptRule,
  interviewUpcomingRule,
  noApplicationsRecentlyRule,
  noExpenseTodayRule,
  offerAwaitingDecisionRule,
  visaExpiringRule,
} from '@/domains/suggestions/rules';
import { makeJourneyState, NOW } from './testFixtures';

describe('firstRunPromptRule', () => {
  it('fires only before any trip data exists', () => {
    expect(firstRunPromptRule(makeJourneyState({ hasAnyData: false }))).not.toBeNull();
    expect(firstRunPromptRule(makeJourneyState({ hasAnyData: true }))).toBeNull();
  });
});

describe('visaExpiringRule', () => {
  it('does not fire with more than 7 days remaining', () => {
    expect(visaExpiringRule(makeJourneyState({ visa: { issueDate: '2026-08-01', durationDays: 60, expiryDate: '2026-10-01', daysUntilExpiry: 8, isExpired: false } }))).toBeNull();
  });

  it('fires at warning priority for 4-7 days remaining', () => {
    const suggestion = visaExpiringRule(makeJourneyState({ visa: { issueDate: '2026-08-01', durationDays: 60, expiryDate: '2026-09-19', daysUntilExpiry: 6, isExpired: false } }));
    expect(suggestion?.priority).toBe(80);
  });

  it('fires at urgent priority for 3 or fewer days remaining', () => {
    const suggestion = visaExpiringRule(makeJourneyState({ visa: { issueDate: '2026-08-01', durationDays: 60, expiryDate: '2026-09-16', daysUntilExpiry: 3, isExpired: false } }));
    expect(suggestion?.priority).toBe(95);
  });

  it('does not fire once the visa is already expired (a different problem, not a countdown)', () => {
    expect(visaExpiringRule(makeJourneyState({ visa: { issueDate: '2026-08-01', durationDays: 60, expiryDate: '2026-09-01', daysUntilExpiry: -12, isExpired: true } }))).toBeNull();
  });

  it('does not fire with no visa on file', () => {
    expect(visaExpiringRule(makeJourneyState({ visa: null }))).toBeNull();
  });
});

describe('interviewUpcomingRule', () => {
  it('returns one suggestion per interview within 48 hours', () => {
    const suggestions = interviewUpcomingRule(
      makeJourneyState({
        upcomingInterviews: [
          { id: 'i1', companyName: 'Tech Corp', positionTitle: 'Dev', interviewDate: '2026-09-14', interviewTime: '10:00', hoursUntil: 22 },
          { id: 'i2', companyName: 'Emirates Tech', positionTitle: 'PM', interviewDate: '2026-09-20', interviewTime: '10:00', hoursUntil: 168 },
        ],
      }),
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.id).toBe('interview-i1-upcoming');
    expect(suggestions[0]!.priority).toBe(100);
  });

  it('returns nothing when there are no near-term interviews', () => {
    expect(interviewUpcomingRule(makeJourneyState({ upcomingInterviews: [] }))).toEqual([]);
  });
});

describe('noApplicationsRecentlyRule', () => {
  it('does not fire under the 5-day threshold', () => {
    expect(noApplicationsRecentlyRule(makeJourneyState({ applications: { total: 3, funnel: [], daysSinceLastApplication: 4, pipeline: { stages: [] }, recommendations: [] } }))).toBeNull();
  });

  it('fires at or beyond the 5-day threshold', () => {
    expect(
      noApplicationsRecentlyRule(makeJourneyState({ applications: { total: 3, funnel: [], daysSinceLastApplication: 5, pipeline: { stages: [] }, recommendations: [] } })),
    ).not.toBeNull();
  });

  it('does not fire when there have never been any applications (first-run prompt covers that)', () => {
    expect(noApplicationsRecentlyRule(makeJourneyState({ applications: { total: 0, funnel: [], daysSinceLastApplication: null, pipeline: { stages: [] }, recommendations: [] } }))).toBeNull();
  });
});

describe('budgetBurnHighRule', () => {
  it('does not fire when the budget is projected to last', () => {
    expect(
      budgetBurnHighRule(
        makeJourneyState({ budget: { amountAed: 10_000, spentAed: 3_000, remainingAed: 7_000, percentUsed: 30, alertLevel: 'ok', burnRate: { dailyAverageAed: 70, estimatedRemainingAed: 500, willBudgetLast: true } } }),
      ),
    ).toBeNull();
  });

  it('fires when the projection shows the budget running out', () => {
    expect(
      budgetBurnHighRule(
        makeJourneyState({ budget: { amountAed: 10_000, spentAed: 8_000, remainingAed: 2_000, percentUsed: 80, alertLevel: 'warning', burnRate: { dailyAverageAed: 300, estimatedRemainingAed: -500, willBudgetLast: false } } }),
      ),
    ).not.toBeNull();
  });

  it('does not fire with no budget set up yet', () => {
    expect(budgetBurnHighRule(makeJourneyState({ budget: null }))).toBeNull();
  });
});

describe('noExpenseTodayRule', () => {
  it('does not fire once an expense has been logged today', () => {
    expect(noExpenseTodayRule(makeJourneyState({ hasExpenseToday: true }))).toBeNull();
  });

  it('fires when nothing has been logged today and a budget exists', () => {
    expect(noExpenseTodayRule(makeJourneyState({ hasExpenseToday: false }))).not.toBeNull();
  });

  it('does not fire before a budget exists', () => {
    expect(noExpenseTodayRule(makeJourneyState({ hasExpenseToday: false, budget: null }))).toBeNull();
  });
});

describe('offerAwaitingDecisionRule', () => {
  const baseOffer = {
    id: 'offer-1',
    user_id: 'user-1',
    application_id: 'app-1',
    salary_aed: 200_000,
    bonus_percent: null,
    leave_days: null,
    visa_sponsorship: true,
    visa_cost_responsibility: null,
    location: null,
    growth_rating: null,
    status: 'pending' as const,
    created_at: '2026-09-10T00:00:00Z',
    companyName: 'Tech Corp',
  };

  it('does not fire within the 2-day grace period', () => {
    expect(offerAwaitingDecisionRule(makeJourneyState({ pendingOffers: [{ ...baseOffer, received_date: '2026-09-12' }] }))).toBeNull();
  });

  it('fires once an offer has been pending beyond the grace period', () => {
    expect(offerAwaitingDecisionRule(makeJourneyState({ pendingOffers: [{ ...baseOffer, received_date: '2026-09-08' }] }))).not.toBeNull();
  });

  it('does not fire when there are no pending offers', () => {
    expect(offerAwaitingDecisionRule(makeJourneyState({ pendingOffers: [] }))).toBeNull();
  });
});

describe('date-baked dismissal ids', () => {
  it('bakes the local date into daily-reset suggestion ids', () => {
    const suggestion = noExpenseTodayRule(makeJourneyState({ hasExpenseToday: false, now: NOW }));
    expect(suggestion?.id).toBe('no-expense-today-2026-09-13');
  });
});
