import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/app/AppShell';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';

// Route-level code splitting: Recharts (Financial Report) and react-day-picker
// (Interview Calendar) are large enough on their own to be worth keeping out
// of the initial bundle, and splitting every protected page this way is the
// same pattern applied consistently rather than special-cased per page.
const AiHomePage = lazy(() => import('@/pages/AiHomePage'));
const AgentsHubPage = lazy(() => import('@/pages/AgentsHubPage'));
const TravelPage = lazy(() => import('@/pages/TravelPage'));
const ApplicationsPage = lazy(() => import('@/pages/ApplicationsPage'));
const ApplicationDetailPage = lazy(() => import('@/pages/ApplicationDetailPage'));
const MapPage = lazy(() => import('@/pages/MapPage'));
const PhotoGalleryPage = lazy(() => import('@/pages/PhotoGalleryPage'));
const InterviewCalendarPage = lazy(() => import('@/pages/InterviewCalendarPage'));
const InterviewDetailsPage = lazy(() => import('@/pages/InterviewDetailsPage'));
const ExpensesPage = lazy(() => import('@/pages/ExpensesPage'));
const FinancialReportPage = lazy(() => import('@/pages/FinancialReportPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));

function withSuspense(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <main className="px-4 py-6">
          <p role="status">Loading…</p>
        </main>
      }
    >
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: '/', element: withSuspense(<AiHomePage />) },
          { path: '/agents', element: withSuspense(<AgentsHubPage />) },
          { path: '/travel', element: withSuspense(<TravelPage />) },
          { path: '/applications', element: withSuspense(<ApplicationsPage />) },
          { path: '/applications/:applicationId', element: withSuspense(<ApplicationDetailPage />) },
          { path: '/map', element: withSuspense(<MapPage />) },
          { path: '/photos', element: withSuspense(<PhotoGalleryPage />) },
          { path: '/interviews', element: withSuspense(<InterviewCalendarPage />) },
          { path: '/interviews/:interviewId', element: withSuspense(<InterviewDetailsPage />) },
          { path: '/expenses', element: withSuspense(<ExpensesPage />) },
          { path: '/financial-report', element: withSuspense(<FinancialReportPage />) },
          { path: '/analytics', element: withSuspense(<AnalyticsPage />) },
        ],
      },
    ],
  },
]);
