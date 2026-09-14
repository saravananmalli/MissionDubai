import { rankSuggestions } from '@/domains/suggestions/engine';
import { useDismissedSuggestionIds, useDismissSuggestion } from '@/domains/suggestions/api';
import type { JourneyState } from '@/domains/journey/types';

/** Shared by every page whose AppHeader bell opens the Mission Alerts drawer — one source of truth for the suggestion list, not re-derived per page. */
export function useMissionAlerts(state: JourneyState | undefined) {
  const dismissedQuery = useDismissedSuggestionIds();
  const dismissMutation = useDismissSuggestion();

  const suggestions = state ? rankSuggestions(state, dismissedQuery.data ?? new Set()) : [];

  function dismissAllShown() {
    suggestions.filter((s) => s.dismissible).forEach((s) => dismissMutation.mutate(s.id));
  }

  return { suggestions, dismissAllShown };
}
