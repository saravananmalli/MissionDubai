import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/database.types';
import { logApplicationEvent } from '@/domains/applications/api';
import { formatEnumLabel } from '@/domains/applications/utils';
import type {
  FeedbackFlowAnswers,
  InterviewFlowAnswers,
  RescheduleFlowAnswers,
  ReminderChoice,
  RoundResultFlowAnswers,
} from '@/domains/interviews/types';

export type Interview = Database['public']['Tables']['interviews']['Row'];

export interface InterviewWithApplication extends Interview {
  companyName: string;
  positionTitle: string;
}

export async function fetchInterviews(tripId: string): Promise<InterviewWithApplication[]> {
  const { data: applications, error: applicationsError } = await supabase
    .from('applications')
    .select('id, company_name, position_title')
    .eq('trip_id', tripId);
  if (applicationsError) throw applicationsError;
  if (!applications || applications.length === 0) return [];

  const applicationIds = applications.map((a) => a.id);
  const { data: interviews, error } = await supabase
    .from('interviews')
    .select('*')
    .in('application_id', applicationIds)
    .order('interview_date', { ascending: true });
  if (error) throw error;

  const appById = new Map(applications.map((a) => [a.id, a]));
  return (interviews ?? []).map((interview) => {
    const application = appById.get(interview.application_id);
    return {
      ...interview,
      companyName: application?.company_name ?? 'Unknown company',
      positionTitle: application?.position_title ?? '',
    };
  });
}

export function useInterviews(tripId: string | undefined) {
  return useQuery({
    queryKey: ['interviews', tripId],
    queryFn: () => fetchInterviews(tripId!),
    enabled: Boolean(tripId),
  });
}

export async function fetchInterview(interviewId: string): Promise<InterviewWithApplication | null> {
  const { data: interview, error } = await supabase.from('interviews').select('*').eq('id', interviewId).limit(1);
  if (error) throw error;
  const row = interview?.[0];
  if (!row) return null;

  const { data: application, error: applicationError } = await supabase
    .from('applications')
    .select('company_name, position_title')
    .eq('id', row.application_id)
    .limit(1);
  if (applicationError) throw applicationError;

  return {
    ...row,
    companyName: application?.[0]?.company_name ?? 'Unknown company',
    positionTitle: application?.[0]?.position_title ?? '',
  };
}

export function useInterview(interviewId: string | undefined) {
  return useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => fetchInterview(interviewId!),
    enabled: Boolean(interviewId),
  });
}

/** All interviews for one application, ordered by round — the "Interview Rounds" stepper's data source (spec §4). */
export async function fetchInterviewsForApplication(applicationId: string): Promise<Interview[]> {
  const { data, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('application_id', applicationId)
    .order('round_number', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function useInterviewsForApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['interviews-for-application', applicationId],
    queryFn: () => fetchInterviewsForApplication(applicationId!),
    enabled: Boolean(applicationId),
  });
}

function reminderFlags(reminders: ReminderChoice[]) {
  return {
    reminder_24h: reminders.includes('24h'),
    reminder_1h: reminders.includes('1h'),
    reminder_15min: reminders.includes('15min'),
    reminder_daily_until: reminders.includes('daily'),
  };
}

/**
 * Rounds are numbered automatically (never user-entered) as one past the
 * highest existing round for this application — this is what makes
 * "unlimited interview rounds" (spec §4) work without the user ever having
 * to track round numbers themselves.
 */
async function nextRoundNumber(applicationId: string): Promise<number> {
  const { data, error } = await supabase
    .from('interviews')
    .select('round_number')
    .eq('application_id', applicationId)
    .order('round_number', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.round_number ?? 0) + 1;
}

export async function scheduleInterview(answers: InterviewFlowAnswers): Promise<void> {
  const roundNumber = await nextRoundNumber(answers.applicationId);

  const { error } = await supabase.from('interviews').insert({
    application_id: answers.applicationId,
    round_number: roundNumber,
    interview_date: answers.interviewDate,
    interview_time: answers.interviewTime,
    type: answers.type,
    interviewer_name: answers.interviewerName || null,
    interviewer_role: answers.interviewerRole || null,
    meeting_link: answers.meetingLink || null,
    ...reminderFlags(answers.reminders),
  });
  if (error) throw error;

  // Advance the application's stage so the Analytics funnel (Applied ->
  // Interviewed -> Offered) reflects real progress. Only from 'applied': never
  // regress a further-along status (e.g. an application already marked 'offer').
  const { error: statusError } = await supabase
    .from('applications')
    .update({ status: 'interviewing' })
    .eq('id', answers.applicationId)
    .eq('status', 'applied');
  if (statusError) throw statusError;

  await logApplicationEvent(
    answers.applicationId,
    'interview_scheduled',
    `Round ${roundNumber} — ${formatEnumLabel(answers.type)} scheduled for ${answers.interviewDate}.`,
  );
}

export function createScheduleInterview(applicationId: string) {
  return (answers: Omit<InterviewFlowAnswers, 'applicationId'>) => scheduleInterview({ ...answers, applicationId } as InterviewFlowAnswers);
}

export async function submitInterviewFeedback(interviewId: string, answers: FeedbackFlowAnswers): Promise<void> {
  const { error } = await supabase
    .from('interviews')
    .update({ outcome: answers.outcome, confidence_rating: answers.confidence, feedback_notes: answers.notes || null })
    .eq('id', interviewId);
  if (error) throw error;
}

export function useSubmitInterviewFeedback(tripId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ interviewId, answers }: { interviewId: string; answers: FeedbackFlowAnswers }) =>
      submitInterviewFeedback(interviewId, answers),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['interviews', tripId] });
      void queryClient.invalidateQueries({ queryKey: ['interview', variables.interviewId] });
    },
  });
}

interface InterviewContext {
  applicationId: string;
  roundNumber: number;
}

async function fetchInterviewContext(interviewId: string): Promise<InterviewContext> {
  const { data, error } = await supabase.from('interviews').select('application_id, round_number').eq('id', interviewId).limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row) throw new Error('Interview not found.');
  return { applicationId: row.application_id, roundNumber: row.round_number };
}

/** "How did the interview go?" -> pass/fail/waiting, distinct from the existing qualitative feedback (spec §9). */
export async function submitRoundResult(interviewId: string, answers: RoundResultFlowAnswers): Promise<void> {
  const { applicationId, roundNumber } = await fetchInterviewContext(interviewId);

  const { error } = await supabase
    .from('interviews')
    .update({ round_result: answers.result, interview_status: 'completed' })
    .eq('id', interviewId);
  if (error) throw error;

  const nextRoundNote =
    answers.mentionedNextRound === 'yes'
      ? ' They mentioned another round.'
      : answers.mentionedNextRound === 'waiting'
        ? " They're deciding on next steps."
        : '';
  await logApplicationEvent(applicationId, 'round_result', `Round ${roundNumber} result: ${formatEnumLabel(answers.result)}.${nextRoundNote}`);
}

export function createSubmitRoundResult(interviewId: string) {
  return (answers: RoundResultFlowAnswers) => submitRoundResult(interviewId, answers);
}

export async function rescheduleInterview(interviewId: string, answers: RescheduleFlowAnswers): Promise<void> {
  const { data: currentRows, error: fetchError } = await supabase
    .from('interviews')
    .select('application_id, round_number, interview_date, interview_time')
    .eq('id', interviewId)
    .limit(1);
  if (fetchError) throw fetchError;
  const current = currentRows?.[0];
  if (!current) throw new Error('Interview not found.');

  const { error } = await supabase
    .from('interviews')
    .update({ interview_date: answers.newDate, interview_time: answers.newTime, interview_status: 'scheduled' })
    .eq('id', interviewId);
  if (error) throw error;

  await logApplicationEvent(
    current.application_id,
    'interview_rescheduled',
    `Round ${current.round_number} rescheduled from ${current.interview_date} to ${answers.newDate}.${answers.reason ? ` Reason: ${answers.reason}.` : ''}`,
    { from: { date: current.interview_date, time: current.interview_time }, to: { date: answers.newDate, time: answers.newTime } },
  );
}

export function createRescheduleFlow(interviewId: string) {
  return (answers: RescheduleFlowAnswers) => rescheduleInterview(interviewId, answers);
}

export async function updateInterview(interviewId: string, patch: Database['public']['Tables']['interviews']['Update']): Promise<void> {
  const { error } = await supabase.from('interviews').update(patch).eq('id', interviewId);
  if (error) throw error;
}

export async function cancelInterview(interviewId: string): Promise<void> {
  const { applicationId, roundNumber } = await fetchInterviewContext(interviewId);
  const { error } = await supabase.from('interviews').update({ interview_status: 'cancelled' }).eq('id', interviewId);
  if (error) throw error;
  await logApplicationEvent(applicationId, 'interview_cancelled', `Round ${roundNumber} cancelled.`);
}

export function useCancelInterview(tripId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (interviewId: string) => cancelInterview(interviewId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['interviews', tripId] });
    },
  });
}
