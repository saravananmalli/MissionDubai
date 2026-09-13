import type { JourneyProgress, FunnelStage } from '@/domains/analytics/utils';
import type { BudgetAlertLevel, BurnRateResult } from '@/domains/expenses/utils';
import type { OfferWithCompany } from '@/domains/analytics/api';
import type { Trip } from '@/lib/trips';

export interface JourneyVisaStatus {
  issueDate: string;
  expiryDate: string;
  durationDays: number;
  daysUntilExpiry: number;
  isExpired: boolean;
}

export interface JourneyAccommodation {
  name: string;
  address: string;
  monthlyRentAed: number;
  checkOutDate: string | null;
}

export interface JourneyInterview {
  id: string;
  companyName: string;
  positionTitle: string;
  interviewDate: string;
  interviewTime: string;
  /** Negative once the scheduled time has passed. */
  hoursUntil: number;
}

export interface JourneyApplications {
  total: number;
  funnel: FunnelStage[];
  /** Days since the most recently applied-to company, or null if there are no applications. */
  daysSinceLastApplication: number | null;
}

export interface JourneyBudgetStatus {
  amountAed: number;
  spentAed: number;
  remainingAed: number;
  percentUsed: number;
  alertLevel: BudgetAlertLevel;
  burnRate: BurnRateResult;
}

/**
 * Derived, read-only snapshot of the user's journey — computed on demand from
 * existing domain queries (trip/travel/applications/interviews/budget/expenses/
 * offers), never persisted itself. See plan §2: avoids a second write path
 * that could drift out of sync with the real per-domain tables.
 */
export interface JourneyState {
  now: Date;
  trip: Trip | null;
  progress: JourneyProgress;
  visa: JourneyVisaStatus | null;
  accommodation: JourneyAccommodation | null;
  applications: JourneyApplications;
  /** Soonest interview that hasn't happened yet, or null. */
  nextInterview: JourneyInterview | null;
  /** All not-yet-happened interviews, soonest first. */
  upcomingInterviews: JourneyInterview[];
  budget: JourneyBudgetStatus | null;
  hasExpenseToday: boolean;
  pendingOffers: OfferWithCompany[];
  /** False before the user has logged anything at all (pre-onboarding). */
  hasAnyData: boolean;
}
