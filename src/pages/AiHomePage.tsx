import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/plus-jakarta-sans/700.css';
import '@fontsource/plus-jakarta-sans/800.css';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, Calendar, GitFork, Headphones, Home, Mic, ShieldCheck, Video, Wallet } from 'lucide-react';
import { useAuth } from '@/app/auth-context';
import { ErrorState } from '@/components/ErrorState';
import { AppHeader } from '@/components/AppHeader';
import { NotificationsDrawer } from '@/components/NotificationsDrawer';
import { useJourneyState } from '@/domains/journey/api';
import { useMissionAlerts } from '@/domains/suggestions/useMissionAlerts';
import { useIsOnline } from '@/hooks/useIsOnline';
import { deriveDisplayName } from '@/lib/deriveDisplayName';
import type { Suggestion, SuggestionAction } from '@/domains/suggestions/types';

type OpenFlowAction = Extract<SuggestionAction, { kind: 'open_flow' }>;

const FLOW_ROUTES: Record<OpenFlowAction['flowId'], string> = {
  travel: '/travel',
  application: '/applications',
  interview: '/interviews',
  expense: '/expenses',
  offer: '/analytics',
};

function resolveSuggestionRoute(action: SuggestionAction): string {
  return action.kind === 'navigate' ? action.to : FLOW_ROUTES[action.flowId];
}

function priorityBadgeLabel(priority: Suggestion): string {
  if (priority.type === 'interview_upcoming') {
    return 'INTERVIEW SOON';
  }
  if (priority.priority >= 90) return 'URGENT';
  if (priority.priority >= 70) return 'HIGH PRIORITY';
  return 'SUGGESTED';
}

const PRIORITY_ICONS: Record<Suggestion['type'], typeof Video> = {
  first_run_prompt: ShieldCheck,
  visa_expiring: ShieldCheck,
  interview_upcoming: Video,
  no_applications_recently: Briefcase,
  budget_burn_high: Wallet,
  no_expense_today: Wallet,
  offer_awaiting_decision: GitFork,
};

export default function AiHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOnline = useIsOnline();
  const journeyQuery = useJourneyState();
  const { suggestions, dismissAllShown: dismissAllAlerts } = useMissionAlerts(journeyQuery.data);
  const [showNotifications, setShowNotifications] = useState(false);

  if (journeyQuery.isLoading) {
    return (
      <main className="px-4 py-6">
        <p role="status">Loading…</p>
      </main>
    );
  }

  if (journeyQuery.isError) {
    return (
      <main className="flex flex-col gap-4 px-4 py-6">
        <ErrorState message="Couldn't load your journey. Check your connection and try again." onRetry={journeyQuery.refetch} />
      </main>
    );
  }

  const state = journeyQuery.data;
  const [priority] = suggestions;

  function handleSelect(suggestion: Suggestion) {
    navigate(resolveSuggestionRoute(suggestion.action));
  }

  function dismissAllShown() {
    dismissAllAlerts();
    setShowNotifications(false);
  }

  const visaUrgent = state.visa ? state.visa.daysUntilExpiry <= 3 : false;
  const visaElapsedPercent = state.visa
    ? Math.min(100, Math.max(0, Math.round(((state.visa.durationDays - Math.max(state.visa.daysUntilExpiry, 0)) / state.visa.durationDays) * 100)))
    : 0;

  const nextInterviewLabel = state.nextInterview
    ? state.nextInterview.hoursUntil <= 24
      ? `${Math.max(0, Math.round(state.nextInterview.hoursUntil))}h left`
      : `${Math.round(state.nextInterview.hoursUntil / 24)}d left`
    : null;

  const offeredCount = state.applications.funnel[2]?.count ?? 0;
  const screenedCount = state.applications.funnel[1]?.count ?? 0;
  const residencyArea = state.accommodation?.address.split(',')[0]?.trim();
  const priorityBadge = priority ? priorityBadgeLabel(priority) : null;
  const priorityCountdown =
    priority?.type === 'interview_upcoming' && state.nextInterview
      ? state.nextInterview.hoursUntil <= 24
        ? `T-MINUS ${Math.max(0, Math.round(state.nextInterview.hoursUntil))}H`
        : `${Math.round(state.nextInterview.hoursUntil / 24)}D LEFT`
      : priorityBadge;
  const PriorityIcon = priority ? PRIORITY_ICONS[priority.type] : null;

  return (
    <div style={{ fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
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
            <span>
              {isOnline ? 'Dubai Active' : 'Offline'}
              {state.visa && ` • ${Math.max(state.visa.daysUntilExpiry, 0)}d left`}
            </span>
          </span>
        }
        unreadCount={suggestions.length}
        onNotificationsClick={() => setShowNotifications(true)}
      />
      <p className="sr-only">Signed in as {user?.email}</p>

      <div className="px-4 py-3 space-y-3 pb-24">
        {/* 1. Hero Card */}
        <section
          className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#24173D] to-[#160E28] border border-[#523385]/60 p-5 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)]"
          aria-label="Mission overview"
        >
          <div className="absolute top-0 right-0 w-44 h-44 bg-[#EC4899]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start justify-between gap-2 mb-1">
            <h1
              className="text-2xl sm:text-[28px] font-black tracking-tight leading-tight text-white"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Your Dubai Mission. <br />
              <span className="bg-gradient-to-r from-[#EC4899] via-[#F472B6] to-[#A855F7] bg-clip-text text-transparent">
                Guided by AI.
              </span>
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-pink-300 font-medium shrink-0 pt-1.5">
              <span className={`w-2 h-2 rounded-full bg-[#EC4899] ${isOnline ? 'animate-pulse' : ''}`} />
              <span>{isOnline ? 'Live Sync' : 'Offline'}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-300 font-medium mb-4">
            Day {state.progress.daysElapsed} of {state.progress.totalDays}
            {state.visa && ` • ${Math.max(state.visa.daysUntilExpiry, 0)} Days Remaining on Visa`}
          </p>

          {state.visa ? (
            <div className="bg-[#19102E]/90 rounded-2xl border border-[#3E2568] p-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-zinc-200 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#EC4899]" />
                  <span>Visa Expiry: {state.visa.expiryDate}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                    visaUrgent
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {visaUrgent ? 'HIGH URGENCY' : 'ON TRACK'}
                </span>
              </div>

              <div className="w-full h-2.5 bg-[#0D071B] rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-[#EC4899] via-[#D946EF] to-[#8B5CF6] rounded-full shadow-[0_0_12px_rgba(236,72,153,0.8)]"
                  style={{ width: `${visaElapsedPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-0.5 font-medium">
                <span>Entered: {state.visa.issueDate}</span>
                <span className="text-pink-300 font-semibold">
                  {visaElapsedPercent}% elapsed ({Math.max(state.visa.daysUntilExpiry, 0)}d left)
                </span>
                <span>Duration: {state.visa.durationDays}d</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => navigate('/travel')}
              className="text-xs font-bold text-pink-400 hover:text-pink-300 transition-colors"
            >
              Add visa details →
            </button>
          )}
        </section>

        {/* 2. AI Key Priority Card */}
        {priority && (
          <section
            className="relative rounded-3xl bg-gradient-to-b from-[#1C1233] to-[#120B22] border border-[#EC4899]/35 p-4.5 shadow-[0_8px_28px_rgba(236,72,153,0.15)] space-y-3"
            aria-label="AI Key Priority"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black tracking-wider uppercase text-pink-400">
                <span className="text-yellow-400">⚡</span>
                <span>AI KEY PRIORITY</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#EC4899]/20 text-[#F472B6] border border-[#EC4899]/40 text-[10px] font-black tracking-wider">
                {priorityCountdown}
              </span>
            </div>

            <div>
              <h2 className="text-base font-bold text-white tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {priority.title}
              </h2>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed italic bg-purple-950/20 p-2.5 rounded-xl border border-purple-500/15">
                "{priority.reason}"
              </p>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#2A184A] border border-purple-500/30 flex items-center justify-center text-pink-400">
                  {PriorityIcon && <PriorityIcon className="w-4 h-4" />}
                </div>
                <div className="text-[10px] text-zinc-400 font-semibold">Ready to review</div>
              </div>

              <button
                onClick={() => handleSelect(priority)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white text-xs font-bold shadow-[0_4px_16px_rgba(236,72,153,0.4)] hover:brightness-110 active:scale-95 transition-all"
              >
                <span>{priority.type === 'first_run_prompt' ? 'Get Started' : 'Open'}</span>
              </button>
            </div>
          </section>
        )}

        {/* 3. Bento Grid */}
        <section className="grid grid-cols-2 gap-3" aria-label="Odyssey Status Overview">
          <Link
            to="/interviews"
            className="rounded-2xl bg-[#19112C]/90 border border-[#3E2568] p-3.5 flex flex-col justify-between hover:border-purple-400/40 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-lg bg-purple-900/50 border border-purple-500/30 flex items-center justify-center text-purple-300">
                <Calendar className="w-4 h-4" />
              </div>
              {state.nextInterview && <span className="w-2 h-2 rounded-full bg-[#EC4899] ring-2 ring-pink-400/30" />}
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">NEXT EVENT</span>
              <h3 className="text-sm font-bold text-white mt-0.5 truncate">
                {state.nextInterview ? state.nextInterview.companyName : 'No interview yet'}
              </h3>
            </div>
            {state.nextInterview ? (
              <div className="flex items-center gap-1.5 mt-2.5">
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-semibold truncate">
                  {state.nextInterview.positionTitle}
                </span>
                <span className="text-[10px] text-zinc-400 font-medium shrink-0">{nextInterviewLabel}</span>
              </div>
            ) : (
              <span className="text-[10px] text-zinc-400 mt-2.5 font-medium">Schedule one from Jobs</span>
            )}
          </Link>

          <Link
            to="/expenses"
            className="rounded-2xl bg-[#19112C]/90 border border-[#3E2568] p-3.5 flex flex-col justify-between hover:border-cyan-400/40 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-900/50 border border-cyan-500/30 flex items-center justify-center text-cyan-300">
                <Wallet className="w-4 h-4" />
              </div>
              {state.budget && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                  {state.budget.percentUsed}% Run
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">BUDGET PULSE</span>
              <div className="text-sm font-bold text-white mt-0.5">
                {state.budget ? (
                  <>
                    {state.budget.spentAed.toLocaleString()} <span className="text-[10px] text-zinc-400">AED</span>
                  </>
                ) : (
                  'No budget set'
                )}
              </div>
            </div>
            <div className="mt-2.5">
              {state.budget && (
                <div className="w-full h-1.5 bg-[#0D071B] rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, state.budget.percentUsed)}%` }} />
                </div>
              )}
              <span className="text-[9px] text-zinc-400 mt-1 block">
                {state.budget ? `Cap: ${state.budget.amountAed.toLocaleString()} AED` : 'Set one from Finances'}
              </span>
            </div>
          </Link>

          <Link
            to="/applications"
            className="rounded-2xl bg-[#19112C]/90 border border-[#3E2568] p-3.5 flex flex-col justify-between hover:border-pink-400/40 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-lg bg-pink-900/50 border border-pink-500/30 flex items-center justify-center text-pink-300">
                <GitFork className="w-4 h-4" />
              </div>
              {offeredCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[9px] font-bold">
                  {offeredCount} Offer{offeredCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">DUBAI FUNNEL</span>
              <div className="text-sm font-bold text-white mt-0.5">
                {state.applications.total} Lead{state.applications.total === 1 ? '' : 's'}
              </div>
            </div>
            <div className="text-[10px] text-zinc-400 mt-2.5 font-medium">
              {screenedCount} Screened • {offeredCount} Offered
            </div>
          </Link>

          <Link
            to="/travel"
            className="rounded-2xl bg-[#19112C]/90 border border-[#3E2568] p-3.5 flex flex-col justify-between hover:border-teal-400/40 active:scale-[0.98] transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-7 h-7 rounded-lg bg-teal-900/50 border border-teal-500/30 flex items-center justify-center text-teal-300">
                <Home className="w-4 h-4" />
              </div>
              {residencyArea && (
                <span className="px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[9px] font-bold truncate max-w-[70px]">
                  {residencyArea}
                </span>
              )}
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">RESIDENCY BASE</span>
              <div className="text-sm font-bold text-white mt-0.5 truncate">
                {state.accommodation ? state.accommodation.name : 'No PG yet'}
              </div>
            </div>
            {state.accommodation && (
              <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-2.5">
                <span>{state.accommodation.checkOutDate ? `Paid to ${state.accommodation.checkOutDate}` : 'Ongoing lease'}</span>
                <span className="text-teal-300 font-semibold">{(state.accommodation.monthlyRentAed / 1000).toFixed(1)}k/m</span>
              </div>
            )}
          </Link>
        </section>

        {/* 4. Specialized Mission Agents Row */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white tracking-tight">Specialized Mission Agents</span>
            </div>
            <button onClick={() => navigate('/agents')} className="text-[11px] font-bold text-pink-400 hover:text-pink-300">
              View All (5) →
            </button>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
            <Link
              to="/travel"
              className="flex-shrink-0 w-24 rounded-2xl bg-[#18102B] border border-[#3E2568] p-2.5 flex flex-col items-center text-center hover:border-purple-400/40"
            >
              <div className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-1.5">
                <Home className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-white truncate w-full">Stay / PG</span>
              <span className="text-[9px] text-purple-300 mt-0.5 truncate w-full">
                {state.accommodation ? state.accommodation.name : 'No PG yet'}
              </span>
            </Link>

            <Link
              to="/applications"
              className="flex-shrink-0 w-24 rounded-2xl bg-[#18102B] border border-[#3E2568] p-2.5 flex flex-col items-center text-center hover:border-pink-400/40"
            >
              <div className="w-9 h-9 rounded-full bg-pink-900/60 border border-pink-500/40 flex items-center justify-center text-pink-300 mb-1.5">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-white truncate w-full">Job Scout</span>
              <span className="text-[9px] text-pink-300 mt-0.5">{state.applications.total} Leads</span>
            </Link>

            <Link
              to="/interviews"
              className="flex-shrink-0 w-24 rounded-2xl bg-[#18102B] border border-[#EC4899]/50 p-2.5 flex flex-col items-center text-center relative"
            >
              {state.nextInterview && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EC4899] animate-ping" />}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-900 to-pink-900 border border-pink-400/50 flex items-center justify-center text-pink-300 mb-1.5">
                <Headphones className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-white truncate w-full">Interview</span>
              <span className="text-[9px] text-emerald-400 font-semibold mt-0.5 truncate w-full">
                {state.nextInterview ? state.nextInterview.interviewDate : 'None scheduled'}
              </span>
            </Link>

            <Link
              to="/expenses"
              className="flex-shrink-0 w-24 rounded-2xl bg-[#18102B] border border-[#3E2568] p-2.5 flex flex-col items-center text-center hover:border-cyan-400/40"
            >
              <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-600 flex items-center justify-center text-zinc-300 mb-1.5">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-white truncate w-full">Finance</span>
              <span className="text-[9px] text-cyan-300 mt-0.5">{state.budget ? `${state.budget.percentUsed}% used` : 'No budget'}</span>
            </Link>

            <Link
              to="/analytics"
              className="flex-shrink-0 w-24 rounded-2xl bg-[#18102B] border border-[#3E2568] p-2.5 flex flex-col items-center text-center hover:border-purple-400/40"
            >
              <div className="w-9 h-9 rounded-full bg-purple-900/60 border border-purple-500/40 flex items-center justify-center text-purple-300 mb-1.5">
                <GitFork className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-bold text-white truncate w-full">Arbitration</span>
              <span className="text-[9px] text-purple-300 mt-0.5">{state.pendingOffers.length} pending</span>
            </Link>
          </div>
        </section>

        {/* 5. AI Copilot Listening Bar (inert — no real voice/NLU yet) */}
        <section
          className="rounded-2xl bg-gradient-to-r from-[#201538] to-[#160E2A] border border-[#593491]/60 p-3 flex items-center justify-between shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
          aria-label="AI Copilot"
        >
          <div className="flex items-center gap-2.5 overflow-hidden pr-2">
            <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
            </div>
            <div className="truncate">
              <div className="text-[10px] uppercase font-bold tracking-wider text-pink-300">MissionDubai Copilot</div>
              <div className="text-xs text-zinc-300 truncate">{priority ? priority.reason : 'Tell MissionDubai what happened'}</div>
            </div>
          </div>

          <button
            type="button"
            disabled
            title="Voice/free-text input arrives in a future update"
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white text-xs font-bold shadow-[0_4px_12px_rgba(236,72,153,0.4)] opacity-50"
          >
            <Mic className="w-3.5 h-3.5" />
            <span>Brief Me</span>
          </button>
        </section>
      </div>

      {showNotifications && (
        <NotificationsDrawer suggestions={suggestions} onDismissAll={dismissAllShown} onClose={() => setShowNotifications(false)} />
      )}
    </div>
  );
}
