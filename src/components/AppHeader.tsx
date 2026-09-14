import { Bell, ChevronLeft, LogOut } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAuth } from '@/app/auth-context';
import { DubaiNeonBadge } from '@/components/DubaiNeonBadge';

interface AppHeaderProps {
  /** Back-navigation handler. When provided, a back arrow replaces the brand badge — every other page keeps the same bell/logout icons. */
  onBack?: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  unreadCount: number;
  onNotificationsClick: () => void;
}

/** The one sticky header shared by every authenticated page — first extracted from AiHomePage, now also used by the Agents hub and its detail pages. */
export function AppHeader({ onBack, title, subtitle, unreadCount, onNotificationsClick }: AppHeaderProps) {
  const { signOut } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-[#2C1F45]/50 bg-[#0B0813]/85 px-4 py-3 backdrop-blur-xl">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#3E2763] bg-[#1A122E] text-zinc-300 transition-all hover:text-white active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <DubaiNeonBadge size="md" />
        )}
        <div className="min-w-0">
          <div className="truncate text-base font-bold tracking-tight text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {title}
          </div>
          {subtitle && <div className="truncate text-[11px] font-medium text-zinc-400">{subtitle}</div>}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onNotificationsClick}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#3E2763] bg-[#1A122E] text-zinc-300 shadow-inner transition-all hover:text-white active:scale-95"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#EC4899] ring-2 ring-[#0B0813]" aria-hidden="true" />}
        </button>
        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Log out"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3E2763] bg-[#1A122E] text-zinc-300 transition-all hover:text-white active:scale-95"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
