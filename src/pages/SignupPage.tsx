import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/app/auth-context';
import { PrimaryButton } from '@/components/Button';

export default function SignupPage() {
  const { session, signUpWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    const { error: signUpError, needsEmailConfirmation: mustConfirm } = await signUpWithPassword(email, password);
    setIsSubmitting(false);

    if (signUpError) {
      setError(signUpError);
      return;
    }

    if (mustConfirm) {
      setNeedsEmailConfirmation(true);
    }
    // Otherwise, signUp already produced a session: onAuthStateChange updates
    // `session` above, and this component re-renders into the redirect branch.
  }

  if (needsEmailConfirmation) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <span aria-hidden="true" className="h-1 w-10 rounded-full bg-cta" />
        <h1 className="font-sans text-2xl font-bold text-text-primary">Check your email</h1>
        <p className="text-ink-500">We sent a confirmation link to {email}. Confirm it, then log in.</p>
        <Link to="/login" className="text-sm text-ink-800 underline hover:text-gold-dark">
          Back to login
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-cta" />
          <h1 className="font-sans text-3xl font-bold text-text-primary">Create your account</h1>
          <p className="text-sm text-ink-500">Start tracking your Dubai job search.</p>
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-11 rounded-lg border border-ink-200 bg-cream px-3 py-2 text-ink-800 focus:border-gold-dark focus:outline-none focus:ring-1 focus:ring-gold-dark"
              aria-describedby="password-hint"
            />
            <span id="password-hint" className="text-xs text-ink-500">
              At least 8 characters.
            </span>
          </div>
          {error && (
            <p role="alert" className="text-sm text-terracotta-dark">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Sign up'}
          </PrimaryButton>
        </form>

        <Link to="/login" className="text-center text-sm text-ink-500 underline hover:text-gold-dark">
          Already have an account? Log in
        </Link>
      </div>
    </main>
  );
}
