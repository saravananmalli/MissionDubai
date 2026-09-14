import type { LucideIcon } from 'lucide-react';

export type IconAccent = 'purple' | 'pink' | 'cyan';

const ACCENTS: Record<IconAccent, string> = {
  purple: 'bg-purple-900/50 border-purple-500/30 text-purple-300',
  pink: 'bg-pink-900/50 border-pink-500/40 text-pink-300',
  cyan: 'bg-cyan-900/50 border-cyan-500/30 text-cyan-300',
};

export function AgentIconChip({ icon: Icon, accent }: { icon: LucideIcon; accent: IconAccent }) {
  return (
    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${ACCENTS[accent]}`}>
      <Icon className="h-5 w-5" aria-hidden="true" />
    </div>
  );
}
