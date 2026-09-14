import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type BannerTone = 'danger' | 'warning' | 'info';

const TONES: Record<BannerTone, string> = {
  danger: 'bg-rose-950/40 border-rose-500/30 text-rose-300',
  warning: 'bg-amber-950/30 border-amber-500/30 text-amber-300',
  info: 'bg-purple-950/40 border-purple-500/30 text-purple-200',
};

export function AlertBanner({ tone, icon: Icon, children }: { tone: BannerTone; icon?: LucideIcon; children: ReactNode }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-[11px] font-medium ${TONES[tone]}`}
    >
      {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </div>
  );
}
