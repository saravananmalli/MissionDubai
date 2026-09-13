import type { JourneyState } from '@/domains/journey/types';
import {
  budgetBurnHighRule,
  firstRunPromptRule,
  interviewUpcomingRule,
  noApplicationsRecentlyRule,
  noExpenseTodayRule,
  offerAwaitingDecisionRule,
  visaExpiringRule,
} from '@/domains/suggestions/rules';
import type { Suggestion } from '@/domains/suggestions/types';

const DEFAULT_LIMIT = 5;

/**
 * Deterministic, explainable ranking — extends the codebase's existing
 * `compareOffers` precedent rather than delegating to a model call. See the
 * plan: the LLM never touches suggestion ranking, only free-text parsing.
 */
export function rankSuggestions(
  state: JourneyState,
  dismissedIds: ReadonlySet<string> = new Set(),
  limit: number = DEFAULT_LIMIT,
): Suggestion[] {
  const candidates: (Suggestion | null)[] = [
    firstRunPromptRule(state),
    visaExpiringRule(state),
    ...interviewUpcomingRule(state),
    noApplicationsRecentlyRule(state),
    budgetBurnHighRule(state),
    noExpenseTodayRule(state),
    offerAwaitingDecisionRule(state),
  ];

  return candidates
    .filter((suggestion): suggestion is Suggestion => suggestion !== null)
    .filter((suggestion) => !suggestion.dismissible || !dismissedIds.has(suggestion.id))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
