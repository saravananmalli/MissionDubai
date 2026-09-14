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

  it('renders the page heading and the user identity in the header', () => {
    mockedUseJourneyState.mockReturnValue(mockResult());
    renderPage();
    expect(screen.getByRole('heading', { name: 'Specialized Mission Agents', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Saravanan')).toBeInTheDocument();
  });

  it('renders all five agents as tap-through tiles linking to their own detail page', () => {
    mockedUseJourneyState.mockReturnValue(mockResult());
    renderPage();

    const expected: [string, string][] = [
      ['Basecamp', '/agents/basecamp'],
      ['Scout Radar', '/agents/scout-radar'],
      ['Voice Copilot', '/agents/voice-copilot'],
      ['Treasury', '/agents/treasury'],
      ['Arbitration', '/agents/arbitration'],
    ];
    for (const [name, href] of expected) {
      const link = screen.getByRole('link', { name: new RegExp(name) });
      expect(link).toHaveAttribute('href', href);
    }
  });

  it('shows honest empty-state summaries when nothing has been logged yet', () => {
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
  });

  it('shows a notification badge and opens the real Mission Alerts drawer from the bell', () => {
    mockedUseJourneyState.mockReturnValue(mockResult());
    mockedUseMissionAlerts.mockReturnValue({
      suggestions: [
        { id: 's1', type: 'visa_expiring', title: 'Visa expiring soon', reason: 'Visa expires in 2 days.', icon: 'ShieldAlert', priority: 95, action: { kind: 'navigate', to: '/agents' }, dismissible: true },
      ],
      dismissAllShown: vi.fn(),
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));
    expect(screen.getByRole('heading', { name: 'Mission Alerts' })).toBeInTheDocument();
    expect(screen.getByText('Visa expiring soon')).toBeInTheDocument();
  });

  it('renders the hero voice action as genuinely disabled, not fake-interactive', () => {
    mockedUseJourneyState.mockReturnValue(mockResult());
    renderPage();
    expect(screen.getByRole('button', { name: /Command All Agents/ })).toBeDisabled();
  });
});
