import { Mic } from 'lucide-react';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#18102C]';

/** Opens the real Mission Copilot modal — active, not a disabled placeholder. */
export function AgentVoiceButton({ label, onClick, className = '', fullWidth }: { label: string; onClick: () => void; className?: string; fullWidth?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] py-2 text-xs font-bold text-white shadow-[0_4px_12px_rgba(236,72,153,0.35)] transition-all active:scale-95 ${FOCUS_RING} ${fullWidth ? 'col-span-2' : ''} ${className}`}
    >
      <Mic className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
