import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentDetailPage from '@/pages/AgentDetailPage';
import { useJourneyState, type UseJourneyStateResult } from '@/domains/journey/api';
import { useMissionAlerts } from '@/domains/suggestions/useMissionAlerts';
import { useAuth } from '@/app/auth-context';
import { makeJourneyState } from '../domains/suggestions/testFixtures';

vi.mock('@/domains/journey/api', () => ({ useJourneyState: vi.fn() }));
vi.mock('@/domains/suggestions/useMissionAlerts', () => ({ useMissionAlerts: vi.fn() }));
vi.mock('@/app/auth-context', () => ({ useAuth: vi.fn() }));

const mockedUseJourneyState = vi.mocked(useJourneyState);
const mockedUseMissionAlerts = vi.mocked(useMissionAlerts);
const mockedUseAuth = vi.mocked(useAuth);

function mockResult(overrides: Partial<UseJourneyStateResult> = {}): UseJourneyStateResult {
  return { data: makeJourneyState(), isLoading: false, isError: false, refetch: vi.fn(), ...overrides };
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/agents/:agentId" element={<AgentDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AgentDetailPage', () => {
  beforeEach(() => {
    mockedUseJourneyState.mockReset();
    mockedUseMissionAlerts.mockReset().mockReturnValue({ suggestions: [], dismissAllShown: vi.fn() });
    mockedUseAuth.mockReset().mockReturnValue({
      user: { email: 'saravanan@example.com' } as never,
      session: null,
      isLoading: false,
      signUpWithPassword: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      requestPasswordReset: vi.fn(),
    });
  });

  it('has a back button that returns to the Agents hub', () => {
    mockedUseJourneyState.mockReturnValue(mockResult());
    renderAt('/agents/basecamp');
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('shows a friendly not-found state for an unknown agent id, with a way back', () => {
    mockedUseJourneyState.mockReturnValue(mockResult());
    renderAt('/agents/does-not-exist');
    expect(screen.getByText(/doesn't exist/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  it('renders the real title, status, and both real CTAs for Basecamp', () => {
    mockedUseJourneyState.mockReturnValue(
      mockResult({
        data: makeJourneyState({
          accommodation: { name: 'Deira Suite', address: 'Deira, Dubai', monthlyRentAed: 4500, checkOutDate: '2026-10-31' },
        }),
      }),
    );
    renderAt('/agents/basecamp');

    expect(screen.getByText('Agent 01 · Basecamp')).toBeInTheDocument();
    expect(screen.getByText('Deira Suite · paid to 2026-10-31')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage Lease' })).toHaveAttribute('href', '/travel');
    expect(screen.getByRole('link', { name: 'Visa & Residency →' })).toHaveAttribute('href', '/travel');
  });

  it('shows the real offer comparison and reasons for Arbitration, never a fabricated confidence score', () => {
    mockedUseJourneyState.mockReturnValue(
      mockResult({
        data: makeJourneyState({
          pendingOffers: [
            {
              id: 'offer-1',
              user_id: 'user-1',
              application_id: 'app-1',
              companyName: 'Tech Corp',
              salary_aed: 220_000,
              bonus_percent: 10,
              leave_days: 25,
              visa_sponsorship: true,
              visa_cost_responsibility: null,
              location: null,
              growth_rating: 3,
              received_date: '2026-09-10',
              status: 'pending',
              created_at: '2026-09-10T00:00:00Z',
            },
            {
              id: 'offer-2',
              user_id: 'user-1',
              application_id: 'app-2',
              companyName: 'Emirates Tech Holding',
              salary_aed: 200_000,
              bonus_percent: 5,
              leave_days: 20,
              visa_sponsorship: false,
              visa_cost_responsibility: null,
              location: null,
              growth_rating: 2,
              received_date: '2026-09-11',
              status: 'pending',
              created_at: '2026-09-11T00:00:00Z',
            },
          ],
        }),
      }),
    );
    renderAt('/agents/arbitration');

    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('RECOMMENDED')).toBeInTheDocument();
    expect(screen.queryByText(/CONFIDENCE/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Why: Higher salary/)).toBeInTheDocument();
  });

  it('renders the voice action as genuinely disabled for Voice Copilot', () => {
    mockedUseJourneyState.mockReturnValue(mockResult());
    renderAt('/agents/voice-copilot');
    expect(screen.getByRole('button', { name: 'Open Simulator' })).toBeDisabled();
  });
});
