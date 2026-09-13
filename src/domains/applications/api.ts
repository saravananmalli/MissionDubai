import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateCurrentTrip } from '@/lib/trips';
import type { Database } from '@/lib/database.types';
import type { ApplicationFlowAnswers, VisitFlowAnswers } from '@/domains/applications/types';

export type Application = Database['public']['Tables']['applications']['Row'];
export type CompanyVisit = Database['public']['Tables']['company_visits']['Row'];
export type VisitPhoto = Database['public']['Tables']['visit_photos']['Row'];

export interface CompanyVisitWithPhotos extends CompanyVisit {
  photos: VisitPhoto[];
}

export interface ApplicationWithVisits extends Application {
  visits: CompanyVisitWithPhotos[];
}

export async function fetchApplications(tripId: string): Promise<ApplicationWithVisits[]> {
  const { data: applications, error: applicationsError } = await supabase
    .from('applications')
    .select('*')
    .eq('trip_id', tripId)
    .order('applied_date', { ascending: false });
  if (applicationsError) throw applicationsError;
  if (!applications || applications.length === 0) return [];

  const applicationIds = applications.map((a) => a.id);
  const { data: visits, error: visitsError } = await supabase
    .from('company_visits')
    .select('*')
    .in('application_id', applicationIds)
    .order('visit_date', { ascending: true });
  if (visitsError) throw visitsError;

  const visitIds = (visits ?? []).map((v) => v.id);
  const { data: photos, error: photosError } =
    visitIds.length > 0
      ? await supabase.from('visit_photos').select('*').in('visit_id', visitIds)
      : { data: [] as VisitPhoto[], error: null };
  if (photosError) throw photosError;

  return applications.map((application) => ({
    ...application,
    visits: (visits ?? [])
      .filter((v) => v.application_id === application.id)
      .map((visit) => ({ ...visit, photos: (photos ?? []).filter((p) => p.visit_id === visit.id) })),
  }));
}

export function useApplications(tripId: string | undefined) {
  return useQuery({
    queryKey: ['applications', tripId],
    queryFn: () => fetchApplications(tripId!),
    enabled: Boolean(tripId),
  });
}

const SALARY_RANGES: Record<string, { min: number; max: number } | undefined> = {
  '100-150k': { min: 100_000, max: 150_000 },
  '150-200k': { min: 150_000, max: 200_000 },
  '200-250k': { min: 200_000, max: 250_000 },
  '250k+': { min: 250_000, max: 250_000 },
};

function resolveSource(answers: ApplicationFlowAnswers): string {
  return answers.source === 'other' ? answers.sourceOther || 'other' : answers.source;
}

/**
 * Known limitation: "one company = one record" is enforced by a unique
 * constraint, but a real duplicate-application race (two tabs submitting the
 * same company at once) still surfaces as a raw constraint-violation message
 * rather than the friendlier "update existing?" prompt described in the
 * product doc — building that merge UX is deferred to a later pass. This
 * proactive check just makes the common (non-racing) case give a clear error.
 */
export async function submitApplicationFlow(answers: ApplicationFlowAnswers): Promise<void> {
  const trip = await getOrCreateCurrentTrip(new Date().toISOString().slice(0, 10));

  const { data: existing, error: existingError } = await supabase
    .from('applications')
    .select('id, company_name')
    .eq('trip_id', trip.id)
    .ilike('company_name', answers.companyName.trim());
  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    throw new Error(`You've already applied to ${existing[0]!.company_name}. Update it from the Applications list instead.`);
  }

  const salaryRange = answers.salaryRange === 'will_update_later' ? undefined : SALARY_RANGES[answers.salaryRange];

  const { error } = await supabase.from('applications').insert({
    trip_id: trip.id,
    company_name: answers.companyName.trim(),
    position_title: answers.positionTitle.trim(),
    source: resolveSource(answers) as Application['source'],
    salary_min_aed: salaryRange?.min ?? null,
    salary_max_aed: salaryRange?.max ?? null,
    salary_status: salaryRange ? 'provided' : 'will_update_later',
    visa_sponsorship: answers.visaSponsorship,
    contact_name: answers.contactName || null,
    contact_email: answers.contactEmail || null,
    contact_phone: answers.contactPhone || null,
  });
  if (error) throw error;
}

async function uploadVisitPhoto(userId: string, applicationId: string, visitId: string, file: File): Promise<string> {
  const compressed = await imageCompression(file, { maxSizeMB: 1.5, maxWidthOrHeight: 1600 });
  const path = `${userId}/${applicationId}/${visitId}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from('visit-photos').upload(path, compressed, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

export async function addCompanyVisit(applicationId: string, answers: VisitFlowAnswers): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user.id;
  if (!userId) throw new Error('You must be logged in to add a visit.');

  const { data: visit, error: visitError } = await supabase
    .from('company_visits')
    .insert({
      application_id: applicationId,
      visit_date: answers.visitDate,
      visit_time: answers.visitTime,
      purpose: answers.purpose,
      notes: answers.notes || null,
    })
    .select()
    .single();
  if (visitError) throw visitError;

  const photos = answers.photos ?? [];
  for (const file of photos) {
    const path = await uploadVisitPhoto(userId, applicationId, visit.id, file);
    const { error: photoError } = await supabase.from('visit_photos').insert({ visit_id: visit.id, storage_path: path });
    if (photoError) throw photoError;
  }
}

export function useAddCompanyVisit(tripId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, answers }: { applicationId: string; answers: VisitFlowAnswers }) =>
      addCompanyVisit(applicationId, answers),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['applications', tripId] });
    },
  });
}

export async function fetchSignedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const entries = await Promise.all(
    paths.map(async (path) => {
      const { data, error } = await supabase.storage.from('visit-photos').createSignedUrl(path, 3600);
      if (error) throw error;
      return [path, data.signedUrl] as const;
    }),
  );
  return Object.fromEntries(entries);
}

export function useSignedPhotoUrls(paths: string[]) {
  return useQuery({
    queryKey: ['visit-photo-urls', ...paths],
    queryFn: () => fetchSignedPhotoUrls(paths),
    enabled: paths.length > 0,
  });
}
