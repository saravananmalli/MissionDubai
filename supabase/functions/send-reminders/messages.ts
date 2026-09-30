// Pure and dependency-free so the vitest suite can import it too.

export type ReminderSlot = 'afternoon' | 'evening';

export interface ReminderMessage {
  title: string;
  body: string;
  url: string;
  actionLabel: string;
  tag: string;
}

// Both reminders always send (no "already logged" skip), by explicit product decision.
const MESSAGES: Record<ReminderSlot, ReminderMessage> = {
  afternoon: {
    title: 'Log your expenses',
    body: "Don't forget to log your expenses today.",
    url: '/expenses?add=1',
    actionLabel: 'Log Expense',
    tag: 'expense-reminder-1pm',
  },
  evening: {
    title: 'Last call for today',
    body: 'Spent anything today? Log your expenses before the day ends.',
    url: '/expenses?add=1',
    actionLabel: 'Log Expense',
    tag: 'expense-reminder-8pm',
  },
};

export function isReminderSlot(value: unknown): value is ReminderSlot {
  return value === 'afternoon' || value === 'evening';
}

export function getReminderMessage(slot: ReminderSlot): ReminderMessage {
  return MESSAGES[slot];
}
