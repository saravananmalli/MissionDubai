import type { FlowDefinition } from '@/chat-flow/types';
import { addCompanyVisit } from '@/domains/applications/api';
import type { VisitFlowAnswers } from '@/domains/applications/types';

function requiredText(label: string) {
  return (value: unknown) => (typeof value === 'string' && value.trim().length > 0 ? null : `Enter ${label}.`);
}

export function createVisitFlow(applicationId: string): FlowDefinition<VisitFlowAnswers> {
  return {
    id: `company-visit-${applicationId}`,
    onComplete: (answers) => addCompanyVisit(applicationId, answers),
    steps: [
      { id: 'visitDate', type: 'date', prompt: 'Visit date?' },
      { id: 'visitTime', type: 'time', prompt: 'Time?', validate: requiredText('a time') },
      {
        id: 'purpose',
        type: 'quick-tap',
        prompt: 'Purpose?',
        options: [
          { label: 'Interview', value: 'interview' },
          { label: 'Office Tour', value: 'office_tour' },
          { label: 'Meeting', value: 'meeting' },
          { label: 'Recruiting Fair', value: 'recruiting_fair' },
        ],
      },
      {
        id: 'photos',
        type: 'photo',
        prompt: 'Add photos? (optional)',
        skippable: true,
        skipValue: [],
        skipLabel: 'Skip',
      },
      {
        id: 'notes',
        type: 'text',
        prompt: 'Notes? (optional)',
        skippable: true,
        skipValue: '',
        skipLabel: 'Skip',
      },
    ],
  };
}
