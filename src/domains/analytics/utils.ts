const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface JourneyProgress {
  daysElapsed: number;
  daysRemaining: number;
  totalDays: number;
  percentComplete: number;
}

export function computeJourneyProgress(startDateISO: string, endDateISO: string, now: Date = new Date()): JourneyProgress {
  const start = new Date(`${startDateISO}T00:00:00`);
  const end = new Date(`${endDateISO}T00:00:00`);
  const totalDays = Math.max(0, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY));
  const elapsedRaw = Math.round((now.getTime() - start.getTime()) / MS_PER_DAY);
  const daysElapsed = Math.min(Math.max(elapsedRaw, 0), totalDays);
  const daysRemaining = totalDays - daysElapsed;
  const percentComplete = totalDays > 0 ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : 0;
  return { daysElapsed, daysRemaining, totalDays, percentComplete };
}

export interface FunnelStage {
  label: string;
  count: number;
  /** Percent of the previous stage that reached this one, or null for the first stage / a zero previous count. */
  conversionFromPreviousPercent: number | null;
}

/**
 * Three stages, not the doc's four: "Shortlisted" has no distinct signal
 * anywhere in this app's data model (no user action produces it), so
 * inventing a proxy count for it would look precise while being fabricated.
 * Applied -> Interviewed -> Offered are each backed by real, distinct data.
 */
export function computeApplicationFunnel(
  applicationCount: number,
  interviewedApplicationCount: number,
  offeredApplicationCount: number,
): FunnelStage[] {
  return [
    { label: 'Applied', count: applicationCount, conversionFromPreviousPercent: null },
    {
      label: 'Interviewed',
      count: interviewedApplicationCount,
      conversionFromPreviousPercent: applicationCount > 0 ? Math.round((interviewedApplicationCount / applicationCount) * 100) : null,
    },
    {
      label: 'Offered',
      count: offeredApplicationCount,
      conversionFromPreviousPercent:
        interviewedApplicationCount > 0 ? Math.round((offeredApplicationCount / interviewedApplicationCount) * 100) : null,
    },
  ];
}

export interface JobSearchMetrics {
  costPerApplicationAed: number | null;
  costPerInterviewAed: number | null;
  costPerOfferAed: number | null;
  interviewSuccessRatePercent: number | null;
  avgDaysToFirstInterview: number | null;
  avgDaysToOffer: number | null;
}

function average(values: number[]): number | null {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
}

export function computeJobSearchMetrics(params: {
  totalSpentAed: number;
  applicationCount: number;
  interviewedApplicationCount: number;
  offerCount: number;
  /** Days from applied_date to first interview_date, one entry per interviewed application. */
  daysToFirstInterview: number[];
  /** Days from applied_date to received_date, one entry per offered application. */
  daysToOffer: number[];
}): JobSearchMetrics {
  const { totalSpentAed, applicationCount, interviewedApplicationCount, offerCount, daysToFirstInterview, daysToOffer } = params;
  return {
    costPerApplicationAed: applicationCount > 0 ? totalSpentAed / applicationCount : null,
    costPerInterviewAed: interviewedApplicationCount > 0 ? totalSpentAed / interviewedApplicationCount : null,
    costPerOfferAed: offerCount > 0 ? totalSpentAed / offerCount : null,
    interviewSuccessRatePercent:
      interviewedApplicationCount > 0 ? Math.round((offerCount / interviewedApplicationCount) * 100) : null,
    avgDaysToFirstInterview: average(daysToFirstInterview),
    avgDaysToOffer: average(daysToOffer),
  };
}

export interface SalaryAnalysis {
  minOfferedAed: number | null;
  maxOfferedAed: number | null;
  averageExpectedAed: number | null;
}

export function computeSalaryAnalysis(offerSalariesAed: number[], expectedRanges: { min: number; max: number }[]): SalaryAnalysis {
  const midpoints = expectedRanges.map((r) => (r.min + r.max) / 2);
  return {
    minOfferedAed: offerSalariesAed.length > 0 ? Math.min(...offerSalariesAed) : null,
    maxOfferedAed: offerSalariesAed.length > 0 ? Math.max(...offerSalariesAed) : null,
    averageExpectedAed: average(midpoints),
  };
}

export interface OfferForComparison {
  id: string;
  salaryAed: number;
  bonusPercent: number | null;
  leaveDays: number | null;
  visaSponsorship: boolean;
  growthRating: number | null;
}

export interface OfferComparisonResult {
  recommendedOfferId: string;
  /** Factors the recommended offer strictly beats the runner-up on. */
  reasons: string[];
}

/**
 * Transparent weighted score, not a black-box model: salary dominates, then
 * growth rating, visa sponsorship, bonus, and leave days in that order.
 * Reasons list only factors the winner strictly beats the runner-up on, so
 * the recommendation is explainable rather than an opaque number.
 */
export function compareOffers(offers: OfferForComparison[]): OfferComparisonResult | null {
  if (offers.length < 2) return null;

  function score(o: OfferForComparison): number {
    return o.salaryAed + (o.growthRating ?? 0) * 20_000 + (o.visaSponsorship ? 15_000 : 0) + (o.bonusPercent ?? 0) * 500 + (o.leaveDays ?? 0) * 100;
  }

  const ranked = [...offers].sort((a, b) => score(b) - score(a));
  const best = ranked[0]!;
  const runnerUp = ranked[1]!;

  const reasons: string[] = [];
  if (best.salaryAed > runnerUp.salaryAed) reasons.push('Higher salary');
  if ((best.growthRating ?? 0) > (runnerUp.growthRating ?? 0)) reasons.push('Better growth');
  if (best.visaSponsorship && !runnerUp.visaSponsorship) reasons.push('Visa sponsorship included');
  if ((best.bonusPercent ?? 0) > (runnerUp.bonusPercent ?? 0)) reasons.push('Higher bonus');
  if ((best.leaveDays ?? 0) > (runnerUp.leaveDays ?? 0)) reasons.push('More leave days');

  return { recommendedOfferId: best.id, reasons };
}
