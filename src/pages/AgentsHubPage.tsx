import { useState } from 'react';
import { Bot } from 'lucide-react';
import { useAuth } from '@/app/auth-context';
import { AppHeader } from '@/components/AppHeader';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { ErrorState } from '@/components/ErrorState';
import { AgentActionLink, AgentCardShell, AgentVoiceButton, CopilotModal } from '@/components/agents';
import { useJourneyState } from '@/domains/journey/api';
import { useMissionAlerts } from '@/domains/suggestions/useMissionAlerts';
import { firstRunPromptRule } from '@/domains/suggestions/rules';
import { AGENTS } from '@/domains/agents/config';
import type { CopilotIntent } from '@/domains/agents/copilotResponses';
import { useIsOnline } from '@/hooks/useIsOnline';
import { deriveDisplayName } from '@/lib/deriveDisplayName';

export default function AgentsHubPage() {
  const { user } = useAuth();
  const isOnline = useIsOnline();
  const journeyQuery = useJourneyState();
  const { suggestions, dismissAllShown: dismissAllAlerts } = useMissionAlerts(journeyQuery.data);
  const [showNotifications, setShowNotifications] = useState(false);
  const [copilotIntent, setCopilotIntent] = useState<CopilotIntent | null>(null);

  function dismissAllShown() {
    dismissAllAlerts();
    setShowNotifications(false);
  }

  const header = (
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
  const firstRun = firstRunPromptRule(state);

  return (
    <>
      {header}
      <main className="flex flex-col gap-4 px-4 py-6 pb-24">
        <div>
          <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-900/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
            <span>Neural Command Matrix · 5 of 5</span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">Specialized Mission Agents</h1>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-300">Every card below reflects your real, saved data.</p>
        </div>

        {firstRun && (
          <div className="rounded-2xl border border-purple-500/40 bg-purple-950/30 p-3.5 text-sm font-semibold text-white">
            {firstRun.title} — <span className="font-normal text-zinc-300">{firstRun.reason}</span>
          </div>
        )}

        {/* Hero / Autonomous Engine card */}
        <section className="space-y-3 rounded-2xl border border-[#EC4899]/40 bg-gradient-to-r from-[#21143D] to-[#150D27] p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-purple-600 to-pink-600 text-white shadow-md">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Autonomous Engine v2.4</div>
                <div className="text-[10px] text-zinc-300">Ask about any part of your mission</div>
              </div>
            </div>
            <div className="flex h-5 items-center gap-1" aria-hidden="true">
              <span className="h-3 w-1 animate-pulse rounded-full bg-[#EC4899]" />
              <span className="h-5 w-1 animate-pulse rounded-full bg-purple-400 delay-75" />
              <span className="h-2 w-1 animate-pulse rounded-full bg-cyan-400 delay-150" />
              <span className="h-4 w-1 animate-pulse rounded-full bg-pink-400 delay-100" />
            </div>
          </div>
          <AgentVoiceButton label="🎙 Command All Agents" onClick={() => setCopilotIntent('status')} className="w-full" fullWidth />
        </section>

        {AGENTS.map((agent) => (
          <AgentCardShell
            key={agent.id}
            agentNumber={agent.number}
            name={agent.name}
            subtitle={agent.subtitle}
            icon={agent.icon}
            accent={agent.accent}
            status={agent.getStatus(state)}
            highlightBorder={agent.highlightBorder}
            footer={agent.getActions(state).map((action, index) =>
              action.kind === 'voice' ? (
                <AgentVoiceButton key={index} label={action.label} onClick={() => setCopilotIntent('interview')} />
              ) : (
                <AgentActionLink key={index} to={action.to!} variant={action.variant ?? 'primary'} fullWidth={agent.getActions(state).length === 1}>
                  {action.label}
                </AgentActionLink>
              ),
            )}
          >
            {agent.renderPanel(state)}
          </AgentCardShell>
        ))}
      </main>

      {copilotIntent && <CopilotModal state={state} initialIntent={copilotIntent} onClose={() => setCopilotIntent(null)} />}

      {showNotifications && (
        <NotificationsDrawer suggestions={suggestions} onDismissAll={dismissAllShown} onClose={() => setShowNotifications(false)} />
      )}
    </>
  );
}
