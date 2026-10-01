import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/app/AppShell';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { PageSkeleton } from '@/components/Skeleton';

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
const OverallAnalyticsPage = lazy(() => import('@/pages/OverallAnalyticsPage'));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));

function withSuspense(element: ReactNode) {
  return (
    <Suspense
      fallback={<PageSkeleton />}
    >
      {element}
    </Suspense>
  );
}

export const router = createBrowserRouter([
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
          { path: '/overall-analytics', element: withSuspense(<OverallAnalyticsPage />) },
          { path: '/analytics', element: withSuspense(<AnalyticsPage />) },
        ],
      },
    ],
  },
]);
