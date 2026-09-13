import type { InterviewOutcome, InterviewType } from '@/lib/database.types';

export type ReminderChoice = '24h' | '1h' | '15min' | 'daily';

export interface InterviewFlowAnswers extends Record<string, unknown> {
  applicationId: string;
  interviewDate: string;
  interviewTime: string;
  type: InterviewType;
  interviewerName?: string;
  interviewerRole?: string;
  meetingLink?: string;
  reminders: ReminderChoice[];
}

export interface FeedbackFlowAnswers extends Record<string, unknown> {
  outcome: Exclude<InterviewOutcome, 'pending'>;
  confidence: number;
  notes?: string;
}
