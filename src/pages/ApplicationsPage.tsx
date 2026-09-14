import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Briefcase, Calendar, Camera, Send } from 'lucide-react';
import { ChatFlow } from '@/chat-flow';
import { ErrorState } from '@/components/ErrorState';
import { PrimaryPageHeader } from '@/components/PrimaryPageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ProgressBar, StatusPill } from '@/components/agents';
import { applicationFlow } from '@/domains/applications/flowConfig';
import { useApplications } from '@/domains/applications/api';
import { ApplicationCard } from '@/domains/applications/components/ApplicationCard';
import { computeSourceBreakdown, formatEnumLabel } from '@/domains/applications/utils';
import { computeApplicationFunnel } from '@/domains/analytics/utils';
import { useInterviews } from '@/domains/interviews/api';
import { useOffers } from '@/domains/analytics/api';
import { useCurrentTrip } from '@/hooks/useCurrentTrip';

type PipelineFilter = 'all' | 'applied' | 'interviews' | 'offers';

export default function ApplicationsPage() {
  const tripQuery = useCurrentTrip();
  const applicationsQuery = useApplications(tripQuery.data?.id);
  const interviewsQuery = useInterviews(tripQuery.data?.id);
  const offersQuery = useOffers(tripQuery.data?.id);
  const [searchParams] = useSearchParams();
  // Lets a link (e.g. the Agents matrix's "Log Application" button) jump straight into the add flow instead of just landing on the list.
  const [isAddingApplication, setIsAddingApplication] = useState(() => searchParams.get('action') === 'add');
  const [filter, setFilter] = useState<PipelineFilter>('all');

  if (tripQuery.isLoading) {
    return (
      <>
        <PrimaryPageHeader />
        <main className="px-4 py-6">
          <p role="status">Loading…</p>
        </main>
      </>
    );
  }

  if (tripQuery.isError) {
    return (
      <>
        <PrimaryPageHeader />
        <main className="flex flex-col gap-4 px-4 py-6">
          <ErrorState message="Couldn't load your trip. Check your connection and try again." onRetry={() => void tripQuery.refetch()} />
        </main>
      </>
    );
  }

  const applications = applicationsQuery.data ?? [];
  const interviews = interviewsQuery.data ?? [];
  const offers = offersQuery.data ?? [];
  const sourceBreakdown = computeSourceBreakdown(applications, interviews, offers);

  const interviewedApplicationIds = new Set(interviews.map((i) => i.application_id));
  const offeredApplicationIds = new Set(offers.map((o) => o.application_id));
  const funnel = computeApplicationFunnel(applications.length, interviewedApplicationIds.size, offeredApplicationIds.size);

  // Real, not fabricated: "awaiting response" = applied but no interview yet; "active" interview = still scheduled, not cancelled.
  const awaitingResponse = applications.filter(
    (a) => (a.status === 'applied' || a.status === 'waiting_response') && !interviewedApplicationIds.has(a.id),
  );
  const activeInterviews = [...interviews]
    .filter((i) => i.interview_status === 'scheduled')
    .sort((a, b) => `${a.interview_date}T${a.interview_time}`.localeCompare(`${b.interview_date}T${b.interview_time}`));
  const pendingOffers = offers.filter((o) => o.status === 'pending');

  const totalVisits = applications.reduce((sum, a) => sum + a.visits.length, 0);

  const filterTabs: { id: PipelineFilter; label: string }[] = [
    { id: 'all', label: `All (${applications.length})` },
    { id: 'applied', label: `Applied (${awaitingResponse.length})` },
    { id: 'interviews', label: `Interviews (${activeInterviews.length})` },
    { id: 'offers', label: `Offers (${pendingOffers.length})` },
  ];

  const showApplied = filter === 'all' || filter === 'applied';
  const showInterviews = filter === 'all' || filter === 'interviews';
  const showOffers = filter === 'all' || filter === 'offers';

  function initials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('');
  }

  function handleFinished() {
    setIsAddingApplication(false);
    void tripQuery.refetch();
    void applicationsQuery.refetch();
  }

  return (
    <>
      <PrimaryPageHeader />
      <main className="flex flex-col gap-4 px-4 py-6 pb-24">
        {/* Telemetry header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-900/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
              <span>Job Application Pipeline</span>
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">Applications & Company Visits</h1>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-300">
              {applications.length} application{applications.length === 1 ? '' : 's'} tracked, real data only.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs text-zinc-300">
            <Link to="/photos" className="underline hover:text-pink-300">
              Photos
            </Link>
            <Link to="/interviews" className="underline hover:text-pink-300">
              Interviews
            </Link>
          </div>
        </div>

        {applicationsQuery.isError && (
          <ErrorState
            message="Couldn't load your applications. Check your connection and try again."
            onRetry={() => void applicationsQuery.refetch()}
          />
        )}

        {applications.length === 0 && !isAddingApplication ? (
          <EmptyState message="No applications yet — add your first one below." />
        ) : (
          <>
            {/* Filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`min-h-11 whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
                    filter === tab.id
                      ? 'bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)]'
                      : 'border border-[#3E2763] bg-[#18112B] text-zinc-400 hover:border-purple-400/40 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Funnel telemetry */}
            <section className="space-y-3 rounded-2xl border border-[#44286D] bg-gradient-to-b from-[#1C1233] to-[#120B22] p-4 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <BarChart3 className="h-4 w-4 text-pink-400" aria-hidden="true" />
                <span>Pipeline Funnel</span>
              </div>
              <div className="space-y-2.5">
                {funnel.map((stage) => (
                  <ProgressBar
                    key={stage.label}
                    label={stage.label}
                    valueText={
                      stage.conversionFromPreviousPercent === null
                        ? String(stage.count)
                        : `${stage.count} (${stage.conversionFromPreviousPercent}%)`
                    }
                    percent={stage.conversionFromPreviousPercent ?? 100}
                    tone="pink"
                  />
                ))}
              </div>
            </section>

            {/* Company visits banner */}
            {totalVisits > 0 && (
              <Link
                to="/photos"
                className="relative flex h-20 items-center justify-between overflow-hidden rounded-2xl border border-[#432A6D] bg-gradient-to-r from-[#21123F] via-[#2D1652] to-[#160A2D] p-3.5"
              >
                <div>
                  <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-[#EC4899]/40 bg-[#EC4899]/20 px-2.5 py-0.5 text-[10px] font-bold text-pink-300">
                    <Camera className="h-3 w-3" aria-hidden="true" />
                    <span>COMPANY VISITS</span>
                  </div>
                  <div className="text-xs text-zinc-300">View photos from your visits</div>
                </div>
                <span className="rounded-full border border-purple-500/40 bg-purple-900/60 px-2.5 py-1 text-xs font-bold text-white">
                  {totalVisits} photo{totalVisits === 1 ? '' : 's'} →
                </span>
              </Link>
            )}

            {/* Stage: Offers */}
            {showOffers && pendingOffers.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#EC4899]" aria-hidden="true" />
                    <h2 className="text-sm font-extrabold tracking-tight text-white">Offers Received</h2>
                  </div>
                  <span className="rounded-full border border-[#EC4899]/40 bg-[#EC4899]/20 px-2 py-0.5 text-[9px] font-black uppercase text-[#EC4899]">
                    Action Required
                  </span>
                </div>
                {pendingOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="space-y-3 rounded-2xl border border-[#EC4899]/50 bg-gradient-to-b from-[#21153E] to-[#160D2B] p-4 shadow-[0_6px_20px_rgba(236,72,153,0.15)]"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-pink-500/40 bg-pink-900/50 text-xs font-black text-pink-300">
                        {initials(offer.companyName)}
                      </div>
                      <h3 className="text-sm font-black text-white">{offer.companyName}</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-2 rounded-xl border border-purple-500/20 bg-[#120A22]/90 p-2.5 text-center">
                      <div>
                        <span className="block text-[9px] font-bold uppercase text-zinc-400">Salary</span>
                        <span className="mt-0.5 block text-xs font-extrabold text-white">{offer.salary_aed.toLocaleString()} AED</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase text-zinc-400">Bonus</span>
                        <span className="mt-0.5 block text-xs font-extrabold text-pink-400">
                          {offer.bonus_percent !== null ? `+${offer.bonus_percent}%` : '—'}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold uppercase text-zinc-400">Visa</span>
                        <span className="mt-0.5 block text-xs font-extrabold text-emerald-400">
                          {offer.visa_sponsorship ? 'Sponsored' : 'Not sponsored'}
                        </span>
                      </div>
                    </div>
                    <Link
                      to="/analytics"
                      className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] py-2 text-xs font-bold text-white shadow-[0_4px_14px_rgba(236,72,153,0.35)] transition-all active:scale-95"
                    >
                      <span>Review Offer</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                ))}
              </section>
            )}

            {/* Stage: Active interviews */}
            {showInterviews && activeInterviews.length > 0 && (
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-400" aria-hidden="true" />
                    <h2 className="text-sm font-extrabold tracking-tight text-white">Active Interviews</h2>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-300">
                    {activeInterviews.length} scheduled
                  </span>
                </div>
                {activeInterviews.map((interview) => (
                  <div key={interview.id} className="space-y-2.5 rounded-2xl border border-[#3E2763] bg-[#19112C] p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{interview.companyName}</span>
                        <span className="rounded bg-purple-900/50 px-1.5 py-0.5 text-[9px] font-semibold text-purple-300">
                          Round {interview.round_number} · {formatEnumLabel(interview.type)}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 rounded-full border border-pink-500/30 bg-pink-500/20 px-2 py-0.5 text-[9px] font-bold text-pink-300">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        {interview.interview_date} {interview.interview_time}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-zinc-300">{interview.positionTitle}</div>
                    {interview.meeting_link && (
                      <a href={interview.meeting_link} className="text-[11px] text-pink-300 underline">
                        Join video call
                      </a>
                    )}
                    <div className="flex justify-end pt-0.5">
                      <Link
                        to={`/interviews/${interview.id}`}
                        className="rounded-full bg-purple-600 px-3.5 py-1 text-[11px] font-bold text-white transition-all hover:bg-purple-500 active:scale-95"
                      >
                        Prep Deck →
                      </Link>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Stage: Applied, awaiting response */}
            {showApplied && awaitingResponse.length > 0 && (
              <section className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-zinc-400" aria-hidden="true" />
                    <h2 className="text-sm font-extrabold tracking-tight text-white">Applied — Awaiting Response</h2>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400">{awaitingResponse.length} companies</span>
                </div>
                <div className="space-y-1.5">
                  {awaitingResponse.map((application) => (
                    <Link
                      key={application.id}
                      to={`/applications/${application.id}`}
                      className="flex items-center justify-between rounded-xl border border-[#372358] bg-[#171027] p-2.5 transition-colors hover:border-purple-500/30"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-950 text-[10px] font-bold text-purple-300">
                          {initials(application.company_name)}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{application.company_name}</div>
                          <div className="text-[10px] text-zinc-400">{application.position_title}</div>
                        </div>
                      </div>
                      <StatusPill tone="neutral" label={formatEnumLabel(application.status)} />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {sourceBreakdown.length > 1 && (
              <details className="rounded-lg border border-border bg-surface/40 p-4 text-sm text-text-secondary">
                <summary className="cursor-pointer font-medium text-text-primary">Where are my applications coming from?</summary>
                <ul className="mt-2 flex flex-col gap-1">
                  {sourceBreakdown.map((row) => (
                    <li key={row.label}>
                      {row.label} — {row.applicationCount} application{row.applicationCount === 1 ? '' : 's'} · {row.interviewedCount} interviewed
                      · {row.offerCount} offered
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {/* All applications (full list, with visits) — a plain div, not a <section>: nesting it inside
                a landmark section would make any `section` locator scoped to one company ambiguous, since
                it would match both this wrapper and that company's own Card <section> underneath it. */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                <h2 className="text-sm font-extrabold tracking-tight text-white">All Applications</h2>
              </div>
              {applications.map((application) => (
                <ApplicationCard key={application.id} application={application} onVisitAdded={() => void applicationsQuery.refetch()} />
              ))}
            </div>
          </>
        )}

        {isAddingApplication ? (
          <ChatFlow flow={applicationFlow} onFinished={handleFinished} />
        ) : (
          <section className="space-y-3 rounded-2xl border border-[#EC4899]/40 bg-gradient-to-r from-[#20153B] to-[#150D27] p-4 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-md">
                <Send className="h-4 w-4" aria-hidden="true" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-white">Log a New Application</h3>
                <span className="text-[10px] text-zinc-300">Answer a few quick questions</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingApplication(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] px-4 py-2.5 text-xs font-bold text-white shadow-[0_4px_16px_rgba(236,72,153,0.35)] transition-all active:scale-95"
            >
              <span>+ Add Application</span>
            </button>
          </section>
        )}
      </main>
    </>
  );
}
