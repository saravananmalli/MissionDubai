import type { ExpenseCategory } from '@/lib/database.types';

// Matches the product doc's actual chat flow exactly: category, amount, date,
// description, receipt photo. Payment method exists as a nullable DB column
// for potential future use but isn't asked in this flow.
export interface ExpenseFlowAnswers extends Record<string, unknown> {
  category: ExpenseCategory;
  amountAed: number;
  expenseDate: string;
  description?: string;
  receipt?: File[];
}
