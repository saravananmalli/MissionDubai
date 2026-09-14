import { useState } from 'react';
import { useAuth } from '@/app/auth-context';
import { AppHeader } from '@/components/AppHeader';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { useJourneyState } from '@/domains/journey/api';
import { useMissionAlerts } from '@/domains/suggestions/useMissionAlerts';
import { useIsOnline } from '@/hooks/useIsOnline';
import { deriveDisplayName } from '@/lib/deriveDisplayName';

/** The shared identity header for bottom-nav root pages (Jobs/Applications, Finances/Expenses) — same brand/name/online-status block as Pulse and Agents, no back arrow since there's nowhere to "go back" from a primary tab. */
export function PrimaryPageHeader() {
  const { user } = useAuth();
  const isOnline = useIsOnline();
  const journeyQuery = useJourneyState();
  const { suggestions, dismissAllShown } = useMissionAlerts(journeyQuery.data);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <AppHeader
        title={
          <span className="flex items-center gap-1.5">
            {deriveDisplayName(user?.email)}
            <span className="h-2 w-2 rounded-full bg-purple-500 ring-2 ring-purple-400/30" aria-hidden="true" />
          </span>
        }
        subtitle={
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'animate-pulse bg-emerald-400' : 'bg-zinc-500'}`} aria-hidden="true" />
            <span>{isOnline ? 'Dubai Active' : 'Offline'}</span>
          </span>
        }
        unreadCount={suggestions.length}
        onNotificationsClick={() => setShowNotifications(true)}
      />
      {showNotifications && (
        <NotificationsDrawer
          suggestions={suggestions}
          onDismissAll={() => {
            dismissAllShown();
            setShowNotifications(false);
          }}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </>
  );
}
