import type { ApplicationSource, VisitPurpose } from '@/lib/database.types';

export type SalaryRangeChoice = '100-150k' | '150-200k' | '200-250k' | '250k+' | 'will_update_later';
export type YesNoUnsureChoice = 'yes' | 'no' | 'unsure' | 'need_to_ask';

export interface ApplicationFlowAnswers extends Record<string, unknown> {
  source: ApplicationSource;
  sourceOther?: string;
  companyName: string;
  positionTitle: string;
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
