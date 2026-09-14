import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { AgentActionLink, AgentIconChip, DisabledVoiceButton, StatusPill } from '@/components/agents';
import { useJourneyState } from '@/domains/journey/api';
import { useMissionAlerts } from '@/domains/suggestions/useMissionAlerts';
import { getAgentById } from '@/domains/agents/config';

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const journeyQuery = useJourneyState();
  const { suggestions, dismissAllShown } = useMissionAlerts(journeyQuery.data);
  const [showNotifications, setShowNotifications] = useState(false);

  const agent = agentId ? getAgentById(agentId) : undefined;
  const goBack = () => navigate('/agents');

  if (!agent) {
    return (
      <>
        <AppHeader onBack={goBack} title="Agent not found" unreadCount={0} onNotificationsClick={() => {}} />
        <main className="px-4 py-6">
          <EmptyState message="This agent doesn't exist. Head back to the mission matrix." />
        </main>
      </>
    );
  }

  const header = (
    <AppHeader
      onBack={goBack}
      title={`Agent ${agent.number} · ${agent.name}`}
      subtitle={agent.subtitle}
      unreadCount={suggestions.length}
      onNotificationsClick={() => setShowNotifications(true)}
    />
  );

  if (journeyQuery.isLoading) {
    return (
      <>
        {header}
        <main className="px-4 py-6">
          <p role="status">Loading…</p>
        </main>
      </>
    );
  }

  if (journeyQuery.isError) {
    return (
      <>
        {header}
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState message="Couldn't load your journey. Check your connection and try again." onRetry={journeyQuery.refetch} />
        </main>
      </>
    );
  }

  const state = journeyQuery.data;
  const status = agent.getStatus(state);

  return (
    <>
      {header}
      <main className="flex flex-col gap-4 px-4 py-6 pb-10">
        <div className="flex items-center justify-between">
          <AgentIconChip icon={agent.icon} accent={agent.accent} />
          <StatusPill tone={status.tone} label={status.label} />
        </div>

        <div className="flex flex-col gap-3">{agent.renderPanel(state)}</div>

        <div className="flex flex-col gap-2 pt-2">
          {agent.getActions(state).map((action, index) =>
            action.kind === 'voice' ? (
              <DisabledVoiceButton key={index} label={action.label} className="w-full py-2.5 text-sm" />
            ) : (
              <AgentActionLink key={index} to={action.to!} variant={action.variant ?? 'primary'} fullWidth>
                {action.label}
              </AgentActionLink>
            ),
          )}
        </div>
      </main>

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
