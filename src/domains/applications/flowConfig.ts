import type { FlowDefinition } from '@/chat-flow/types';
import { requiredText } from '@/chat-flow/validators';
import { createSubmitFinalOutcomeFlow, createSubmitFollowUpFlow, createSubmitResumeFlow, submitApplicationFlow } from '@/domains/applications/api';
import { sourceUsesSourceName, type ApplicationFlowAnswers, type FinalOutcomeFlowAnswers, type FollowUpFlowAnswers, type ResumeFlowAnswers } from '@/domains/applications/types';

const SHOWS_SOURCE_NAME = (answers: Partial<ApplicationFlowAnswers>) => Boolean(answers.source && sourceUsesSourceName(answers.source));
const SHOWS_CONTACT_FIELDS = (answers: Partial<ApplicationFlowAnswers>) =>
  answers.source === 'company_site' || answers.source === 'referral' || answers.source === 'other';

function sourceNamePrompt(answers: Partial<ApplicationFlowAnswers>): string {
  if (answers.source === 'referral') return 'Who referred you? (optional)';
  if (answers.source === 'job_board') return 'Which job board?';
  return 'What was the source?';
}

/**
 * One flow, not the doc's two bespoke LinkedIn/company-site flows: branching
 * on `source` both skips straight past the "Other" free-text step for the
 * common quick-tap choices, and hides the contact-person fields entirely for
 * LinkedIn/job-board sources (rather than asking-and-skipping them).
 */
export const applicationFlow: FlowDefinition<ApplicationFlowAnswers> = {
  id: 'application-intake',
  onComplete: submitApplicationFlow,
  steps: [
    {
      id: 'source',
      type: 'quick-tap',
      prompt: "Let's add a job application! Where did you find this?",
      options: [
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'Job Board', value: 'job_board' },
        { label: 'Company Site', value: 'company_site' },
        { label: 'NaukriGulf', value: 'naukrigulf' },
        { label: 'GulfTalent', value: 'gulftalent' },
        { label: 'Referral', value: 'referral' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      id: 'sourceName',
      type: 'text',
      prompt: sourceNamePrompt,
      visibleIf: SHOWS_SOURCE_NAME,
      skippable: true,
      skipValue: '',
      skipLabel: 'Skip',
    },
    {
      id: 'companyName',
      type: 'text',
      prompt: 'Company name?',
      validate: requiredText('the company name'),
    },
    {
      id: 'positionTitle',
      type: 'text',
      prompt: 'Position title?',
      validate: requiredText('the position title'),
    },
    {
      id: 'location',
      type: 'text',
      prompt: 'Location? (optional)',
      skippable: true,
      skipValue: '',
    },
    {
      id: 'salaryRange',
      type: 'quick-tap',
      prompt: 'Expected salary?',
      options: [
        { label: '5-10k AED/mo', value: '5-10k' },
        { label: '10-12k AED/mo', value: '10-12k' },
        { label: '12-15k AED/mo', value: '12-15k' },
        { label: '15k+ AED/mo', value: '15k+' },
      ],
      skippable: true,
      skipValue: 'will_update_later',
      skipLabel: "Skip - I'll update later",
    },
    {
      id: 'visaSponsorship',
      type: 'quick-tap',
      prompt: 'Visa sponsorship?',
      options: [
        { label: 'YES', value: 'yes' },
        { label: 'NO', value: 'no' },
        { label: 'UNSURE', value: 'unsure' },
      ],
      skippable: true,
      skipValue: 'need_to_ask',
      skipLabel: 'Skip - I need to ask',
    },
    {
      id: 'contactName',
      type: 'text',
      prompt: 'Contact person name?',
      visibleIf: SHOWS_CONTACT_FIELDS,
      skippable: true,
      skipValue: '',
      skipLabel: "Skip - I'll find later",
    },
    {
      id: 'contactEmail',
      type: 'text',
      prompt: 'Contact email?',
      visibleIf: SHOWS_CONTACT_FIELDS,
      skippable: true,
      skipValue: '',
    },
    {
      id: 'contactPhone',
      type: 'text',
      prompt: 'Contact phone? (optional)',
      visibleIf: SHOWS_CONTACT_FIELDS,
      skippable: true,
      skipValue: '',
    },
  ],
};

export function createResumeFlow(applicationId: string): FlowDefinition<ResumeFlowAnswers> {
  return {
    id: `resume-${applicationId}`,
    onComplete: createSubmitResumeFlow(applicationId),
    steps: [
      {
        id: 'resumeStatus',
        type: 'quick-tap',
        prompt: 'Did you submit your resume?',
        options: [
          { label: 'Submitted', value: 'submitted' },
          { label: 'Submitted with cover letter', value: 'submitted_with_cover_letter' },
          { label: 'Resume requested', value: 'resume_requested' },
          { label: 'Updated & resubmitted', value: 'resume_updated_resubmitted' },
          { label: 'Not submitted', value: 'not_submitted' },
        ],
        next: (value) => (value === 'not_submitted' ? 'END' : 'resumeVersion'),
      },
      {
        id: 'resumeVersion',
        type: 'text',
        prompt: 'Which resume version?',
        skippable: true,
        skipValue: '',
        skipLabel: 'Skip',
      },
      {
        id: 'resumeSubmittedDate',
        type: 'date',
        prompt: 'When did you submit it?',
      },
      {
        id: 'coverLetterSubmitted',
        type: 'quick-tap',
        prompt: 'Did you include a cover letter?',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      },
      {
        id: 'applicationUrl',
        type: 'text',
        prompt: 'Application URL? (optional)',
        skippable: true,
        skipValue: '',
      },
    ],
  };
}

export function createFinalOutcomeFlow(applicationId: string): FlowDefinition<FinalOutcomeFlowAnswers> {
  return {
    id: `final-outcome-${applicationId}`,
    onComplete: createSubmitFinalOutcomeFlow(applicationId),
    steps: [
      {
        id: 'category',
        type: 'quick-tap',
        prompt: 'What happened with this application?',
        options: [
          { label: 'Offer received', value: 'offer' },
          { label: 'Rejected', value: 'rejected' },
          { label: 'Withdrawn / no longer interested', value: 'withdrawn' },
          { label: 'No response', value: 'no_response' },
        ],
        next: (value) => (value === 'offer' ? 'offerDecision' : value === 'rejected' ? 'rejectedBy' : 'END'),
      },
      {
        id: 'offerDecision',
        type: 'quick-tap',
        prompt: 'Did you accept the offer?',
        options: [
          { label: 'Accepted', value: 'accepted' },
          { label: 'Declined', value: 'declined' },
          { label: 'Still deciding', value: 'deciding' },
        ],
      },
      {
        // Spec §9: distinguishing "the company rejected me" from "I decided not to continue" matters.
        id: 'rejectedBy',
        type: 'quick-tap',
        prompt: 'Did the company reject your application, or did you decide not to continue?',
        options: [
          { label: 'Company rejected me', value: 'company' },
          { label: 'I decided not to continue', value: 'candidate' },
        ],
      },
    ],
  };
}

export function createFollowUpFlow(applicationId: string): FlowDefinition<FollowUpFlowAnswers> {
  return {
    id: `follow-up-${applicationId}`,
    onComplete: createSubmitFollowUpFlow(applicationId),
    steps: [
      {
        id: 'choice',
        type: 'quick-tap',
        prompt: "You haven't heard back yet. Want to schedule a follow-up?",
        options: [
          { label: 'Follow up today', value: 'today' },
          { label: 'Follow up later', value: 'later' },
          { label: 'No follow-up needed', value: 'none' },
          { label: 'Already contacted them', value: 'already_contacted' },
          { label: 'Ignore', value: 'ignore' },
        ],
        next: (value) => (value === 'later' ? 'dueDate' : value === 'already_contacted' ? 'notes' : 'END'),
      },
      {
        id: 'dueDate',
        type: 'date',
        prompt: 'When should I remind you?',
        next: () => 'END',
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
