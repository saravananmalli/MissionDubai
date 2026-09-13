import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateCurrentTrip } from '@/lib/trips';
import type { Database } from '@/lib/database.types';
import type { ExpenseFlowAnswers } from '@/domains/expenses/types';

export type Expense = Database['public']['Tables']['expenses']['Row'];
export type Budget = Database['public']['Tables']['budgets']['Row'];

export async function fetchExpenses(tripId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('trip_id', tripId)
    .order('expense_date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useExpenses(tripId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', tripId],
    queryFn: () => fetchExpenses(tripId!),
    enabled: Boolean(tripId),
  });
}

export async function fetchBudget(tripId: string): Promise<Budget | null> {
  const { data, error } = await supabase.from('budgets').select('*').eq('trip_id', tripId).limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export function useBudget(tripId: string | undefined) {
  return useQuery({
    queryKey: ['budget', tripId],
    queryFn: () => fetchBudget(tripId!),
    enabled: Boolean(tripId),
  });
}

/** Creates the trip if none exists yet — any domain, not just Travel, can be the user's first action. */
export async function saveBudget(amountAed: number): Promise<void> {
  const trip = await getOrCreateCurrentTrip(new Date().toISOString().slice(0, 10));
  const existing = await fetchBudget(trip.id);
  if (existing) {
    const { error } = await supabase.from('budgets').update({ amount_aed: amountAed }).eq('id', existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from('budgets').insert({ trip_id: trip.id, amount_aed: amountAed });
  if (error) throw error;
}

export function useSaveBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveBudget,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips', 'current'] });
      void queryClient.invalidateQueries({ queryKey: ['budget'] });
    },
  });
}

export async function submitExpenseFlow(answers: ExpenseFlowAnswers): Promise<void> {
  const trip = await getOrCreateCurrentTrip(new Date().toISOString().slice(0, 10));

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      trip_id: trip.id,
      category: answers.category,
      amount_aed: answers.amountAed,
      expense_date: answers.expenseDate,
      description: answers.description || null,
    })
    .select()
    .single();
  if (error) throw error;

  const receiptFile = answers.receipt?.[0];
  if (receiptFile) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user.id;
    if (!userId) throw new Error('You must be logged in to attach a receipt.');

    const compressed = await imageCompression(receiptFile, { maxSizeMB: 1.5, maxWidthOrHeight: 1600 });
    const path = `${userId}/${expense.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage.from('receipts').upload(path, compressed, { contentType: 'image/jpeg' });
    if (uploadError) throw uploadError;

    const { error: updateError } = await supabase.from('expenses').update({ receipt_photo_path: path }).eq('id', expense.id);
    if (updateError) throw updateError;
  }
}
