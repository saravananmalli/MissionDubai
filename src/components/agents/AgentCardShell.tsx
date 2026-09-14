import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { AgentIconChip, type IconAccent } from '@/components/agents/AgentIconChip';
import { StatusPill, type StatusTone } from '@/components/agents/StatusPill';

interface AgentCardShellProps {
  agentNumber: string;
  name: string;
  subtitle: string;
  icon: LucideIcon;
  accent: IconAccent;
  status: { tone: StatusTone; label: string };
  /** Agent 03's glowing pink-border treatment for the "hot" voice/interview card. */
  highlightBorder?: boolean;
  children: ReactNode;
  /** Rendered inside a 2-column grid — pass a single `fullWidth` action for a lone CTA. */
  footer: ReactNode;
}

export function AgentCardShell({ agentNumber, name, subtitle, icon, accent, status, highlightBorder, children, footer }: AgentCardShellProps) {
  return (
    <section
      className={
        highlightBorder
          ? 'space-y-3 rounded-2xl border border-[#EC4899]/50 bg-gradient-to-b from-[#22153E] to-[#160E2A] p-4 shadow-[0_6px_20px_rgba(236,72,153,0.15)]'
          : 'space-y-3 rounded-2xl border border-[#3E2568] bg-[#18102C] p-4'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <AgentIconChip icon={icon} accent={accent} />
          <div className="min-w-0">
            <h2 className="truncate text-xs font-black text-white">
              Agent {agentNumber} · {name}
            </h2>
            <p className="truncate text-[11px] text-zinc-300">{subtitle}</p>
          </div>
        </div>
        <StatusPill tone={status.tone} label={status.label} />
      </div>

      {children}

      <div className="grid grid-cols-2 gap-2 pt-0.5">{footer}</div>
    </section>
  );
}
