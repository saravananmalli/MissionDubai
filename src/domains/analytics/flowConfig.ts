import type { FlowDefinition } from '@/chat-flow/types';
import { nonNegativeAmount, requiredChoice } from '@/chat-flow/validators';
import { submitOfferFlow } from '@/domains/analytics/api';
import type { OfferFlowAnswers } from '@/domains/analytics/types';

export function createOfferFlow(applications: { id: string; company_name: string }[]): FlowDefinition<OfferFlowAnswers> {
  return {
    id: 'add-offer',
    onComplete: submitOfferFlow,
    steps: [
      {
        id: 'applicationId',
        type: 'quick-tap',
        prompt: 'Which company made you an offer?',
        options: applications.map((a) => ({ label: a.company_name, value: a.id })),
        validate: requiredChoice('a company'),
      },
      {
        id: 'salaryAed',
        type: 'number',
        prompt: 'Salary (AED)?',
        validate: nonNegativeAmount,
      },
      {
        id: 'bonusPercent',
        type: 'number',
        prompt: 'Bonus (%)? (optional)',
        skippable: true,
        skipValue: undefined,
        skipLabel: 'Skip',
      },
      {
        id: 'leaveDays',
        type: 'number',
        prompt: 'Leave days? (optional)',
        skippable: true,
        skipValue: undefined,
        skipLabel: 'Skip',
      },
      {
        id: 'visaSponsorship',
        type: 'quick-tap',
        prompt: 'Visa sponsorship included?',
        options: [
          { label: 'YES', value: 'yes' },
          { label: 'NO', value: 'no' },
        ],
      },
      {
        id: 'visaCostResponsibility',
        type: 'quick-tap',
        prompt: 'Who covers the visa cost?',
        options: [
          { label: 'Company', value: 'company' },
          { label: 'Employee', value: 'employee' },
        ],
        visibleIf: (answers) => answers.visaSponsorship === 'yes',
        skippable: true,
        skipValue: undefined,
        skipLabel: 'Skip',
      },
      {
        id: 'location',
        type: 'text',
        prompt: 'Office location? (optional)',
        skippable: true,
        skipValue: '',
        skipLabel: 'Skip',
      },
      {
        id: 'growth',
        type: 'quick-tap',
        prompt: 'Growth opportunity?',
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
        ],
      },
    ],
  };
}
