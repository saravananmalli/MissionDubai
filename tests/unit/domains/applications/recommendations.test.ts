import { describe, expect, it } from 'vitest';
import {
  inactiveApplicationRecommendation,
  interviewCollisionRecommendation,
  roundGapRecommendation,
  staleApplicationsRecommendation,
  staleResumeVersionRecommendation,
  upcomingInterviewPrepRecommendation,
} from '@/domains/applications/recommendations';
import type { Application, ApplicationEvent, FollowUp } from '@/domains/applications/api';

const NOW = new Date('2026-09-13T12:00:00');

function makeApplication(overrides: Partial<Application> = {}): Application {
  return {
    id: 'app-1',
    user_id: 'user-1',
    trip_id: 'trip-1',
    company_name: 'Tech Corp',
    position_title: 'Senior Developer',
    location: null,
    source: 'linkedin',
    source_name: null,
    status: 'applied',
    final_outcome: null,
    applied_date: '2026-09-01',
    salary_min_aed: null,
    salary_max_aed: null,
    salary_status: 'will_update_later',
    visa_sponsorship: 'unsure',
    contact_name: null,
    contact_email: null,
    contact_phone: null,
    resume_status: 'not_submitted',
    resume_version: null,
    resume_submitted_date: null,
    cover_letter_submitted: false,
    application_url: null,
    notes: null,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...overrides,
  };
}

function makeFollowUp(overrides: Partial<FollowUp> = {}): FollowUp {
  return {
    id: 'follow-up-1',
    user_id: 'user-1',
    application_id: 'app-1',
    due_date: '2026-09-05',
    status: 'pending',
    notes: null,
    created_at: '2026-09-01T00:00:00Z',
    completed_at: null,
    ...overrides,
  };
}

describe('staleApplicationsRecommendation', () => {
  it('flags applications applied 10+ days ago with no pending follow-up', () => {
    const applications = [makeApplication({ id: 'a1', applied_date: '2026-09-01' })];
    expect(staleApplicationsRecommendation(applications, [], NOW)).toMatch(/1 application/);
  });

  it('excludes applications that already have a pending follow-up', () => {
    const applications = [makeApplication({ id: 'a1', applied_date: '2026-09-01' })];
    const followUps = [makeFollowUp({ application_id: 'a1', status: 'pending' })];
    expect(staleApplicationsRecommendation(applications, followUps, NOW)).toBeNull();
  });

  it('returns null when nothing is stale', () => {
    const applications = [makeApplication({ id: 'a1', applied_date: '2026-09-12' })];
    expect(staleApplicationsRecommendation(applications, [], NOW)).toBeNull();
  });
});

describe('interviewCollisionRecommendation', () => {
  it('flags two scheduled interviews with different companies on the same day', () => {
    const interviews = [
      { application_id: 'a1', companyName: 'Tech Corp', interview_date: '2026-09-20', type: 'phone', round_number: 1, round_result: 'pending', interview_status: 'scheduled' },
      { application_id: 'a2', companyName: 'Other Co', interview_date: '2026-09-20', type: 'video', round_number: 1, round_result: 'pending', interview_status: 'scheduled' },
    ];
    expect(interviewCollisionRecommendation(interviews)).toMatch(/2 interviews scheduled on 2026-09-20/);
  });

  it('ignores cancelled interviews', () => {
    const interviews = [
      { application_id: 'a1', companyName: 'Tech Corp', interview_date: '2026-09-20', type: 'phone', round_number: 1, round_result: 'pending', interview_status: 'cancelled' },
      { application_id: 'a2', companyName: 'Other Co', interview_date: '2026-09-20', type: 'video', round_number: 1, round_result: 'pending', interview_status: 'scheduled' },
    ];
    expect(interviewCollisionRecommendation(interviews)).toBeNull();
  });
});

describe('roundGapRecommendation', () => {
  it('flags a passed round with no next round scheduled', () => {
    const interviews = [
      { application_id: 'a1', companyName: 'Tech Corp', interview_date: '2026-09-05', type: 'hr_screening', round_number: 1, round_result: 'passed', interview_status: 'completed' },
    ];
    expect(roundGapRecommendation(interviews)).toBe("You passed Round 1 at Tech Corp. Round 2 hasn't been scheduled yet.");
  });

  it('returns null once the next round exists', () => {
    const interviews = [
      { application_id: 'a1', companyName: 'Tech Corp', interview_date: '2026-09-05', type: 'hr_screening', round_number: 1, round_result: 'passed', interview_status: 'completed' },
      { application_id: 'a1', companyName: 'Tech Corp', interview_date: '2026-09-12', type: 'technical', round_number: 2, round_result: 'pending', interview_status: 'scheduled' },
    ];
    expect(roundGapRecommendation(interviews)).toBeNull();
  });
});

describe('staleResumeVersionRecommendation', () => {
  it('flags an application using an older resume version than the most recently submitted one', () => {
    const applications = [
      makeApplication({ id: 'a1', company_name: 'Old Co', resume_version: 'v1', resume_submitted_date: '2026-08-01' }),
      makeApplication({ id: 'a2', company_name: 'New Co', resume_version: 'v2', resume_submitted_date: '2026-09-01' }),
    ];
    expect(staleResumeVersionRecommendation(applications)).toMatch(/Old Co using resume version "v1"/);
  });

  it('returns null when every submitted application used the same version', () => {
    const applications = [
      makeApplication({ id: 'a1', resume_version: 'v1', resume_submitted_date: '2026-08-01' }),
      makeApplication({ id: 'a2', resume_version: 'v1', resume_submitted_date: '2026-09-01' }),
    ];
    expect(staleResumeVersionRecommendation(applications)).toBeNull();
  });
});

describe('inactiveApplicationRecommendation', () => {
  it('flags an active application with no activity in 14+ days', () => {
    const application = makeApplication({ status: 'applied', applied_date: '2026-08-25' });
    expect(inactiveApplicationRecommendation(application, [], NOW)).toMatch(/inactive for \d+ days/);
  });

  it('is silent for a terminal status', () => {
    const application = makeApplication({ status: 'rejected', applied_date: '2026-08-01' });
    expect(inactiveApplicationRecommendation(application, [], NOW)).toBeNull();
  });

  it('uses the most recent event, not the applied date, when events exist', () => {
    const application = makeApplication({ status: 'applied', applied_date: '2026-08-01' });
    const events: ApplicationEvent[] = [
      { id: 'e1', user_id: 'user-1', application_id: 'app-1', event_type: 'note_added', description: 'x', metadata: null, occurred_at: '2026-09-10T00:00:00Z' },
    ];
    expect(inactiveApplicationRecommendation(application, events, NOW)).toBeNull();
  });
});

describe('upcomingInterviewPrepRecommendation', () => {
  it('flags an interview tomorrow with no prep notes', () => {
    const interviews = [{ interview_date: '2026-09-14', prep_notes: null }];
    expect(upcomingInterviewPrepRecommendation(interviews, NOW)).toMatch(/no preparation notes yet/);
  });

  it('gives a softer nudge when prep notes already exist', () => {
    const interviews = [{ interview_date: '2026-09-14', prep_notes: 'Review system design' }];
    expect(upcomingInterviewPrepRecommendation(interviews, NOW)).toMatch(/review your preparation notes/);
  });

  it('returns null when no interview is tomorrow', () => {
    const interviews = [{ interview_date: '2026-09-20', prep_notes: null }];
    expect(upcomingInterviewPrepRecommendation(interviews, NOW)).toBeNull();
  });
});
