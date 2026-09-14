import {
  AlertTriangle,
  ArrowLeftRight,
  Award,
  BedDouble,
  Briefcase,
  CheckCircle2,
  CreditCard,
  FileText,
  Headphones,
  Home,
  Landmark,
  Mic,
  PieChart,
  Radar,
  Scale,
  Send,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  AlertBanner,
  InfoPanel,
  InfoPanelEmpty,
  ProgressBar,
  StatGrid,
  type AgentButtonTone,
  type IconAccent,
  type StatusTone,
} from '@/components/agents';
import { compareOffers, type OfferForComparison } from '@/domains/analytics/utils';
import { daysUntil } from '@/domains/travel/utils';
import type { JourneyState } from '@/domains/journey/types';

export type AgentId = 'basecamp' | 'scout-radar' | 'voice-copilot' | 'treasury' | 'arbitration';

export interface AgentAction {
  kind: 'link' | 'voice';
  label: string;
  icon: LucideIcon;
  to?: string;
  tone?: AgentButtonTone;
}

export interface AgentDefinition {
  id: AgentId;
  number: string;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  accent: IconAccent;
  highlightBorder?: boolean;
  getStatus(state: JourneyState): { tone: StatusTone; label: string };
  /** One-line summary shown on the hub's compact tile. */
  getSummary(state: JourneyState): string;
  /** The richer panel shown on the agent's own detail page. */
  renderPanel(state: JourneyState): ReactNode;
  getActions(state: JourneyState): AgentAction[];
}

function interviewCountdown(hoursUntil: number): string {
  return hoursUntil <= 24 ? `${Math.max(0, Math.round(hoursUntil))}h left` : `${Math.round(hoursUntil / 24)}d left`;
}

const basecamp: AgentDefinition = {
  id: 'basecamp',
  number: '01',
  name: 'Basecamp',
  subtitle: 'Stay / PG & Residency Agent',
  icon: Home,
  accent: 'purple',
  getStatus(state) {
    if (!state.accommodation && !state.visa) return { tone: 'neutral', label: 'SETUP NEEDED' };
    if (state.visa && !state.visa.isExpired && state.visa.daysUntilExpiry <= 7) {
      return state.visa.daysUntilExpiry <= 3 ? { tone: 'danger', label: 'URGENT' } : { tone: 'warning', label: 'RENEWAL DUE' };
    }
    return { tone: 'ok', label: 'ACTIVE' };
  },
  getSummary(state) {
    if (!state.accommodation) return 'No accommodation logged yet.';
    return `${state.accommodation.name} · ${state.accommodation.monthlyRentAed.toLocaleString()} AED/mo`;
  },
  renderPanel(state) {
    return (
      <>
        {state.accommodation ? (
          <InfoPanel className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-zinc-300">
              <BedDouble className="h-3.5 w-3.5 shrink-0 text-purple-300" aria-hidden="true" />
              {state.accommodation.name}
              {state.accommodation.checkOutDate ? ` · paid to ${state.accommodation.checkOutDate}` : ' · ongoing rental'}
            </span>
            <span className="font-bold text-purple-300">{state.accommodation.monthlyRentAed.toLocaleString()} AED/mo</span>
          </InfoPanel>
        ) : (
          <InfoPanelEmpty>No accommodation logged yet.</InfoPanelEmpty>
        )}

        {state.visa && !state.visa.isExpired && state.visa.daysUntilExpiry <= 7 && (
          <AlertBanner tone={state.visa.daysUntilExpiry <= 3 ? 'danger' : 'warning'} icon={AlertTriangle}>
            Visa: {state.visa.daysUntilExpiry} day{state.visa.daysUntilExpiry === 1 ? '' : 's'} left on your {state.visa.durationDays}-day
            visa.
          </AlertBanner>
        )}
      </>
    );
  },
  getActions() {
    // Both "Manage Rent" and "Visa & Residency" land on the same Travel & Accommodation page — one real destination, one button.
    return [{ kind: 'link', label: 'Manage Rent & Visa', icon: Home, to: '/travel' }];
  },
};

const scoutRadar: AgentDefinition = {
  id: 'scout-radar',
  number: '02',
  name: 'Scout Radar',
  subtitle: 'Enterprise Opportunity Engine',
  icon: Radar,
  accent: 'pink',
  getStatus(state) {
    if (state.applications.total === 0) return { tone: 'neutral', label: 'NOT STARTED' };
    if (state.applications.daysSinceLastApplication !== null && state.applications.daysSinceLastApplication >= 5) {
      return { tone: 'warning', label: 'STALLED' };
    }
    return { tone: 'ok', label: 'SYNCED' };
  },
  getSummary(state) {
    if (state.applications.total === 0) return 'No applications logged yet.';
    const interviewed = state.applications.funnel[1]?.count ?? 0;
    const offered = state.applications.funnel[2]?.count ?? 0;
    return `${state.applications.total} lead${state.applications.total === 1 ? '' : 's'} · ${interviewed} interviewed · ${offered} offered`;
  },
  renderPanel(state) {
    const sponsoredOfferCount = state.pendingOffers.filter((offer) => offer.visa_sponsorship).length;
    return (
      <>
        {state.applications.total === 0 ? (
          <InfoPanelEmpty>No applications logged yet.</InfoPanelEmpty>
        ) : (
          <StatGrid stats={state.applications.funnel.map((stage) => ({ label: stage.label, value: String(stage.count) }))} />
        )}

        {sponsoredOfferCount > 0 && (
          <AlertBanner tone="info" icon={Award}>
            {sponsoredOfferCount} pending offer{sponsoredOfferCount === 1 ? '' : 's'} include visa sponsorship.
          </AlertBanner>
        )}
      </>
    );
  },
  getActions(state) {
    return [
      { kind: 'link', label: `${state.applications.total} Opportunities`, icon: Briefcase, to: '/applications' },
      { kind: 'link', label: 'Log Application', icon: UserPlus, to: '/applications?action=add' },
    ];
  },
};

const voiceCopilot: AgentDefinition = {
  id: 'voice-copilot',
  number: '03',
  name: 'Voice Copilot',
  subtitle: 'Interview Briefing & Rehearsal',
  icon: Headphones,
  accent: 'pink',
  highlightBorder: true,
  getStatus(state) {
    if (!state.nextInterview) return { tone: 'neutral', label: 'STANDBY' };
    if (state.nextInterview.hoursUntil <= 48) return { tone: 'danger', label: 'IMMINENT' };
    return { tone: 'ok', label: 'SCHEDULED' };
  },
  getSummary(state) {
    if (!state.nextInterview) return 'No interview scheduled yet.';
    return `${state.nextInterview.companyName} · ${interviewCountdown(state.nextInterview.hoursUntil)}`;
  },
  renderPanel(state) {
    if (!state.nextInterview) return <InfoPanelEmpty>No interview scheduled yet.</InfoPanelEmpty>;
    return (
      <InfoPanel className="space-y-1">
        <div className="flex items-center justify-between font-bold text-white">
          <span>{state.nextInterview.companyName}</span>
          <span className="text-[10px] font-bold text-pink-300">{interviewCountdown(state.nextInterview.hoursUntil)}</span>
        </div>
        <div className="text-[11px] text-zinc-300">
          {state.nextInterview.positionTitle} · {state.nextInterview.interviewDate} {state.nextInterview.interviewTime}
        </div>
      </InfoPanel>
    );
  },
  getActions(state) {
    return [
      { kind: 'voice', label: 'Open Simulator', icon: Mic, tone: 'highlight' },
      {
        kind: 'link',
        label: state.nextInterview ? 'Interview Details' : 'View Interviews',
        icon: FileText,
        to: state.nextInterview ? `/interviews/${state.nextInterview.id}` : '/interviews',
      },
    ];
  },
};

const treasury: AgentDefinition = {
  id: 'treasury',
  number: '04',
  name: 'Treasury',
  subtitle: 'Relocation Liquidity & Finance',
  icon: Landmark,
  accent: 'cyan',
  getStatus(state) {
    if (!state.budget) return { tone: 'neutral', label: 'NOT SET' };
    switch (state.budget.alertLevel) {
      case 'ok':
        return { tone: 'ok', label: 'OPTIMAL' };
      case 'warning':
        return { tone: 'warning', label: 'WATCH' };
      case 'danger':
        return { tone: 'danger', label: 'HIGH BURN' };
      case 'exceeded':
        return { tone: 'danger', label: 'EXCEEDED' };
    }
  },
  getSummary(state) {
    if (!state.budget) return 'No budget set yet.';
    return `${state.budget.percentUsed}% of ${state.budget.amountAed.toLocaleString()} AED used`;
  },
  renderPanel(state) {
    if (!state.budget) return <InfoPanelEmpty>No budget set yet.</InfoPanelEmpty>;
    return (
      <InfoPanel className="space-y-2">
        <ProgressBar
          label={`${state.budget.spentAed.toLocaleString()} AED spent of ${state.budget.amountAed.toLocaleString()} AED cap`}
          valueText={`${state.budget.percentUsed}%`}
          percent={state.budget.percentUsed}
        />
        <div className="flex items-center justify-between text-[10px] text-zinc-400">
          <span>Daily burn: {Math.round(state.budget.burnRate.dailyAverageAed).toLocaleString()} AED/day</span>
          <span className={state.budget.burnRate.willBudgetLast ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-300'}>
            {state.budget.burnRate.willBudgetLast
              ? `~${Math.round(state.budget.burnRate.estimatedRemainingAed).toLocaleString()} AED buffer projected`
              : `Projected to run short by ~${Math.abs(Math.round(state.budget.burnRate.estimatedRemainingAed)).toLocaleString()} AED`}
          </span>
        </div>
      </InfoPanel>
    );
  },
  getActions(state) {
    return [
      { kind: 'link', label: state.budget ? 'Log Expense' : 'Set a Budget', icon: CreditCard, to: '/expenses' },
      { kind: 'link', label: 'Burn Breakdown', icon: PieChart, to: '/financial-report' },
    ];
  },
};

const arbitration: AgentDefinition = {
  id: 'arbitration',
  number: '05',
  name: 'Arbitration',
  subtitle: 'Journey Brain & Offer Arbiter',
  icon: Scale,
  accent: 'purple',
  getStatus(state) {
    const { pendingOffers, now } = state;
    if (pendingOffers.length === 0) return { tone: 'neutral', label: 'NO OFFERS' };
    const overdue = pendingOffers.some((offer) => -daysUntil(offer.received_date, now) > 2);
    if (overdue) return { tone: 'danger', label: 'DECISION OVERDUE' };
    if (pendingOffers.length >= 2) return { tone: 'info', label: 'RECOMMENDING' };
    return { tone: 'ok', label: 'AWAITING DECISION' };
  },
  getSummary(state) {
    if (state.pendingOffers.length === 0) return 'No offers yet — keep applying.';
    return `${state.pendingOffers.length} pending offer${state.pendingOffers.length === 1 ? '' : 's'}`;
  },
  renderPanel(state) {
    if (state.pendingOffers.length === 0) return <InfoPanelEmpty>No offers yet — keep applying.</InfoPanelEmpty>;

    if (state.pendingOffers.length === 1) {
      const offer = state.pendingOffers[0]!;
      return (
        <InfoPanel className="flex items-center justify-between">
          <span className="text-zinc-300">{offer.companyName}</span>
          <span className="font-bold text-white">{offer.salary_aed.toLocaleString()} AED</span>
        </InfoPanel>
      );
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

    return (
      <InfoPanel className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wide text-zinc-400">{state.pendingOffers.length} competing offers</p>
        {state.pendingOffers.map((offer) => {
          const isRecommended = offer.id === comparison?.recommendedOfferId;
          return (
            <div
              key={offer.id}
              className={`flex items-center justify-between rounded p-1.5 ${isRecommended ? 'bg-[#19102D] text-emerald-300' : 'bg-[#19102D] text-zinc-300'}`}
            >
              <span className="font-semibold">
                {offer.companyName}
                {isRecommended && <span className="ml-1.5 rounded bg-emerald-500/20 px-1 text-[9px] font-black text-emerald-300">RECOMMENDED</span>}
              </span>
              <span className="font-bold">{offer.salary_aed.toLocaleString()} AED</span>
            </div>
          );
        })}
        {comparison && comparison.reasons.length > 0 && <p className="text-[10px] text-zinc-400">Why: {comparison.reasons.join(', ')}</p>}
      </InfoPanel>
    );
  },
  getActions(state) {
    if (state.pendingOffers.length === 0) {
      return [
        { kind: 'link', label: 'Keep Applying', icon: Send, to: '/applications?action=add', tone: 'highlight' },
        { kind: 'link', label: 'View Pipeline', icon: Briefcase, to: '/applications' },
      ];
    }
    return [
      { kind: 'link', label: 'Compare Offers', icon: ArrowLeftRight, to: '/analytics' },
      { kind: 'link', label: 'Review & Decide', icon: CheckCircle2, to: '/analytics#recommendation', tone: 'highlight' },
    ];
  },
};

export const AGENTS: AgentDefinition[] = [basecamp, scoutRadar, voiceCopilot, treasury, arbitration];

export function getAgentById(id: string): AgentDefinition | undefined {
  return AGENTS.find((agent) => agent.id === id);
}
