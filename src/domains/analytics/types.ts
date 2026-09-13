export type GrowthChoice = 'low' | 'medium' | 'high';

export interface OfferFlowAnswers extends Record<string, unknown> {
  applicationId: string;
  salaryAed: number;
  bonusPercent?: number;
  leaveDays?: number;
  visaSponsorship: 'yes' | 'no';
  visaCostResponsibility?: 'company' | 'employee';
  location?: string;
  growth: GrowthChoice;
}
