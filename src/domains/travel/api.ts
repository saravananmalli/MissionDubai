import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateCurrentTrip } from '@/lib/trips';
import type { Database } from '@/lib/database.types';
import type { AccommodationEditAnswers, TravelFlowAnswers, VisaEditAnswers } from '@/domains/travel/types';

export type Flight = Database['public']['Tables']['flights']['Row'];
export type Visa = Database['public']['Tables']['visas']['Row'];
export type Accommodation = Database['public']['Tables']['accommodations']['Row'];

export interface TravelSummary {
  flights: Flight[];
  visa: Visa | null;
  accommodation: Accommodation | null;
}

const EMPTY_SUMMARY: TravelSummary = { flights: [], visa: null, accommodation: null };

export async function fetchTravelSummary(tripId: string): Promise<TravelSummary> {
  const [flightsResult, visaResult, accommodationResult] = await Promise.all([
    supabase.from('flights').select('*').eq('trip_id', tripId).order('departure_date', { ascending: true }),
    supabase.from('visas').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }).limit(1),
    supabase.from('accommodations').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }).limit(1),
  ]);
  if (flightsResult.error) throw flightsResult.error;
  if (visaResult.error) throw visaResult.error;
  if (accommodationResult.error) throw accommodationResult.error;

  return {
    flights: flightsResult.data ?? [],
    visa: visaResult.data?.[0] ?? null,
    accommodation: accommodationResult.data?.[0] ?? null,
  };
}

export function useTravelSummary(tripId: string | undefined) {
  return useQuery({
    queryKey: ['travel-summary', tripId],
    queryFn: () => fetchTravelSummary(tripId!),
    enabled: Boolean(tripId),
    placeholderData: EMPTY_SUMMARY,
  });
}

const PERIOD_DEFAULT_TIMES: Record<'morning' | 'afternoon' | 'evening', string> = {
  morning: '09:00',
  afternoon: '14:00',
  evening: '19:00',
};

function resolveDepartureTime(answers: TravelFlowAnswers): string {
  if (answers.departureTimePeriod === 'custom') {
    return answers.departureTimeCustom || '09:00';
  }
  return PERIOD_DEFAULT_TIMES[answers.departureTimePeriod];
}

function resolveAirline(answers: TravelFlowAnswers): string {
  return answers.airline === 'other' ? answers.airlineOther || 'Other' : answers.airline;
}

const VISA_DURATION_DAYS = 60;
const toISODate = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Known limitation: this performs 3 sequential inserts (flight, visa,
 * accommodation) with no surrounding DB transaction — supabase-js has no
 * multi-table transaction API without a Postgres RPC function. If it fails
 * partway through and the chat-flow's retry() re-runs this with the same
 * answers, earlier inserts from the failed attempt are NOT deduplicated and
 * would be inserted again. Accepted for MVP at personal-app data volumes,
 * same category of accepted risk as the plan's orphaned-storage-object note.
 */
export async function submitTravelFlow(answers: TravelFlowAnswers): Promise<void> {
  const trip = await getOrCreateCurrentTrip(answers.departureDate);

  const issueDate = new Date();
  const expiryDate = new Date(issueDate);
  expiryDate.setDate(expiryDate.getDate() + VISA_DURATION_DAYS);

  const { error: flightError } = await supabase.from('flights').insert({
    trip_id: trip.id,
    direction: 'outbound',
    departure_date: answers.departureDate,
    departure_time: resolveDepartureTime(answers),
    airline: resolveAirline(answers),
    flight_number: answers.flightNumber,
    cost_aed: answers.flightCostAed,
  });
  if (flightError) throw flightError;

  const { error: visaError } = await supabase.from('visas').insert({
    trip_id: trip.id,
    visa_type: answers.visaType,
    fee_aed: answers.visaFeeAed,
    duration_days: VISA_DURATION_DAYS,
    issue_date: toISODate(issueDate),
    expiry_date: toISODate(expiryDate),
  });
  if (visaError) throw visaError;

  const { error: accommodationError } = await supabase.from('accommodations').insert({
    trip_id: trip.id,
    name: answers.pgName,
    address: answers.pgAddress,
    check_in_date: answers.departureDate,
    monthly_rent_aed: answers.pgMonthlyRentAed,
  });
  if (accommodationError) throw accommodationError;
}

export function useSubmitTravelFlow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitTravelFlow,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['trips', 'current'] });
      void queryClient.invalidateQueries({ queryKey: ['travel-summary'] });
    },
  });
}

export async function updateAccommodation(
  accommodationId: string,
  patch: Database['public']['Tables']['accommodations']['Update'],
): Promise<void> {
  const { error } = await supabase.from('accommodations').update(patch).eq('id', accommodationId);
  if (error) throw error;
}

export async function submitAccommodationEdit(accommodationId: string, answers: AccommodationEditAnswers): Promise<void> {
  await updateAccommodation(accommodationId, {
    name: answers.name,
    address: answers.address,
    check_in_date: answers.checkInDate,
    check_out_date: answers.checkOutDate,
    monthly_rent_aed: answers.monthlyRentAed,
  });
}

export function useSubmitAccommodationEdit(tripId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ accommodationId, answers }: { accommodationId: string; answers: AccommodationEditAnswers }) =>
      submitAccommodationEdit(accommodationId, answers),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['travel-summary', tripId] });
    },
  });
}

export async function updateVisa(visaId: string, patch: Database['public']['Tables']['visas']['Update']): Promise<void> {
  const { error } = await supabase.from('visas').update(patch).eq('id', visaId);
  if (error) throw error;
}

export async function submitVisaEdit(visaId: string, answers: VisaEditAnswers): Promise<void> {
  await updateVisa(visaId, {
    visa_type: answers.visaType,
    fee_aed: answers.feeAed,
    duration_days: answers.durationDays,
    issue_date: answers.issueDate,
    expiry_date: answers.expiryDate,
    status: answers.status,
  });
}

export function useSubmitVisaEdit(tripId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ visaId, answers }: { visaId: string; answers: VisaEditAnswers }) => submitVisaEdit(visaId, answers),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['travel-summary', tripId] });
    },
  });
}
