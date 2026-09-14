import type { InterviewOutcome, InterviewType, RoundResult } from '@/lib/database.types';

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

export type NextRoundMention = 'yes' | 'no' | 'waiting' | 'not_said';

export interface RoundResultFlowAnswers extends Record<string, unknown> {
  result: Exclude<RoundResult, 'pending'>;
  mentionedNextRound: NextRoundMention;
  notes?: string;
}

export interface RescheduleFlowAnswers extends Record<string, unknown> {
  newDate: string;
  newTime: string;
  reason?: string;
}
