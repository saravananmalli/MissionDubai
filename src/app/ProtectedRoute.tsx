import { Outlet } from 'react-router-dom';
import { useAuth } from '@/app/auth-context';

/** Holds the app until the silent personal sign-in has produced a session; offers a retry if it fails. */
export function ProtectedRoute() {
  const { session, isLoading, error, retry } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <p role="alert">Couldn’t open your account{error ? `: ${error}` : '.'}</p>
        <p className="text-sm text-ink-500">Check VITE_PERSONAL_EMAIL and VITE_PERSONAL_PASSWORD in .env.local, then retry.</p>
        <button type="button" onClick={retry} className="rounded-full border px-4 py-2 text-sm">
          Retry
        </button>
      </div>
    );
  }

  return <Outlet />;
}
