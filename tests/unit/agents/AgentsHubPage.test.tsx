import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AgentsHubPage from '@/pages/AgentsHubPage';
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

function renderPage() {
  return render(
    <MemoryRouter>
      <AgentsHubPage />
    </MemoryRouter>,
  );
}

describe('AgentsHubPage', () => {
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

  it('shows a loading state', () => {
    mockedUseJourneyState.mockReturnValue(mockResult({ isLoading: true }));
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });

  it('shows an error state with a working retry', () => {
    const refetch = vi.fn();
    mockedUseJourneyState.mockReturnValue(mockResult({ isError: true, refetch }));
    renderPage();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders all five agent cards with real data and working navigation buttons', () => {
    mockedUseJourneyState.mockReturnValue(
      mockResult({
        data: makeJourneyState({
          accommodation: { name: 'Deira Suite', address: 'Deira, Dubai', monthlyRentAed: 4500, checkOutDate: '2026-10-31' },
        }),
      }),
    );
    renderPage();

    expect(screen.getByRole('heading', { name: 'Specialized Mission Agents', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Agent 01 · Basecamp')).toBeInTheDocument();
    expect(screen.getByText('Deira Suite · paid to 2026-10-31')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage Lease' })).toHaveAttribute('href', '/travel#lease');
    expect(screen.getByRole('link', { name: 'Visa & Residency →' })).toHaveAttribute('href', '/travel#visa');
    expect(screen.getByRole('link', { name: 'Log Application' })).toHaveAttribute('href', '/applications?action=add');
  });

  it("gives each card's two buttons genuinely different destinations, not the same page twice", () => {
    mockedUseJourneyState.mockReturnValue(
      mockResult({
        data: makeJourneyState({
          pendingOffers: [
            { id: 'o1', user_id: 'u1', application_id: 'a1', companyName: 'A', salary_aed: 1, bonus_percent: null, leave_days: null, visa_sponsorship: false, visa_cost_responsibility: null, location: null, growth_rating: null, received_date: '2026-09-10', status: 'pending', created_at: '2026-09-10T00:00:00Z' },
            { id: 'o2', user_id: 'u1', application_id: 'a2', companyName: 'B', salary_aed: 2, bonus_percent: null, leave_days: null, visa_sponsorship: false, visa_cost_responsibility: null, location: null, growth_rating: null, received_date: '2026-09-10', status: 'pending', created_at: '2026-09-10T00:00:00Z' },
          ],
        }),
      }),
    );
    renderPage();

    expect(screen.getByRole('link', { name: 'Manage Lease' })).toHaveAttribute('href', '/travel#lease');
    expect(screen.getByRole('link', { name: 'Visa & Residency →' })).toHaveAttribute('href', '/travel#visa');
    expect(screen.getByRole('link', { name: /View Pipeline/ })).toHaveAttribute('href', '/applications');
    expect(screen.getByRole('link', { name: 'Log Application' })).toHaveAttribute('href', '/applications?action=add');
    expect(screen.getByRole('link', { name: /Compare Offers/ })).toHaveAttribute('href', '/analytics');
    expect(screen.getByRole('link', { name: /Review & Decide/ })).toHaveAttribute('href', '/analytics#recommendation');
  });

  it('shows honest empty states with real CTAs when nothing has been logged yet', () => {
    mockedUseJourneyState.mockReturnValue(
      mockResult({
        data: makeJourneyState({
          hasAnyData: false,
          accommodation: null,
          visa: null,
          applications: { total: 0, funnel: [], daysSinceLastApplication: null },
          nextInterview: null,
          budget: null,
          pendingOffers: [],
        }),
      }),
    );
    renderPage();

    expect(screen.getByText('No accommodation logged yet.')).toBeInTheDocument();
    expect(screen.getByText('No applications logged yet.')).toBeInTheDocument();
    expect(screen.getByText('No interview scheduled yet.')).toBeInTheDocument();
    expect(screen.getByText('No budget set yet.')).toBeInTheDocument();
    expect(screen.getByText('No offers yet — keep applying.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Keep Applying' })).toHaveAttribute('href', '/applications');
  });

  it('never fabricates a confidence score — only shows real compareOffers reasons for 2+ offers', () => {
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
    renderPage();

    expect(screen.getByText('Tech Corp', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('RECOMMENDED')).toBeInTheDocument();
    expect(screen.queryByText(/CONFIDENCE/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Why: Higher salary/)).toBeInTheDocument();
  });

  it('opens a real, working Mission Copilot modal from the hero voice button', () => {
    mockedUseJourneyState.mockReturnValue(mockResult());
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Command All Agents/ }));
    expect(screen.getByText('Mission Copilot')).toBeInTheDocument();
    // The modal opens with a real reply grounded in the mocked journey state, not a placeholder.
    expect(screen.getByText(/Day 43 of 60/)).toBeInTheDocument();
  });

  it('opens the Copilot modal focused on interviews from the Voice Copilot card, and lets you send a message', () => {
    mockedUseJourneyState.mockReturnValue(
      mockResult({
        data: makeJourneyState({
          nextInterview: { id: 'i1', companyName: 'Tech Corp', positionTitle: 'Engineer', interviewDate: '2026-09-15', interviewTime: '14:00', hoursUntil: 6 },
        }),
      }),
    );
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Open Simulator' }));
    expect(screen.getByText(/Your next interview is with Tech Corp/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Ask Copilot'), { target: { value: "what's my budget?" } });
    fireEvent.click(screen.getByLabelText('Send'));
    expect(screen.getByText(/You've spent/)).toBeInTheDocument();
  });
});
