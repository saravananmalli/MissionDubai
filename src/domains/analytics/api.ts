import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/lib/database.types';
import { logApplicationEvent } from '@/domains/applications/api';
import type { OfferFlowAnswers } from '@/domains/analytics/types';

export type Offer = Database['public']['Tables']['offers']['Row'];

export interface OfferWithCompany extends Offer {
  companyName: string;
}

export async function fetchOffers(tripId: string): Promise<OfferWithCompany[]> {
  const { data: applications, error: applicationsError } = await supabase
    .from('applications')
    .select('id, company_name')
    .eq('trip_id', tripId);
  if (applicationsError) throw applicationsError;
  if (!applications || applications.length === 0) return [];

  const { data: offers, error } = await supabase
    .from('offers')
    .select('*')
    .in('application_id', applications.map((a) => a.id));
  if (error) throw error;

  const appById = new Map(applications.map((a) => [a.id, a]));
  return (offers ?? []).map((offer) => ({
    ...offer,
    companyName: appById.get(offer.application_id)?.company_name ?? 'Unknown company',
  }));
}

export function useOffers(tripId: string | undefined) {
  return useQuery({
    queryKey: ['offers', tripId],
    queryFn: () => fetchOffers(tripId!),
    enabled: Boolean(tripId),
  });
}

const GROWTH_RATING: Record<OfferFlowAnswers['growth'], number> = { low: 1, medium: 2, high: 3 };

export async function submitOfferFlow(answers: OfferFlowAnswers): Promise<void> {
  const { error } = await supabase.from('offers').insert({
    application_id: answers.applicationId,
    salary_aed: answers.salaryAed,
    bonus_percent: answers.bonusPercent ?? null,
    leave_days: answers.leaveDays ?? null,
    visa_sponsorship: answers.visaSponsorship === 'yes',
    visa_cost_responsibility: answers.visaCostResponsibility ?? null,
    location: answers.location || null,
    growth_rating: GROWTH_RATING[answers.growth],
  });
  if (error) throw error;

  const { error: statusError } = await supabase.from('applications').update({ status: 'offer' }).eq('id', answers.applicationId);
  if (statusError) throw statusError;

  await logApplicationEvent(answers.applicationId, 'offer_received', `Offer received: ${answers.salaryAed.toLocaleString()} AED.`);
}
