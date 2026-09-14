import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AgentIconChip, type IconAccent } from '@/components/agents/AgentIconChip';
import { StatusPill, type StatusTone } from '@/components/agents/StatusPill';

interface AgentTileProps {
  to: string;
  agentNumber: string;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  accent: IconAccent;
  status: { tone: StatusTone; label: string };
  summary: string;
}

/** A whole-row tap target for the Agents hub — replaces the old compact card's own footer buttons: tapping anywhere opens the agent's detail page. */
export function AgentTile({ to, agentNumber, name, subtitle, icon, accent, status, summary }: AgentTileProps) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-2xl border border-[#3E2568] bg-[#18102C] p-3.5 text-left transition-all hover:border-purple-400/40 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0813]"
    >
      <AgentIconChip icon={icon} accent={accent} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="truncate text-sm font-black text-white">
            Agent {agentNumber} · {name}
          </h2>
          <StatusPill tone={status.tone} label={status.label} />
        </div>
        <p className="truncate text-[11px] text-zinc-400">{subtitle}</p>
        <p className="mt-1 truncate text-xs text-zinc-300">{summary}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
    </Link>
  );
}
