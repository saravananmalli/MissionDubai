import { Mic } from 'lucide-react';

/** Mirrors AiHomePage's inert Copilot mic button — voice input isn't built yet, so this stays disabled rather than faking a modal. */
export function DisabledVoiceButton({ label, className = '' }: { label: string; className?: string }) {
  return (
    <button
      type="button"
      disabled
      title="Voice/free-text input arrives in a future update"
      className={`flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] py-2 text-xs font-bold text-white opacity-50 ${className}`}
    >
      <Mic className="h-3.5 w-3.5" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
