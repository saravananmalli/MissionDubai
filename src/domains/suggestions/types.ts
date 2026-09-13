export type SuggestionType =
  | 'first_run_prompt'
  | 'visa_expiring'
  | 'interview_upcoming'
  | 'no_applications_recently'
  | 'budget_burn_high'
  | 'no_expense_today'
  | 'offer_awaiting_decision';

export type SuggestionAction =
  | { kind: 'navigate'; to: string }
  | { kind: 'open_flow'; flowId: 'travel' | 'application' | 'interview' | 'expense' | 'offer' };

/**
 * Mirrors the codebase's existing `compareOffers` precedent (see
 * domains/analytics/utils.ts): transparent, explainable output — a fixed
 * priority plus a human-readable `reason` — never an opaque model score.
 */
export interface Suggestion {
  id: string;
  type: SuggestionType;
  title: string;
  reason: string;
  /** lucide-react icon name, resolved to a component where rendered. */
  icon: string;
  priority: number;
  action: SuggestionAction;
  relatedEntity?: { table: string; id: string };
  dismissible: boolean;
}
