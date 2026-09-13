import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/auth-context';

export function ProtectedRoute() {
  const { session, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
