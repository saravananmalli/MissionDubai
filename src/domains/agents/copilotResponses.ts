import { compareOffers, type OfferForComparison } from '@/domains/analytics/utils';
import type { JourneyState } from '@/domains/journey/types';

/**
 * A transparent, rule-based reply engine — not a live AI model. Every reply is
 * assembled from the user's own real JourneyState fields (same source the
 * agent cards render from), never a generated or fabricated claim. Keeps the
 * "Mission Copilot" interaction genuinely useful without pretending to be
 * something it isn't.
 */

export type CopilotIntent = 'interview' | 'visa' | 'budget' | 'offers' | 'accommodation' | 'applications' | 'followups' | 'status';

export interface QuickPrompt {
  intent: CopilotIntent;
  label: string;
}

export function getQuickPrompts(state: JourneyState): QuickPrompt[] {
  const prompts: QuickPrompt[] = [];
  if (state.overdueFollowUpCount > 0) prompts.push({ intent: 'followups', label: 'Follow-ups due' });
  if (state.nextInterview) prompts.push({ intent: 'interview', label: `Prep for ${state.nextInterview.companyName}` });
  if (state.visa && !state.visa.isExpired && state.visa.daysUntilExpiry <= 14) prompts.push({ intent: 'visa', label: 'Visa renewal steps' });
  if (state.pendingOffers.length >= 2) prompts.push({ intent: 'offers', label: 'Compare my offers' });
  if (state.budget) prompts.push({ intent: 'budget', label: "How's my budget?" });
  if (state.accommodation) prompts.push({ intent: 'accommodation', label: 'Rent details' });
  if (state.applications.total > 0) prompts.push({ intent: 'applications', label: 'Pipeline status' });
  if (prompts.length === 0) prompts.push({ intent: 'status', label: 'Mission status' });
  return prompts.slice(0, 4);
}

const KEYWORDS: Record<Exclude<CopilotIntent, 'status'>, string[]> = {
  interview: ['interview', 'prep', 'panel', 'rehears'],
  visa: ['visa', 'gdrfa', 'residency'],
  budget: ['budget', 'spend', 'burn', 'money', 'expense', 'aed'],
  offers: ['offer', 'compare', 'salary', 'negotiat'],
  accommodation: ['lease', 'rent', 'accommodation', 'pg', 'stay'],
  applications: ['application', 'job', 'pipeline', 'lead', 'apply'],
  followups: ['follow-up', 'follow up', 'followup'],
};

export function resolveIntent(text: string): CopilotIntent {
  const lower = text.toLowerCase();
  for (const [intent, keywords] of Object.entries(KEYWORDS) as [Exclude<CopilotIntent, 'status'>, string[]][]) {
    if (keywords.some((keyword) => lower.includes(keyword))) return intent;
  }
  return 'status';
}

function interviewReply(state: JourneyState): string {
  if (!state.nextInterview) return "You don't have an interview scheduled yet. Add one from the Interviews tab and I'll track the countdown here.";
  const { companyName, positionTitle, interviewDate, interviewTime, hoursUntil } = state.nextInterview;
  const countdown = hoursUntil <= 24 ? `in about ${Math.max(0, Math.round(hoursUntil))}h` : `in about ${Math.round(hoursUntil / 24)}d`;
  return `Your next interview is with ${companyName} for ${positionTitle}, ${countdown} (${interviewDate} ${interviewTime}). Open the Interviews tab for prep notes.`;
}

function visaReply(state: JourneyState): string {
  if (!state.visa) return "No visa on file yet. Log it from the Travel tab so I can track your renewal window.";
  if (state.visa.isExpired) return `Your visa expired on ${state.visa.expiryDate}. Head to Travel to update your renewal status.`;
  return `Your visa expires on ${state.visa.expiryDate} — ${state.visa.daysUntilExpiry} day${state.visa.daysUntilExpiry === 1 ? '' : 's'} left of a ${state.visa.durationDays}-day visa.`;
}

function budgetReply(state: JourneyState): string {
  if (!state.budget) return "You haven't set a budget yet. Set one from the Finances tab and I'll watch your burn rate.";
  const { spentAed, amountAed, percentUsed, burnRate } = state.budget;
  const trend = burnRate.willBudgetLast
    ? `you're on track with roughly ${Math.round(burnRate.estimatedRemainingAed).toLocaleString()} AED buffer projected`
    : `at this rate you may run short by roughly ${Math.abs(Math.round(burnRate.estimatedRemainingAed)).toLocaleString()} AED`;
  return `You've spent ${spentAed.toLocaleString()} of ${amountAed.toLocaleString()} AED (${percentUsed}%) — ${trend}.`;
}

function offersReply(state: JourneyState): string {
  if (state.pendingOffers.length === 0) return "No pending offers yet — keep applying and I'll help you compare them once they come in.";
  if (state.pendingOffers.length === 1) {
    const [offer] = state.pendingOffers;
    return `You have one pending offer: ${offer!.companyName} at ${offer!.salary_aed.toLocaleString()} AED. Head to Analytics to review it.`;
  }
  const comparison = compareOffers(
    state.pendingOffers.map(
      (offer): OfferForComparison => ({
        id: offer.id,
        salaryAed: offer.salary_aed,
        bonusPercent: offer.bonus_percent,
        leaveDays: offer.leave_days,
        visaSponsorship: offer.visa_sponsorship,
        growthRating: offer.growth_rating,
      }),
    ),
  );
  const best = state.pendingOffers.find((offer) => offer.id === comparison?.recommendedOfferId);
  const reasonText = comparison && comparison.reasons.length > 0 ? ` (${comparison.reasons.join(', ')})` : '';
  return `You have ${state.pendingOffers.length} competing offers. ${best ? `${best.companyName} looks strongest${reasonText}.` : ''} Open Analytics for the full comparison.`;
}

function accommodationReply(state: JourneyState): string {
  if (!state.accommodation) return "No accommodation logged yet. Add your PG or rental from the Travel tab.";
  const { name, monthlyRentAed, checkOutDate } = state.accommodation;
  return `${name} at ${monthlyRentAed.toLocaleString()} AED/month${checkOutDate ? `, paid through ${checkOutDate}` : ' on an ongoing rental'}.`;
}

function applicationsReply(state: JourneyState): string {
  if (state.applications.total === 0) return "No applications logged yet. Add one from the Jobs tab and I'll track your pipeline here.";
  const interviewed = state.applications.funnel[1]?.count ?? 0;
  const offered = state.applications.funnel[2]?.count ?? 0;
  const base = `You have ${state.applications.total} application${state.applications.total === 1 ? '' : 's'} — ${interviewed} interviewed, ${offered} offered so far.`;
  const recommendation = state.applications.recommendations[0];
  return recommendation ? `${base} ${recommendation}` : base;
}

function followupsReply(state: JourneyState): string {
  if (state.overdueFollowUpCount === 0) return "No follow-ups overdue right now — I'll flag it here once one is.";
  return `You have ${state.overdueFollowUpCount} follow-up${state.overdueFollowUpCount === 1 ? '' : 's'} overdue. Open an application's detail page to mark it complete or reschedule.`;
}

function statusReply(state: JourneyState): string {
  const parts = [`Day ${state.progress.daysElapsed} of ${state.progress.totalDays}`];
  if (state.visa) parts.push(`visa: ${Math.max(state.visa.daysUntilExpiry, 0)}d left`);
  if (state.budget) parts.push(`budget: ${state.budget.percentUsed}% used`);
  if (state.pendingOffers.length > 0) parts.push(`${state.pendingOffers.length} pending offer${state.pendingOffers.length === 1 ? '' : 's'}`);
  return `Here's where things stand — ${parts.join(', ')}. Ask me about your interview, visa, budget, offers, rent, or applications.`;
}

export function getCopilotReply(state: JourneyState, intent: CopilotIntent): string {
  switch (intent) {
    case 'interview':
      return interviewReply(state);
    case 'visa':
      return visaReply(state);
    case 'budget':
      return budgetReply(state);
    case 'offers':
      return offersReply(state);
    case 'accommodation':
      return accommodationReply(state);
    case 'applications':
      return applicationsReply(state);
    case 'followups':
      return followupsReply(state);
    case 'status':
      return statusReply(state);
  }
}
