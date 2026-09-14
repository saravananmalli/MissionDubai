import type { ApplicationSource, FinalOutcome, ResumeStatus, VisitPurpose } from '@/lib/database.types';

export type SalaryRangeChoice = '100-150k' | '150-200k' | '200-250k' | '250k+' | 'will_update_later';
export type YesNoUnsureChoice = 'yes' | 'no' | 'unsure' | 'need_to_ask';

// NaukriGulf/LinkedIn/etc. are already specific, named sources — no follow-up
// needed. Only generic buckets that don't yet identify the actual source
// (which job board? who referred you? what "other" source?) ask for one.
const SOURCES_WITH_NAME = ['job_board', 'referral', 'other'] as const;
export type SourceWithName = (typeof SOURCES_WITH_NAME)[number];

export function sourceUsesSourceName(source: ApplicationSource): boolean {
  return (SOURCES_WITH_NAME as readonly string[]).includes(source);
}

export interface ApplicationFlowAnswers extends Record<string, unknown> {
  source: ApplicationSource;
  /** Job-board name / referrer name / custom "other" source — the spec's `source_name`. */
  sourceName?: string;
  companyName: string;
  positionTitle: string;
  location?: string;
  salaryRange: SalaryRangeChoice;
  visaSponsorship: YesNoUnsureChoice;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface VisitFlowAnswers extends Record<string, unknown> {
  visitDate: string;
  visitTime: string;
  purpose: VisitPurpose;
  photos?: File[];
  notes?: string;
}

export interface ResumeFlowAnswers extends Record<string, unknown> {
  resumeStatus: ResumeStatus;
  resumeVersion?: string;
  resumeSubmittedDate?: string;
  coverLetterSubmitted: 'yes' | 'no';
  applicationUrl?: string;
}

export type ApplicationEditAnswers = Partial<{
  companyName: string;
  positionTitle: string;
  location: string;
  applicationUrl: string;
  salaryMinAed: number | null;
  salaryMaxAed: number | null;
  visaSponsorship: YesNoUnsureChoice;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}>;

export type FinalOutcomeCategory = 'offer' | 'rejected' | 'withdrawn' | 'no_response';
export type OfferDecision = 'accepted' | 'declined' | 'deciding';
/** "Did the company reject you, or did you decide not to continue?" — spec §9's important distinction. */
export type RejectedBy = 'company' | 'candidate';

export interface FinalOutcomeFlowAnswers extends Record<string, unknown> {
  category: FinalOutcomeCategory;
  offerDecision?: OfferDecision;
  rejectedBy?: RejectedBy;
}

export function resolveFinalOutcome(answers: FinalOutcomeFlowAnswers): FinalOutcome {
  if (answers.category === 'offer') {
    if (answers.offerDecision === 'accepted') return 'offer_accepted';
    if (answers.offerDecision === 'declined') return 'offer_declined';
    return 'offer_received';
  }
  if (answers.category === 'rejected') {
    return answers.rejectedBy === 'candidate' ? 'candidate_rejected' : 'company_rejected';
  }
  if (answers.category === 'withdrawn') return 'withdrawn';
  return 'no_response';
}

export type FollowUpChoice = 'today' | 'later' | 'none' | 'already_contacted' | 'ignore';

export interface FollowUpFlowAnswers extends Record<string, unknown> {
  choice: FollowUpChoice;
  dueDate?: string;
  notes?: string;
}
