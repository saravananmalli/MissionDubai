import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/auth-context';
import { PrimaryButton } from '@/components/Button';

export default function LoginPage() {
  const { session, signInWithPassword } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (session) {
    const from = (location.state as { from?: Location } | null)?.from;
    return <Navigate to={from?.pathname ?? '/'} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error: signInError } = await signInWithPassword(email, password);
    setIsSubmitting(false);
    if (signInError) {
      setError(signInError);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-cta" />
          <h1 className="font-sans text-3xl font-bold text-text-primary">MissionDubai</h1>
          <p className="text-sm text-ink-500">Welcome back — log in to continue your journey.</p>
        </div>

        <form
          className="flex flex-col gap-4 rounded-2xl border border-ink-100 bg-cream-100 p-6 shadow-sm"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-11 rounded-lg border border-ink-200 bg-cream px-3 py-2 text-ink-800 focus:border-gold-dark focus:outline-none focus:ring-1 focus:ring-gold-dark"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11 rounded-lg border border-ink-200 bg-cream px-3 py-2 text-ink-800 focus:border-gold-dark focus:outline-none focus:ring-1 focus:ring-gold-dark"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-terracotta-dark">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </PrimaryButton>
        </form>

        <div className="flex flex-col items-center gap-2 text-sm text-ink-500">
          <Link to="/reset-password" className="underline hover:text-gold-dark">
            Forgot password?
          </Link>
          <span>
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-ink-800 underline hover:text-gold-dark">
              Sign up
            </Link>
          </span>
        </div>
      </div>
    </main>
  );
}
