import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/auth-context';
import { PrimaryButton } from '@/components/Button';

export default function ResetPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const { error: resetError } = await requestPasswordReset(email);
    setIsSubmitting(false);

    if (resetError) {
      setError(resetError);
      return;
    }
    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <span aria-hidden="true" className="h-1 w-10 rounded-full bg-cta" />
        <h1 className="font-sans text-2xl font-bold text-text-primary">Check your email</h1>
        <p className="text-ink-500">If an account exists for {email}, a password reset link is on its way.</p>
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
          <h1 className="font-sans text-3xl font-bold text-text-primary">Reset your password</h1>
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
          {error && (
            <p role="alert" className="text-sm text-terracotta-dark">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </PrimaryButton>
        </form>

        <Link to="/login" className="text-center text-sm text-ink-500 underline hover:text-gold-dark">
          Back to login
        </Link>
      </div>
    </main>
  );
}
