import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import imageCompression from 'browser-image-compression';
import { supabase } from '@/lib/supabaseClient';
import { getOrCreateCurrentTrip } from '@/lib/trips';
import type { ApplicationStatus, Database, FinalOutcome } from '@/lib/database.types';
import {
  resolveFinalOutcome,
  sourceUsesSourceName,
  type ApplicationEditAnswers,
  type ApplicationFlowAnswers,
  type FinalOutcomeFlowAnswers,
  type FollowUpFlowAnswers,
  type ResumeFlowAnswers,
  type VisitFlowAnswers,
} from '@/domains/applications/types';
import { formatEnumLabel } from '@/domains/applications/utils';

export type Application = Database['public']['Tables']['applications']['Row'];
export type CompanyVisit = Database['public']['Tables']['company_visits']['Row'];
export type VisitPhoto = Database['public']['Tables']['visit_photos']['Row'];
export type ApplicationEvent = Database['public']['Tables']['application_events']['Row'];
export type FollowUp = Database['public']['Tables']['follow_ups']['Row'];

export interface CompanyVisitWithPhotos extends CompanyVisit {
  photos: VisitPhoto[];
}

export interface ApplicationWithVisits extends Application {
  visits: CompanyVisitWithPhotos[];
}

export interface FollowUpWithApplication extends FollowUp {
  companyName: string;
  positionTitle: string;
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

export async function fetchApplication(applicationId: string): Promise<Application | null> {
  const { data, error } = await supabase.from('applications').select('*').eq('id', applicationId).limit(1);
  if (error) throw error;
  return data?.[0] ?? null;
}

export function useApplication(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['application', applicationId],
    queryFn: () => fetchApplication(applicationId!),
    enabled: Boolean(applicationId),
  });
}

export async function fetchApplicationVisits(applicationId: string): Promise<CompanyVisitWithPhotos[]> {
  const { data: visits, error: visitsError } = await supabase
    .from('company_visits')
    .select('*')
    .eq('application_id', applicationId)
    .order('visit_date', { ascending: true });
  if (visitsError) throw visitsError;

  const visitIds = (visits ?? []).map((v) => v.id);
  const { data: photos, error: photosError } =
    visitIds.length > 0
      ? await supabase.from('visit_photos').select('*').in('visit_id', visitIds)
      : { data: [] as VisitPhoto[], error: null };
  if (photosError) throw photosError;

  return (visits ?? []).map((visit) => ({ ...visit, photos: (photos ?? []).filter((p) => p.visit_id === visit.id) }));
}

export function useApplicationVisits(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['application-visits', applicationId],
    queryFn: () => fetchApplicationVisits(applicationId!),
    enabled: Boolean(applicationId),
  });
}

/**
 * Every mutation that changes an application's real-world state calls this
 * so the Timeline (spec §11) can never drift from what actually happened —
 * there is no separate "remember to log it" step. Exported as
 * `logApplicationEvent` for other domains (interviews, offers) whose
 * mutations affect an application's timeline too.
 */
export async function logApplicationEvent(applicationId: string, eventType: string, description: string, metadata?: Record<string, unknown>): Promise<void> {
  const { error } = await supabase
    .from('application_events')
    .insert({ application_id: applicationId, event_type: eventType, description, metadata: metadata ?? null });
  if (error) throw error;
}

export async function fetchApplicationEvents(applicationId: string): Promise<ApplicationEvent[]> {
  const { data, error } = await supabase
    .from('application_events')
    .select('*')
    .eq('application_id', applicationId)
    .order('occurred_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export function useApplicationEvents(applicationId: string | undefined) {
  return useQuery({
    queryKey: ['application-events', applicationId],
    queryFn: () => fetchApplicationEvents(applicationId!),
    enabled: Boolean(applicationId),
  });
}

// Monthly AED, not annual — the quick-tap labels say "/mo" and the display
// text in ApplicationCard/ApplicationDetailPage does too.
const SALARY_RANGES: Record<string, { min: number; max: number } | undefined> = {
  '5-10k': { min: 5_000, max: 10_000 },
  '10-12k': { min: 10_000, max: 12_000 },
  '12-15k': { min: 12_000, max: 15_000 },
  '15k+': { min: 15_000, max: 15_000 },
};

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

  const { data: inserted, error } = await supabase
    .from('applications')
    .insert({
      trip_id: trip.id,
      company_name: answers.companyName.trim(),
      position_title: answers.positionTitle.trim(),
      location: answers.location?.trim() || null,
      source: answers.source,
      source_name: sourceUsesSourceName(answers.source) ? answers.sourceName?.trim() || null : null,
      salary_min_aed: salaryRange?.min ?? null,
      salary_max_aed: salaryRange?.max ?? null,
      salary_status: salaryRange ? 'provided' : 'will_update_later',
      visa_sponsorship: answers.visaSponsorship,
      contact_name: answers.contactName || null,
      contact_email: answers.contactEmail || null,
      contact_phone: answers.contactPhone || null,
    })
    .select()
    .single();
  if (error) throw error;

  await logApplicationEvent(inserted.id, 'created', `Application to ${inserted.company_name} added.`);
}

async function updateApplication(applicationId: string, patch: Database['public']['Tables']['applications']['Update']): Promise<void> {
  const { error } = await supabase.from('applications').update(patch).eq('id', applicationId);
  if (error) throw error;
}

export async function submitApplicationEdit(applicationId: string, answers: ApplicationEditAnswers): Promise<void> {
  await updateApplication(applicationId, {
    company_name: answers.companyName,
    position_title: answers.positionTitle,
    location: answers.location,
    application_url: answers.applicationUrl,
    salary_min_aed: answers.salaryMinAed,
    salary_max_aed: answers.salaryMaxAed,
    visa_sponsorship: answers.visaSponsorship,
    contact_name: answers.contactName,
    contact_email: answers.contactEmail,
    contact_phone: answers.contactPhone,
    notes: answers.notes,
  });
  await logApplicationEvent(applicationId, 'note_added', 'Application details updated.');
}

export function useSubmitApplicationEdit(tripId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, answers }: { applicationId: string; answers: ApplicationEditAnswers }) =>
      submitApplicationEdit(applicationId, answers),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['applications', tripId] });
      void queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
      void queryClient.invalidateQueries({ queryKey: ['application-events', variables.applicationId] });
    },
  });
}

export async function submitStatusUpdate(applicationId: string, status: ApplicationStatus): Promise<void> {
  await updateApplication(applicationId, { status });
  await logApplicationEvent(applicationId, 'status_changed', `Status changed to ${formatEnumLabel(status)}.`);
}

export function useSubmitStatusUpdate(tripId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, status }: { applicationId: string; status: ApplicationStatus }) =>
      submitStatusUpdate(applicationId, status),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['applications', tripId] });
      void queryClient.invalidateQueries({ queryKey: ['application', variables.applicationId] });
      void queryClient.invalidateQueries({ queryKey: ['application-events', variables.applicationId] });
    },
  });
}

/**
 * Spec §16: keep the working `status` and the resolved `final_outcome`
 * separate concepts, but picking a final outcome should still move the
 * application off the active pipeline — this is the one place that maps one
 * to a sensible default for the other.
 */
const STATUS_FOR_OUTCOME: Record<FinalOutcome, ApplicationStatus> = {
  offer_received: 'offer',
  offer_accepted: 'hired',
  offer_declined: 'withdrawn',
  company_rejected: 'rejected',
  candidate_rejected: 'candidate_rejected',
  withdrawn: 'withdrawn',
  no_response: 'no_response',
  position_closed: 'closed',
};

export async function submitFinalOutcomeFlow(applicationId: string, answers: FinalOutcomeFlowAnswers): Promise<void> {
  const outcome = resolveFinalOutcome(answers);
  await updateApplication(applicationId, { final_outcome: outcome, status: STATUS_FOR_OUTCOME[outcome] });
  await logApplicationEvent(applicationId, 'final_outcome_set', `Final outcome: ${formatEnumLabel(outcome)}.`);
}

export function createSubmitFinalOutcomeFlow(applicationId: string) {
  return (answers: FinalOutcomeFlowAnswers) => submitFinalOutcomeFlow(applicationId, answers);
}

export async function submitResumeFlow(applicationId: string, answers: ResumeFlowAnswers): Promise<void> {
  await updateApplication(applicationId, {
    resume_status: answers.resumeStatus,
    resume_version: answers.resumeVersion?.trim() || null,
    resume_submitted_date: answers.resumeSubmittedDate || null,
    cover_letter_submitted: answers.coverLetterSubmitted === 'yes',
    application_url: answers.applicationUrl?.trim() || null,
  });
  await logApplicationEvent(applicationId, 'resume_submitted', `Resume status: ${formatEnumLabel(answers.resumeStatus)}.`);
}

export function createSubmitResumeFlow(applicationId: string) {
  return (answers: ResumeFlowAnswers) => submitResumeFlow(applicationId, answers);
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

  await logApplicationEvent(applicationId, 'note_added', `Company visit logged for ${answers.visitDate}.`);
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

// --- Follow-ups (spec §7) ---

export async function fetchFollowUps(tripId: string): Promise<FollowUpWithApplication[]> {
  const { data: applications, error: applicationsError } = await supabase
    .from('applications')
    .select('id, company_name, position_title')
    .eq('trip_id', tripId);
  if (applicationsError) throw applicationsError;
  if (!applications || applications.length === 0) return [];

  const { data: followUps, error } = await supabase
    .from('follow_ups')
    .select('*')
    .in(
      'application_id',
      applications.map((a) => a.id),
    )
    .order('due_date', { ascending: true });
  if (error) throw error;

  const appById = new Map(applications.map((a) => [a.id, a]));
  return (followUps ?? []).map((followUp) => {
    const application = appById.get(followUp.application_id);
    return {
      ...followUp,
      companyName: application?.company_name ?? 'Unknown company',
      positionTitle: application?.position_title ?? '',
    };
  });
}

export function useFollowUps(tripId: string | undefined) {
  return useQuery({
    queryKey: ['follow-ups', tripId],
    queryFn: () => fetchFollowUps(tripId!),
    enabled: Boolean(tripId),
  });
}

export async function submitFollowUpFlow(applicationId: string, answers: FollowUpFlowAnswers): Promise<void> {
  if (answers.choice === 'ignore') return;

  const today = new Date().toISOString().slice(0, 10);

  if (answers.choice === 'none') {
    await logApplicationEvent(applicationId, 'follow_up_scheduled', 'Marked as no follow-up needed for now.');
    return;
  }

  if (answers.choice === 'already_contacted') {
    const { error } = await supabase.from('follow_ups').insert({
      application_id: applicationId,
      due_date: today,
      status: 'completed',
      notes: answers.notes || null,
      completed_at: new Date().toISOString(),
    });
    if (error) throw error;
    await logApplicationEvent(applicationId, 'follow_up_completed', 'Already followed up with this company.');
    return;
  }

  const dueDate = answers.choice === 'today' ? today : answers.dueDate!;
  const { error } = await supabase.from('follow_ups').insert({ application_id: applicationId, due_date: dueDate, notes: answers.notes || null });
  if (error) throw error;
  await logApplicationEvent(applicationId, 'follow_up_scheduled', `Follow-up scheduled for ${dueDate}.`);
}

export function createSubmitFollowUpFlow(applicationId: string) {
  return (answers: FollowUpFlowAnswers) => submitFollowUpFlow(applicationId, answers);
}

export async function completeFollowUp(followUpId: string, applicationId: string): Promise<void> {
  const { error } = await supabase
    .from('follow_ups')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', followUpId);
  if (error) throw error;
  await logApplicationEvent(applicationId, 'follow_up_completed', 'Follow-up marked complete.');
}

export function useCompleteFollowUp(tripId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ followUpId, applicationId }: { followUpId: string; applicationId: string }) => completeFollowUp(followUpId, applicationId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['follow-ups', tripId] });
      void queryClient.invalidateQueries({ queryKey: ['application-events', variables.applicationId] });
    },
  });
}
