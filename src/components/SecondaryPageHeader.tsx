import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { useJourneyState } from '@/domains/journey/api';
import { useMissionAlerts } from '@/domains/suggestions/useMissionAlerts';

/**
 * The shared header for every page reached by navigating "into" something
 * (not a bottom-nav root) — a real back arrow, the page title, and the same
 * notifications/logout icons every other page has. Bundles the Mission
 * Alerts bell + drawer so callers don't need to re-wire it per page.
 */
export function SecondaryPageHeader({ title, subtitle }: { title: string; subtitle?: ReactNode }) {
  const navigate = useNavigate();
  const journeyQuery = useJourneyState();
  const { suggestions, dismissAllShown } = useMissionAlerts(journeyQuery.data);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <AppHeader
        onBack={() => navigate(-1)}
        title={title}
        subtitle={subtitle}
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
