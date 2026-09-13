import type { FlowDefinition } from '@/chat-flow/types';
import { nonNegativeAmount } from '@/chat-flow/validators';
import { submitExpenseFlow } from '@/domains/expenses/api';
import type { ExpenseFlowAnswers } from '@/domains/expenses/types';

export const expenseFlow: FlowDefinition<ExpenseFlowAnswers> = {
  id: 'add-expense',
  onComplete: submitExpenseFlow,
  steps: [
    {
      id: 'category',
      type: 'quick-tap',
      prompt: 'What did you spend on?',
      options: [
        { label: 'Meals', value: 'meals' },
        { label: 'Transport', value: 'transport' },
        { label: 'Clothes', value: 'clothes' },
        { label: 'Shopping', value: 'shopping' },
        { label: 'Activities', value: 'activities' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      id: 'amountAed',
      type: 'number',
      prompt: 'How much? (AED)',
      validate: nonNegativeAmount,
    },
    {
      id: 'expenseDate',
      type: 'date',
      prompt: 'Date?',
      dateShortcut: 'yesterday',
    },
    {
      id: 'description',
      type: 'text',
      prompt: 'Add description?',
      skippable: true,
      skipValue: '',
      skipLabel: 'Skip',
    },
    {
      id: 'receipt',
      type: 'photo',
      prompt: 'Receipt photo? (optional)',
      skippable: true,
      skipValue: [],
      skipLabel: 'Skip',
    },
  ],
};
