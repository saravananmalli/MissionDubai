import type { FlowDefinition } from '@/chat-flow/types';
import { requiredText } from '@/chat-flow/validators';
import { scheduleInterview, submitInterviewFeedback } from '@/domains/interviews/api';
import type { FeedbackFlowAnswers, InterviewFlowAnswers } from '@/domains/interviews/types';

export function createScheduleInterviewFlow(
  applications: { id: string; company_name: string }[],
): FlowDefinition<InterviewFlowAnswers> {
  return {
    id: 'schedule-interview',
    onComplete: scheduleInterview,
    steps: [
      {
        id: 'applicationId',
        type: 'quick-tap',
        prompt: "Let's schedule an interview! Which company?",
        options: applications.map((a) => ({ label: a.company_name, value: a.id })),
        validate: requiredText('a company'),
      },
      { id: 'interviewDate', type: 'date', prompt: 'Interview date?' },
      { id: 'interviewTime', type: 'time', prompt: 'Time?', validate: requiredText('a time') },
      {
        id: 'type',
        type: 'quick-tap',
        prompt: 'Interview type?',
        options: [
          { label: 'Phone', value: 'phone' },
          { label: 'Video', value: 'video' },
          { label: 'In-Person', value: 'in_person' },
        ],
      },
      {
        id: 'interviewerName',
        type: 'text',
        prompt: 'Interviewer name?',
        skippable: true,
        skipValue: '',
        skipLabel: 'Skip',
      },
      {
        id: 'interviewerRole',
        type: 'text',
        prompt: 'Interviewer role?',
        skippable: true,
        skipValue: '',
        skipLabel: 'Skip',
      },
      {
        id: 'meetingLink',
        type: 'text',
        prompt: 'Google Meet link? (optional)',
        visibleIf: (answers) => answers.type === 'video',
        skippable: true,
        skipValue: '',
        skipLabel: 'Skip',
      },
      {
        id: 'reminders',
        type: 'multi-select',
        prompt: 'Which reminders?',
        options: [
          { label: '24 hours before', value: '24h' },
          { label: '1 hour before', value: '1h' },
          { label: 'DAILY until interview', value: 'daily' },
          { label: '15 minutes before', value: '15min' },
        ],
      },
    ],
  };
}

export function createFeedbackFlow(interviewId: string): FlowDefinition<FeedbackFlowAnswers> {
  return {
    id: `interview-feedback-${interviewId}`,
    onComplete: (answers) => submitInterviewFeedback(interviewId, answers),
    steps: [
      {
        id: 'outcome',
        type: 'quick-tap',
        prompt: 'How did the interview go?',
        options: [
          { label: 'Very Good', value: 'very_good' },
          { label: 'Good', value: 'good' },
          { label: 'Ok', value: 'ok' },
          { label: 'Bad', value: 'bad' },
        ],
      },
      {
        id: 'confidence',
        type: 'slider',
        prompt: 'Confidence level? (1-10)',
        min: 1,
        max: 10,
      },
      {
        id: 'notes',
        type: 'text',
        prompt: 'Any notes?',
        skippable: true,
        skipValue: '',
        skipLabel: 'Skip',
      },
    ],
  };
}
