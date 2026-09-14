import { describe, expect, it } from 'vitest';
import { computePipelineBreakdown, computeSourceBreakdown, formatEnumLabel, formatSourceLabel } from '@/domains/applications/utils';
import type { Application } from '@/domains/applications/api';

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

describe('formatEnumLabel', () => {
  it('replaces every underscore with a space', () => {
    expect(formatEnumLabel('no_response')).toBe('no response');
    expect(formatEnumLabel('candidate_rejected')).toBe('candidate rejected');
  });
});

describe('formatSourceLabel', () => {
  it('prefers source_name for job boards and "other"', () => {
    expect(formatSourceLabel('job_board', 'Indeed')).toBe('Indeed');
    expect(formatSourceLabel('other', 'WhatsApp')).toBe('WhatsApp');
  });

  it('falls back to the enum label when no source_name is set', () => {
    expect(formatSourceLabel('job_board', null)).toBe('Job Board');
    expect(formatSourceLabel('linkedin', null)).toBe('LinkedIn');
    expect(formatSourceLabel('company_site', null)).toBe('Company Websites');
  });

  it('ignores source_name for sources that do not use it (e.g. LinkedIn)', () => {
    expect(formatSourceLabel('linkedin', 'irrelevant')).toBe('LinkedIn');
  });
});

describe('computePipelineBreakdown', () => {
  it('buckets applications into the 7 spec stages', () => {
    const applications = [
      makeApplication({ id: 'a1', status: 'saved' }),
      makeApplication({ id: 'a2', status: 'applied' }),
      makeApplication({ id: 'a3', status: 'interviewing' }),
      makeApplication({ id: 'a4', status: 'offer' }),
      makeApplication({ id: 'a5', status: 'rejected' }),
      makeApplication({ id: 'a6', status: 'candidate_rejected' }),
      makeApplication({ id: 'a7', status: 'no_response' }),
    ];
    const interviews = [{ application_id: 'a3', type: 'phone' }];

    const breakdown = computePipelineBreakdown(applications, interviews);
    const counts = Object.fromEntries(breakdown.stages.map((s) => [s.label, s.count]));
    expect(counts).toEqual({
      Saved: 1,
      Applied: 1,
      Interview: 1,
      'Final Round': 0,
      Offer: 1,
      Rejected: 2, // rejected + candidate_rejected combined
      'No Response': 1,
    });
  });

  it('classifies an application with a final-round interview as Final Round, not its raw status', () => {
    const applications = [makeApplication({ id: 'a1', status: 'interviewing' })];
    const interviews = [{ application_id: 'a1', type: 'final' }];
    const breakdown = computePipelineBreakdown(applications, interviews);
    const counts = Object.fromEntries(breakdown.stages.map((s) => [s.label, s.count]));
    expect(counts['Final Round']).toBe(1);
    expect(counts.Interview).toBe(0);
  });
});

describe('computeSourceBreakdown', () => {
  it('groups by resolved source label and counts interviews/offers per source', () => {
    const applications = [
      makeApplication({ id: 'a1', source: 'linkedin' }),
      makeApplication({ id: 'a2', source: 'linkedin' }),
      makeApplication({ id: 'a3', source: 'job_board', source_name: 'Indeed' }),
    ];
    const interviews = [{ application_id: 'a1' }];
    const offers = [{ application_id: 'a1' }];

    const rows = computeSourceBreakdown(applications, interviews, offers);
    expect(rows).toEqual([
      { label: 'LinkedIn', applicationCount: 2, interviewedCount: 1, offerCount: 1 },
      { label: 'Indeed', applicationCount: 1, interviewedCount: 0, offerCount: 0 },
    ]);
  });
});
