import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export async function fetchDismissedSuggestionIds(): Promise<Set<string>> {
  const { data, error } = await supabase.from('suggestion_dismissals').select('suggestion_id');
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.suggestion_id));
}

export function useDismissedSuggestionIds() {
  return useQuery({
    queryKey: ['suggestion-dismissals'],
    queryFn: fetchDismissedSuggestionIds,
  });
}

export async function dismissSuggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from('suggestion_dismissals')
    .upsert({ suggestion_id: suggestionId }, { onConflict: 'user_id,suggestion_id' });
  if (error) throw error;
}

export function useDismissSuggestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: dismissSuggestion,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['suggestion-dismissals'] });
    },
  });
}
