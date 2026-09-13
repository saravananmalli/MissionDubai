import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/database.types';
import type { FeedbackFlowAnswers, InterviewFlowAnswers, ReminderChoice } from '@/domains/interviews/types';

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

function reminderFlags(reminders: ReminderChoice[]) {
  return {
    reminder_24h: reminders.includes('24h'),
    reminder_1h: reminders.includes('1h'),
    reminder_15min: reminders.includes('15min'),
    reminder_daily_until: reminders.includes('daily'),
  };
}

export async function scheduleInterview(answers: InterviewFlowAnswers): Promise<void> {
  const { error } = await supabase.from('interviews').insert({
    application_id: answers.applicationId,
    interview_date: answers.interviewDate,
    interview_time: answers.interviewTime,
    type: answers.type,
    interviewer_name: answers.interviewerName || null,
    interviewer_role: answers.interviewerRole || null,
    meeting_link: answers.type === 'video' ? answers.meetingLink || null : null,
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
