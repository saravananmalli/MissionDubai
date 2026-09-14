export interface Stat {
  label: string;
  value: string;
  tone?: 'default' | 'accent' | 'success';
}

const VALUE_TONES: Record<NonNullable<Stat['tone']>, string> = {
  default: 'text-white',
  accent: 'text-pink-300',
  success: 'text-emerald-400',
};

/** Fixed class map, not a dynamic `grid-cols-${n}` string, so Tailwind's JIT scanner can see it. */
const COLUMN_CLASSES: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
};

export function StatGrid({ stats }: { stats: Stat[] }) {
  const columns = COLUMN_CLASSES[stats.length] ?? 'grid-cols-3';
  return (
    <div className={`grid gap-2 rounded-xl border border-purple-500/20 bg-[#110A21] p-2.5 text-center ${columns}`}>
      {stats.map((stat) => (
        <div key={stat.label}>
          <span className={`block text-xs font-black ${VALUE_TONES[stat.tone ?? 'default']}`}>{stat.value}</span>
          <span className="text-[9px] text-zinc-400">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
