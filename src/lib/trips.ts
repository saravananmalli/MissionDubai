import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/database.types';

export type Trip = Database['public']['Tables']['trips']['Row'];

export async function fetchCurrentTrip(): Promise<Trip | null> {
  const { data, error } = await supabase.from('trips').select('*').order('created_at', { ascending: false }).limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

/**
 * MissionDubai tracks one job-search journey at a time: the most recently
 * created trip. Domain flows that need a trip_id call this instead of
 * requiring the user to explicitly create one first.
 */
export async function getOrCreateCurrentTrip(defaultStartDate: string): Promise<Trip> {
  const existing = await fetchCurrentTrip();
  if (existing) return existing;

  const { data, error } = await supabase
    .from('trips')
    .insert({ label: 'Dubai Job Search', start_date: defaultStartDate })
    .select()
    .single();
  if (error) throw error;
  return data;
}
