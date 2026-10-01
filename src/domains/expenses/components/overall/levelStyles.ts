import type { BudgetStatus } from '@/domains/expenses/overall';

export const LEVEL_STYLES = {
  ok: { text: 'text-success', fill: 'bg-success', stroke: '#52D6A0', label: 'On track' },
  warning: { text: 'text-warning', fill: 'bg-warning', stroke: '#E8B45A', label: 'Approaching limit' },
  danger: { text: 'text-error', fill: 'bg-error', stroke: '#F06A83', label: 'Almost used up' },
  exceeded: { text: 'text-error', fill: 'bg-error', stroke: '#F06A83', label: 'Budget reached' },
} as const;

export function statusLabel(status: BudgetStatus): string {
  return status.overBy > 0 ? 'Over budget' : LEVEL_STYLES[status.level].label;
}
