import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export type AgentButtonTone = 'muted' | 'highlight';

const TONES: Record<AgentButtonTone, string> = {
  muted: 'border border-purple-500/30 bg-[#23173F] text-zinc-200 hover:text-white',
  highlight: 'bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)]',
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#18102C]';

const BASE = `flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-95 ${FOCUS_RING}`;

interface AgentButtonProps {
  icon: LucideIcon;
  label: string;
  tone?: AgentButtonTone;
  fullWidth?: boolean;
  /** Renders as a real link when provided; otherwise as a button (e.g. opening the Copilot modal). */
  to?: string;
  onClick?: () => void;
}

/** The one reusable button every agent card's footer uses — a real link when `to` is given, a real button (e.g. for the Copilot) otherwise. */
export function AgentButton({ icon: Icon, label, tone = 'muted', fullWidth, to, onClick }: AgentButtonProps) {
  // w-full covers standalone use (e.g. the hero card, no grid parent); col-span-2 covers use inside a 2-column card footer grid. Harmless together either way.
  const className = `${BASE} ${TONES[tone]} ${fullWidth ? 'w-full col-span-2' : ''}`;

  if (to) {
    return (
      <Link to={to} className={className}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
