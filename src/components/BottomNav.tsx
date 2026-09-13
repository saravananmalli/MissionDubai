import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { Activity, Bot, Briefcase, Wallet, Zap, type LucideIcon } from 'lucide-react';
import { QuickAddSheet } from '@/components/QuickAddSheet';
import { useJourneyState } from '@/domains/journey/api';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
  badge?: string;
}

/** Floating rounded pill bar — active tab gets its own rounded highlight capsule; Action is a plain centered circle with no label. */
export function BottomNav() {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const journeyQuery = useJourneyState();
  const state = journeyQuery.data;
  const upcomingInterviewCount = state?.upcomingInterviews.length ?? 0;

  const leftItems: NavItem[] = [
    { to: '/', label: 'Pulse', icon: Activity, end: true },
    { to: '/agents', label: 'Agents', icon: Bot, end: false, badge: '5' },
  ];
  const rightItems: NavItem[] = [
    {
      to: '/applications',
      label: 'Jobs',
      icon: Briefcase,
      end: false,
      badge: upcomingInterviewCount > 0 ? String(upcomingInterviewCount) : undefined,
    },
    { to: '/expenses', label: 'Finances', icon: Wallet, end: false },
  ];

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-40 px-4 pointer-events-none"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <nav
          aria-label="Primary"
          className="pointer-events-auto mx-auto flex max-w-[430px] items-center justify-around rounded-[28px] border border-white/5 bg-[#15101F]/95 px-2 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
        >
          {leftItems.map((item) => (
            <DockLink key={item.to} {...item} />
          ))}

          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="-mt-2 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#EC4899] to-[#8B5CF6] shadow-[0_8px_20px_rgba(236,72,153,0.5)] transition-transform active:scale-95"
            aria-label="Quick add"
            aria-haspopup="dialog"
          >
            <Zap className="h-6 w-6 text-white" />
          </button>

          {rightItems.map((item) => (
            <DockLink key={item.to} {...item} />
          ))}
        </nav>
      </div>

      {isQuickAddOpen && <QuickAddSheet onClose={() => setIsQuickAddOpen(false)} />}
    </>
  );
}

function DockLink({ to, label, icon: Icon, end, badge }: NavItem) {
  return (
    <NavLink to={to} end={end} className="relative flex-1 focus:outline-none">
      {({ isActive }) => (
        <div
          className={clsx(
            'flex flex-col items-center justify-center gap-0.5 rounded-2xl py-1.5 transition-colors',
            isActive && 'bg-white/[0.07]',
          )}
        >
          <div className="relative">
            <Icon className={clsx('h-5 w-5', isActive ? 'text-[#EC4899]' : 'text-zinc-400')} strokeWidth={isActive ? 2.25 : 1.75} />
            {badge && (
              <span className="absolute -top-1.5 -right-2 rounded-full bg-[#EC4899] px-1 text-[9px] font-bold leading-tight text-white">
                {badge}
              </span>
            )}
          </div>
          <span className={clsx('text-xs font-medium tracking-tight', isActive ? 'text-white' : 'text-zinc-400')}>{label}</span>
        </div>
      )}
    </NavLink>
  );
}
