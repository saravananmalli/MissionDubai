import type { Application, ApplicationEvent, FollowUp } from '@/domains/applications/api';

/**
 * Rule-based recommendations only — same contract as
 * `copilotResponses.ts` ("a transparent, rule-based reply engine — not a live
 * AI model"). Every message here is built strictly from real rows the user
 * already entered; nothing is guessed or generated. Terminal statuses are
 * excluded from every "still active" check below.
 */
const TERMINAL_STATUSES = new Set(['hired', 'rejected', 'candidate_rejected', 'withdrawn', 'no_response', 'closed']);

interface RecommendationInterview {
  application_id: string;
  interview_date: string;
  type: string;
  round_number: number;
  round_result: string;
  interview_status: string;
}

function daysBetween(fromISO: string, now: Date): number {
  const from = new Date(`${fromISO}T00:00:00`);
  return Math.floor((now.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

/** Spec example: "You have 5 applications with no response for more than 10 days." */
export function staleApplicationsRecommendation(applications: Application[], followUps: FollowUp[], now: Date = new Date()): string | null {
  const hasPendingFollowUp = new Set(followUps.filter((f) => f.status === 'pending').map((f) => f.application_id));
  const stale = applications.filter(
    (app) =>
      (app.status === 'applied' || app.status === 'waiting_response') &&
      daysBetween(app.applied_date, now) >= 10 &&
      !hasPendingFollowUp.has(app.id),
  );
  if (stale.length === 0) return null;
  return `You have ${stale.length} application${stale.length === 1 ? '' : 's'} with no response for more than 10 days. Want to schedule a follow-up?`;
}

/** Spec example: "You have two interviews scheduled on the same day." */
export function interviewCollisionRecommendation(interviews: (RecommendationInterview & { companyName: string })[]): string | null {
  const byDate = new Map<string, (RecommendationInterview & { companyName: string })[]>();
  for (const interview of interviews) {
    if (interview.interview_status !== 'scheduled') continue;
    const list = byDate.get(interview.interview_date) ?? [];
    list.push(interview);
    byDate.set(interview.interview_date, list);
  }
  for (const [date, list] of byDate) {
    if (list.length >= 2) {
      const companies = [...new Set(list.map((i) => i.companyName))];
      if (companies.length >= 2) return `You have ${list.length} interviews scheduled on ${date}: ${companies.join(', ')}.`;
    }
  }
  return null;
}

/** Spec example: "You passed Round 1. Round 2 has not been scheduled yet." */
export function roundGapRecommendation(
  interviews: (RecommendationInterview & { companyName: string })[],
): string | null {
  const byApplication = new Map<string, (RecommendationInterview & { companyName: string })[]>();
  for (const interview of interviews) {
    const list = byApplication.get(interview.application_id) ?? [];
    list.push(interview);
    byApplication.set(interview.application_id, list);
  }
  for (const rounds of byApplication.values()) {
    const passed = rounds.filter((r) => r.round_result === 'passed').sort((a, b) => b.round_number - a.round_number)[0];
    if (!passed) continue;
    const nextRoundExists = rounds.some((r) => r.round_number === passed.round_number + 1);
    if (!nextRoundExists) {
      return `You passed Round ${passed.round_number} at ${passed.companyName}. Round ${passed.round_number + 1} hasn't been scheduled yet.`;
    }
  }
  return null;
}

/**
 * "Latest" version = whichever resume_version has the most recent
 * resume_submitted_date across the user's own applications — a real signal,
 * not an invented "master resume" concept.
 */
export function staleResumeVersionRecommendation(applications: Application[]): string | null {
  const submitted = applications.filter((a) => a.resume_version && a.resume_submitted_date);
  if (submitted.length < 2) return null;

  const latest = [...submitted].sort((a, b) => (b.resume_submitted_date! < a.resume_submitted_date! ? -1 : 1))[0]!;
  const outdated = submitted.find((a) => a.resume_version !== latest.resume_version && a.id !== latest.id);
  if (!outdated) return null;

  return `You applied to ${outdated.company_name} using resume version "${outdated.resume_version}" — your most recent version is "${latest.resume_version}".`;
}

/** Application Detail page: "This application has been inactive for 14 days." */
export function inactiveApplicationRecommendation(application: Application, events: ApplicationEvent[], now: Date = new Date()): string | null {
  if (TERMINAL_STATUSES.has(application.status)) return null;
  const lastEvent = [...events].sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))[0];
  const lastActivityISO = lastEvent?.occurred_at.slice(0, 10) ?? application.applied_date;
  const daysInactive = daysBetween(lastActivityISO, now);
  if (daysInactive < 14) return null;
  return `This application has been inactive for ${daysInactive} days.`;
}

/** Application Detail page: "You have an interview tomorrow. Would you like to review your preparation notes?" */
export function upcomingInterviewPrepRecommendation(interviews: { interview_date: string; prep_notes: string | null }[], now: Date = new Date()): string | null {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

  const interviewTomorrow = interviews.find((i) => i.interview_date === tomorrowISO);
  if (!interviewTomorrow) return null;
  return interviewTomorrow.prep_notes
    ? 'You have an interview tomorrow. Want to review your preparation notes?'
    : 'You have an interview tomorrow and no preparation notes yet. Want to add some?';
}

/** Combines every global (cross-application) recommendation for the Scout Radar card / ApplicationsPage. */
export function getGlobalRecommendations(
  applications: Application[],
  interviews: (RecommendationInterview & { companyName: string })[],
  followUps: FollowUp[],
  now: Date = new Date(),
): string[] {
  return [
    staleApplicationsRecommendation(applications, followUps, now),
    interviewCollisionRecommendation(interviews),
    roundGapRecommendation(interviews),
    staleResumeVersionRecommendation(applications),
  ].filter((message): message is string => message !== null);
}

/** Combines every per-application recommendation for the Application Detail page. */
export function getApplicationRecommendations(
  application: Application,
  applicationInterviews: { interview_date: string; prep_notes: string | null }[],
  events: ApplicationEvent[],
  now: Date = new Date(),
): string[] {
  return [inactiveApplicationRecommendation(application, events, now), upcomingInterviewPrepRecommendation(applicationInterviews, now)].filter(
    (message): message is string => message !== null,
  );
}
