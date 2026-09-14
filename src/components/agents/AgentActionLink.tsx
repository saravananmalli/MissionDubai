import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

const VARIANTS = {
  primary: 'bg-purple-600 text-white hover:bg-purple-500 active:scale-95',
  secondary: 'border border-purple-500/30 bg-[#23173F] text-zinc-200 hover:text-white',
} as const;

const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#18102C]';

interface AgentActionLinkProps {
  to: string;
  variant: keyof typeof VARIANTS;
  children: ReactNode;
  fullWidth?: boolean;
}

export function AgentActionLink({ to, variant, children, fullWidth }: AgentActionLinkProps) {
  return (
    <Link
      to={to}
      className={`rounded-xl py-2 text-center text-xs font-bold transition-all ${VARIANTS[variant]} ${FOCUS_RING} ${fullWidth ? 'col-span-2' : ''}`}
    >
      {children}
    </Link>
  );
}
