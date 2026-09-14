export type StatusTone = 'ok' | 'warning' | 'danger' | 'info' | 'neutral';

const TONES: Record<StatusTone, string> = {
  ok: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  danger: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  info: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  neutral: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
};

export function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${TONES[tone]}`}>
      {label}
    </span>
  );
}
