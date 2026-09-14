import type { FlowDefinition, StepDefinition } from '@/chat-flow/types';
import { requiredText } from '@/chat-flow/validators';
import { createRescheduleFlow, createScheduleInterview, createSubmitRoundResult, scheduleInterview, submitInterviewFeedback } from '@/domains/interviews/api';
import type { FeedbackFlowAnswers, InterviewFlowAnswers, RescheduleFlowAnswers, RoundResultFlowAnswers } from '@/domains/interviews/types';

const INTERVIEW_TYPE_OPTIONS = [
  { label: 'HR Screening', value: 'hr_screening' },
  { label: 'Recruiter Call', value: 'recruiter_call' },
  { label: 'Phone', value: 'phone' },
  { label: 'Video', value: 'video' },
  { label: 'In-Person', value: 'in_person' },
  { label: 'Technical', value: 'technical' },
  { label: 'Design', value: 'design' },
  { label: 'Portfolio Review', value: 'portfolio_review' },
  { label: 'Hiring Manager', value: 'hiring_manager' },
  { label: 'Final Round', value: 'final' },
  { label: 'Other', value: 'other' },
] as const;

const SCHEDULE_STEPS_AFTER_APPLICATION: StepDefinition<InterviewFlowAnswers>[] = [
  { id: 'interviewDate', type: 'date', prompt: 'Interview date?' },
  { id: 'interviewTime', type: 'time', prompt: 'Time?', validate: requiredText('a time') },
  {
    id: 'type',
    type: 'quick-tap',
    prompt: 'Interview type?',
    options: [...INTERVIEW_TYPE_OPTIONS],
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
    prompt: 'Meeting link? (optional)',
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
];

export function createScheduleInterviewFlow(applications: { id: string; company_name: string }[]): FlowDefinition<InterviewFlowAnswers> {
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
      ...SCHEDULE_STEPS_AFTER_APPLICATION,
    ],
  };
}

/** Same wizard, minus the company step — used from an application's own detail page, where the company is already known. */
export function createInterviewRoundFlow(applicationId: string, companyName: string): FlowDefinition<Omit<InterviewFlowAnswers, 'applicationId'>> {
  return {
    id: `interview-round-${applicationId}`,
    onComplete: createScheduleInterview(applicationId),
    steps: [{ ...SCHEDULE_STEPS_AFTER_APPLICATION[0]!, prompt: `Schedule the next round with ${companyName}. Interview date?` }, ...SCHEDULE_STEPS_AFTER_APPLICATION.slice(1)],
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

/** "Did they mention another round?" — the spec §9 follow-up to a pass/fail result. */
export function createRoundResultFlow(interviewId: string): FlowDefinition<RoundResultFlowAnswers> {
  return {
    id: `round-result-${interviewId}`,
    onComplete: createSubmitRoundResult(interviewId),
    steps: [
      {
        id: 'result',
        type: 'quick-tap',
        prompt: 'How did the interview go?',
        options: [
          { label: 'Passed', value: 'passed' },
          { label: 'Failed', value: 'failed' },
          { label: 'Waiting for result', value: 'waiting_for_result' },
        ],
      },
      {
        id: 'mentionedNextRound',
        type: 'quick-tap',
        prompt: 'Did they mention another round?',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
          { label: 'Waiting for response', value: 'waiting' },
          { label: "They didn't say", value: 'not_said' },
        ],
      },
      {
        id: 'notes',
        type: 'text',
        prompt: 'Any notes? (optional)',
        skippable: true,
        skipValue: '',
      },
    ],
  };
}

export function createInterviewRescheduleFlow(interviewId: string): FlowDefinition<RescheduleFlowAnswers> {
  return {
    id: `reschedule-${interviewId}`,
    onComplete: createRescheduleFlow(interviewId),
    steps: [
      { id: 'newDate', type: 'date', prompt: 'New interview date?' },
      { id: 'newTime', type: 'time', prompt: 'New time?', validate: requiredText('a time') },
      {
        id: 'reason',
        type: 'text',
        prompt: 'Reason for rescheduling? (optional)',
        skippable: true,
        skipValue: '',
      },
    ],
  };
}
