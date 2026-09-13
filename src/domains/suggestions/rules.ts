import { daysUntil } from '@/domains/travel/utils';
import type { JourneyState } from '@/domains/journey/types';
import type { Suggestion } from '@/domains/suggestions/types';

// Local-midnight formatting, not toISOString() (UTC) — see the matching note
// in domains/journey/deriveJourneyState.ts.
function todayISO(state: JourneyState): string {
  const { now } = state;
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Fires only pre-onboarding, before any trip data exists at all. */
export function firstRunPromptRule(state: JourneyState): Suggestion | null {
  if (state.hasAnyData) return null;
  return {
    id: 'first-run-prompt',
    type: 'first_run_prompt',
    title: 'Start your Dubai mission',
    reason: "You haven't logged your flight, visa, or PG yet.",
    icon: 'Rocket',
    priority: 90,
    action: { kind: 'open_flow', flowId: 'travel' },
    dismissible: false,
  };
}

/** Fixed 3/7-day thresholds, same "documented fixed threshold" style as getBudgetAlertLevel's 80/90/100. */
export function visaExpiringRule(state: JourneyState): Suggestion | null {
  const visa = state.visa;
  if (!visa || visa.isExpired || visa.daysUntilExpiry > 7) return null;
  const urgent = visa.daysUntilExpiry <= 3;
  return {
    id: 'visa-expiring',
    type: 'visa_expiring',
    title: urgent ? 'Visa expiring soon' : 'Visa expiry approaching',
    reason: `Visa expires in ${visa.daysUntilExpiry} day${visa.daysUntilExpiry === 1 ? '' : 's'}.`,
    icon: 'ShieldAlert',
    priority: urgent ? 95 : 80,
    action: { kind: 'navigate', to: '/agents' },
    dismissible: true,
  };
}

/** Can fire for more than one interview at once (e.g. two scheduled within 48h). */
export function interviewUpcomingRule(state: JourneyState): Suggestion[] {
  return state.upcomingInterviews
    .filter((interview) => interview.hoursUntil <= 48)
    .map((interview) => ({
      id: `interview-${interview.id}-upcoming`,
      type: 'interview_upcoming' as const,
      title: `${interview.companyName} interview`,
      reason:
        interview.hoursUntil <= 24
          ? `Coming up in about ${Math.max(0, Math.round(interview.hoursUntil))}h.`
          : `Coming up in about ${Math.round(interview.hoursUntil / 24)} day(s).`,
      icon: 'Video',
      priority: 100,
      action: { kind: 'navigate' as const, to: `/interviews/${interview.id}` },
      relatedEntity: { table: 'interviews', id: interview.id },
      dismissible: true,
    }));
}

export function noApplicationsRecentlyRule(state: JourneyState): Suggestion | null {
  const days = state.applications.daysSinceLastApplication;
  // Zero applications ever is covered by firstRunPromptRule instead.
  if (state.applications.total === 0 || days === null || days < 5) return null;
  return {
    id: `no-applications-recently-${todayISO(state)}`,
    type: 'no_applications_recently',
    title: 'Keep the pipeline moving',
    reason: `No new application in ${days} days.`,
    icon: 'Radar',
    priority: 60,
    action: { kind: 'navigate', to: '/applications' },
    dismissible: true,
  };
}

export function budgetBurnHighRule(state: JourneyState): Suggestion | null {
  const budget = state.budget;
  if (!budget || budget.burnRate.willBudgetLast) return null;
  return {
    id: `budget-burn-high-${todayISO(state)}`,
    type: 'budget_burn_high',
    title: 'Spending faster than planned',
    reason: `At AED ${Math.round(budget.burnRate.dailyAverageAed)}/day, your budget may run short.`,
    icon: 'TrendingDown',
    priority: 70,
    action: { kind: 'navigate', to: '/expenses' },
    dismissible: true,
  };
}

export function noExpenseTodayRule(state: JourneyState): Suggestion | null {
  // Only meaningful once a budget exists — otherwise there's nothing to track against yet.
  if (!state.budget || state.hasExpenseToday) return null;
  return {
    id: `no-expense-today-${todayISO(state)}`,
    type: 'no_expense_today',
    title: "Log today's spending",
    reason: 'No expense recorded yet today.',
    icon: 'Receipt',
    priority: 40,
    action: { kind: 'navigate', to: '/expenses' },
    dismissible: true,
  };
}

const OFFER_DECISION_GRACE_DAYS = 2;

export function offerAwaitingDecisionRule(state: JourneyState): Suggestion | null {
  const overdue = state.pendingOffers.find((offer) => -daysUntil(offer.received_date, state.now) > OFFER_DECISION_GRACE_DAYS);
  if (!overdue) return null;
  return {
    id: `offer-awaiting-decision-${overdue.id}`,
    type: 'offer_awaiting_decision',
    title: `Decide on ${overdue.companyName}`,
    reason: 'An offer is still awaiting your decision.',
    icon: 'Scale',
    priority: 75,
    action: { kind: 'navigate', to: '/analytics' },
    relatedEntity: { table: 'offers', id: overdue.id },
    dismissible: true,
  };
}
