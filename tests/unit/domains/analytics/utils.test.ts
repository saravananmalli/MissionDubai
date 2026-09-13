import { describe, expect, it } from 'vitest';
import {
  compareOffers,
  computeApplicationFunnel,
  computeJobSearchMetrics,
  computeJourneyProgress,
  computeSalaryAnalysis,
} from '@/domains/analytics/utils';

// computeJourneyProgress parses YYYY-MM-DD strings as LOCAL midnight, so
// tests must format dates the same way — toISOString() is UTC and would
// silently shift by a day depending on the test runner's timezone.
function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('computeJourneyProgress', () => {
  it('matches the doc\'s worked example: 45/60 days -> 75%', () => {
    const now = new Date('2026-09-13T00:00:00');
    const start = toLocalISODate(new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000));
    const end = toLocalISODate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000));
    const result = computeJourneyProgress(start, end, now);
    expect(result.daysElapsed).toBe(45);
    expect(result.daysRemaining).toBe(15);
    expect(result.totalDays).toBe(60);
    expect(result.percentComplete).toBe(75);
  });

  it('clamps elapsed days to the trip length once the trip is over', () => {
    const start = '2026-01-01';
    const end = '2026-01-10';
    const result = computeJourneyProgress(start, end, new Date('2026-02-01T00:00:00'));
    expect(result.daysElapsed).toBe(9);
    expect(result.daysRemaining).toBe(0);
    expect(result.percentComplete).toBe(100);
  });

  it('clamps to zero before the trip has started', () => {
    const result = computeJourneyProgress('2026-06-01', '2026-07-01', new Date('2026-01-01T00:00:00'));
    expect(result.daysElapsed).toBe(0);
    expect(result.percentComplete).toBe(0);
  });
});

describe('computeApplicationFunnel', () => {
  it('computes three stages with conversion percentages, not a fabricated shortlisted stage', () => {
    const stages = computeApplicationFunnel(15, 4, 2);
    expect(stages.map((s) => s.label)).toEqual(['Applied', 'Interviewed', 'Offered']);
    expect(stages[1]!.conversionFromPreviousPercent).toBe(27); // 4/15
    expect(stages[2]!.conversionFromPreviousPercent).toBe(50); // 2/4, matches the doc's example
  });

  it('reports null conversion rather than dividing by zero when a stage is empty', () => {
    const stages = computeApplicationFunnel(0, 0, 0);
    expect(stages[1]!.conversionFromPreviousPercent).toBeNull();
    expect(stages[2]!.conversionFromPreviousPercent).toBeNull();
  });
});

describe('computeJobSearchMetrics', () => {
  it('matches the doc\'s worked example', () => {
    const result = computeJobSearchMetrics({
      totalSpentAed: 4500,
      applicationCount: 15,
      interviewedApplicationCount: 4,
      offerCount: 2,
      daysToFirstInterview: [5, 5],
      daysToOffer: [18, 18],
    });
    expect(result.costPerApplicationAed).toBe(300);
    expect(result.costPerInterviewAed).toBe(1125);
    expect(result.costPerOfferAed).toBe(2250);
    expect(result.interviewSuccessRatePercent).toBe(50);
    expect(result.avgDaysToFirstInterview).toBe(5);
    expect(result.avgDaysToOffer).toBe(18);
  });

  it('returns null (not Infinity/NaN) for every rate when the relevant count is zero', () => {
    const result = computeJobSearchMetrics({
      totalSpentAed: 0,
      applicationCount: 0,
      interviewedApplicationCount: 0,
      offerCount: 0,
      daysToFirstInterview: [],
      daysToOffer: [],
    });
    expect(result.costPerApplicationAed).toBeNull();
    expect(result.costPerInterviewAed).toBeNull();
    expect(result.costPerOfferAed).toBeNull();
    expect(result.interviewSuccessRatePercent).toBeNull();
    expect(result.avgDaysToFirstInterview).toBeNull();
    expect(result.avgDaysToOffer).toBeNull();
  });
});

describe('computeSalaryAnalysis', () => {
  it('matches the doc\'s worked example range', () => {
    const result = computeSalaryAnalysis([220_000, 200_000], [{ min: 200_000, max: 250_000 }]);
    expect(result.minOfferedAed).toBe(200_000);
    expect(result.maxOfferedAed).toBe(220_000);
    expect(result.averageExpectedAed).toBe(225_000);
  });

  it('returns null fields when there is no data yet, rather than fabricating a figure', () => {
    const result = computeSalaryAnalysis([], []);
    expect(result.minOfferedAed).toBeNull();
    expect(result.maxOfferedAed).toBeNull();
    expect(result.averageExpectedAed).toBeNull();
  });
});

describe('compareOffers', () => {
  it('returns null when fewer than two offers exist', () => {
    expect(compareOffers([])).toBeNull();
    expect(compareOffers([{ id: 'a', salaryAed: 100, bonusPercent: null, leaveDays: null, visaSponsorship: false, growthRating: null }])).toBeNull();
  });

  it("matches the doc's example: higher salary + better growth wins, both reasons listed", () => {
    const result = compareOffers([
      { id: 'tech-corp', salaryAed: 220_000, bonusPercent: 15, leaveDays: 30, visaSponsorship: true, growthRating: 3 },
      { id: 'emirates-tech', salaryAed: 200_000, bonusPercent: 12, leaveDays: 30, visaSponsorship: true, growthRating: 2 },
    ]);
    expect(result?.recommendedOfferId).toBe('tech-corp');
    expect(result?.reasons).toContain('Higher salary');
    expect(result?.reasons).toContain('Better growth');
    expect(result?.reasons).toContain('Higher bonus');
    expect(result?.reasons).not.toContain('More leave days'); // tied, not a real advantage
  });
});
