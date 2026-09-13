import { Link } from 'react-router-dom';
import { ArrowRight, Home, Radar, Scale, Video, Wallet, type LucideIcon } from 'lucide-react';
import { ErrorState } from '@/components/ErrorState';
import { useJourneyState } from '@/domains/journey/api';

function AgentCard({
  number,
  label,
  icon: Icon,
  stats,
  to,
}: {
  number: string;
  label: string;
  icon: LucideIcon;
  stats: string[];
  to: string;
}) {
  return (
    <Link
      to={to}
      className="flex flex-col gap-3 rounded-lg border border-border bg-surface/[0.85] p-4 shadow-card backdrop-blur-md transition-transform active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cta">
          <Icon size={18} className="text-white" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Agent {number}</p>
          <p className="truncate text-sm font-semibold text-text-primary">{label}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {stats.map((stat) => (
          <span key={stat} className="rounded-full bg-surface-2/70 px-2.5 py-1 text-xs text-text-secondary">
            {stat}
          </span>
        ))}
      </div>
      <span className="inline-flex items-center gap-1 self-start text-xs font-medium text-primary-light">
        Open <ArrowRight size={13} aria-hidden="true" />
      </span>
    </Link>
  );
}

export default function AgentsHubPage() {
  const journeyQuery = useJourneyState();

  if (journeyQuery.isLoading) {
    return (
      <main className="px-4 py-6">
        <p role="status">Loading…</p>
      </main>
    );
  }

  if (journeyQuery.isError) {
    return (
      <main className="flex flex-col gap-4 px-4 py-6">
        <ErrorState message="Couldn't load your journey. Check your connection and try again." />
      </main>
    );
  }

  const state = journeyQuery.data;

  return (
    <main className="flex flex-col gap-4 px-4 py-6 pb-10">
      <div>
        <span aria-hidden="true" className="mb-2 block h-1 w-8 rounded-full bg-cta" />
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-light">Neural Command Matrix</p>
        <h1 className="font-sans text-2xl font-bold text-text-primary">Specialized Mission Agents</h1>
        <p className="text-sm text-text-secondary">Every card below reflects your real, saved data — tap through to manage it.</p>
      </div>

      <AgentCard
        number="01"
        label="Stay / PG & Residency"
        icon={Home}
        to="/travel"
        stats={[
          state.accommodation ? state.accommodation.name : 'No PG yet',
          state.accommodation ? `${state.accommodation.monthlyRentAed.toLocaleString()} AED/mo` : 'Add accommodation',
          state.visa ? `Visa: ${Math.max(state.visa.daysUntilExpiry, 0)}d left` : 'No visa yet',
        ]}
      />
      <AgentCard
        number="02"
        label="Scout Radar & Enterprise Opportunities"
        icon={Radar}
        to="/applications"
        stats={[
          `${state.applications.total} Lead${state.applications.total === 1 ? '' : 's'}`,
          `${state.applications.funnel[1]?.count ?? 0} Interviewed`,
          `${state.applications.funnel[2]?.count ?? 0} Offers`,
        ]}
      />
      <AgentCard
        number="03"
        label="Voice Copilot & Interview Briefing"
        icon={Video}
        to="/interviews"
        stats={
          state.nextInterview
            ? [`${state.nextInterview.companyName} next`, state.nextInterview.interviewDate]
            : ['No interview scheduled']
        }
      />
      <AgentCard
        number="04"
        label="Treasury & Relocation Liquidity"
        icon={Wallet}
        to="/expenses"
        stats={
          state.budget
            ? [`${state.budget.spentAed.toLocaleString()} / ${state.budget.amountAed.toLocaleString()} AED`, `${state.budget.percentUsed}% used`]
            : ['No budget set']
        }
      />
      <AgentCard
        number="05"
        label="Arbitration & Journey Brain"
        icon={Scale}
        to="/analytics"
        stats={[`${state.pendingOffers.length} pending offer${state.pendingOffers.length === 1 ? '' : 's'}`]}
      />
    </main>
  );
}
