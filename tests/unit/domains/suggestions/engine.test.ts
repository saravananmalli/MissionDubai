import { describe, expect, it } from 'vitest';
import { rankSuggestions } from '@/domains/suggestions/engine';
import { makeJourneyState } from './testFixtures';

describe('rankSuggestions', () => {
  it('returns nothing for a quiet, healthy journey', () => {
    expect(rankSuggestions(makeJourneyState())).toEqual([]);
  });

  it('ranks the most urgent suggestion first regardless of insertion order', () => {
    const state = makeJourneyState({
      visa: { issueDate: '2026-08-01', durationDays: 60, expiryDate: '2026-09-16', daysUntilExpiry: 3, isExpired: false }, // priority 95
      hasExpenseToday: false, // priority 40
      applications: { total: 3, funnel: [], daysSinceLastApplication: 6 }, // priority 60
    });
    const ranked = rankSuggestions(state);
    expect(ranked.map((s) => s.priority)).toEqual([95, 60, 40]);
  });

  it('caps output at the given limit', () => {
    const state = makeJourneyState({
      visa: { issueDate: '2026-08-01', durationDays: 60, expiryDate: '2026-09-16', daysUntilExpiry: 3, isExpired: false },
      hasExpenseToday: false,
      applications: { total: 3, funnel: [], daysSinceLastApplication: 6 },
      upcomingInterviews: [
        { id: 'i1', companyName: 'Tech Corp', positionTitle: 'Dev', interviewDate: '2026-09-14', interviewTime: '10:00', hoursUntil: 10 },
      ],
    });
    expect(rankSuggestions(state, new Set(), 2)).toHaveLength(2);
  });

  it('filters out dismissed suggestions by id', () => {
    const state = makeJourneyState({ hasExpenseToday: false });
    const withoutDismissal = rankSuggestions(state);
    expect(withoutDismissal).toHaveLength(1);

    const dismissed = new Set([withoutDismissal[0]!.id]);
    expect(rankSuggestions(state, dismissed)).toEqual([]);
  });

  it('never filters out the non-dismissible first-run prompt', () => {
    const state = makeJourneyState({ hasAnyData: false });
    const dismissed = new Set(['first-run-prompt']);
    expect(rankSuggestions(state, dismissed)).toHaveLength(1);
  });
});
