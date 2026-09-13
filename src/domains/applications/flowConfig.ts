import type { FlowDefinition } from '@/chat-flow/types';
import { requiredText } from '@/chat-flow/validators';
import { submitApplicationFlow } from '@/domains/applications/api';
import type { ApplicationFlowAnswers } from '@/domains/applications/types';

const SHOWS_CONTACT_FIELDS = (answers: Partial<ApplicationFlowAnswers>) =>
  answers.source === 'company_site' || answers.source === 'referral' || answers.source === 'other';

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
        { label: 'Referral', value: 'referral' },
        { label: 'Other', value: 'other' },
      ],
      next: (value) => (value === 'other' ? 'sourceOther' : 'companyName'),
    },
    {
      id: 'sourceOther',
      type: 'text',
      prompt: 'Where did you find this?',
      validate: requiredText('where you found this'),
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
      id: 'salaryRange',
      type: 'quick-tap',
      prompt: 'Expected salary?',
      options: [
        { label: '100-150k', value: '100-150k' },
        { label: '150-200k', value: '150-200k' },
        { label: '200-250k', value: '200-250k' },
        { label: '250k+', value: '250k+' },
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
