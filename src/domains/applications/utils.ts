import type { ApplicationSource } from '@/lib/database.types';
import type { Application } from '@/domains/applications/api';

/** `'no_response'` -> `'no response'`. Used for timeline text and small UI labels (pair with a `capitalize` class for display). */
export function formatEnumLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

const SOURCE_LABELS: Record<ApplicationSource, string> = {
  linkedin: 'LinkedIn',
  job_board: 'Job Board',
  company_site: 'Company Websites',
  referral: 'Referrals',
  other: 'Other',
  naukrigulf: 'NaukriGulf',
  gulftalent: 'GulfTalent',
};

/** Job-board/"other" specifics (e.g. "Indeed", "WhatsApp") take priority over the generic enum label, per spec's source-analytics examples. */
export function formatSourceLabel(source: ApplicationSource, sourceName: string | null): string {
  if (sourceName && (source === 'job_board' || source === 'other')) return sourceName;
  return SOURCE_LABELS[source];
}

export interface PipelineStage {
  label: string;
  count: number;
}

export interface PipelineBreakdown {
  stages: PipelineStage[];
}

interface InterviewForPipeline {
  application_id: string;
  type: string;
}

/**
 * Seven stages matching the spec's dashboard example verbatim (Saved / Applied
 * / Interview / Final Round / Offer / Rejected / No Response). "Final Round"
 * is derived from a real, unambiguous signal — an interview whose `type` is
 * literally `'final'` — rather than a guessed "last round" heuristic, so
 * nothing here is fabricated.
 */
export function computePipelineBreakdown(applications: Application[], interviews: InterviewForPipeline[]): PipelineBreakdown {
  const finalRoundApplicationIds = new Set(interviews.filter((i) => i.type === 'final').map((i) => i.application_id));
  const interviewedApplicationIds = new Set(interviews.map((i) => i.application_id));

  let saved = 0;
  let applied = 0;
  let interview = 0;
  let finalRound = 0;
  let offer = 0;
  let rejected = 0;
  let noResponse = 0;

  for (const app of applications) {
    if (finalRoundApplicationIds.has(app.id)) {
      finalRound += 1;
      continue;
    }
    if (app.status === 'saved') saved += 1;
    else if (app.status === 'applied') applied += 1;
    else if (app.status === 'offer' || app.status === 'hired') offer += 1;
    else if (app.status === 'rejected' || app.status === 'candidate_rejected') rejected += 1;
    else if (app.status === 'no_response') noResponse += 1;
    else if (interviewedApplicationIds.has(app.id)) interview += 1;
  }

  return {
    stages: [
      { label: 'Saved', count: saved },
      { label: 'Applied', count: applied },
      { label: 'Interview', count: interview },
      { label: 'Final Round', count: finalRound },
      { label: 'Offer', count: offer },
      { label: 'Rejected', count: rejected },
      { label: 'No Response', count: noResponse },
    ],
  };
}

export interface SourceBreakdownRow {
  label: string;
  applicationCount: number;
  interviewedCount: number;
  offerCount: number;
}

interface RelatedById {
  application_id: string;
}

/** Spec's "Where are my applications coming from?" — grouped by real source data, sorted by volume. */
export function computeSourceBreakdown(applications: Application[], interviews: RelatedById[], offers: RelatedById[]): SourceBreakdownRow[] {
  const interviewedIds = new Set(interviews.map((i) => i.application_id));
  const offeredIds = new Set(offers.map((o) => o.application_id));
  const rows = new Map<string, SourceBreakdownRow>();

  for (const app of applications) {
    const label = formatSourceLabel(app.source, app.source_name);
    const row = rows.get(label) ?? { label, applicationCount: 0, interviewedCount: 0, offerCount: 0 };
    row.applicationCount += 1;
    if (interviewedIds.has(app.id)) row.interviewedCount += 1;
    if (offeredIds.has(app.id)) row.offerCount += 1;
    rows.set(label, row);
  }

  return Array.from(rows.values()).sort((a, b) => b.applicationCount - a.applicationCount);
}
