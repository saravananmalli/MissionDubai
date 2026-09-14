export interface ProgressBarProps {
  label: string;
  valueText: string;
  percent: number;
  tone?: 'pink' | 'cyan';
}

const FILL_TONES: Record<NonNullable<ProgressBarProps['tone']>, string> = {
  pink: 'bg-gradient-to-r from-purple-500 to-[#EC4899]',
  cyan: 'bg-cyan-400',
};

export function ProgressBar({ label, valueText, percent, tone = 'cyan' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-300">{label}</span>
        <span className="font-bold text-cyan-300">{valueText}</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-[#0D071B]"
      >
        <div className={`h-full rounded-full ${FILL_TONES[tone]}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
