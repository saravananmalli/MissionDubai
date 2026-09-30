import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { env } from '@/lib/env';
import { AuthContext, type AuthContextValue } from '@/app/auth-context';

/**
 * Personal-use app: there is no login screen. Data is still protected by
 * Supabase Row Level Security, so the app silently signs in to the owner's
 * single account (credentials from .env.local) and reuses the stored session.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function ensureSession() {
      setIsLoading(true);
      setError(null);
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (!cancelled) setSession(data.session);
          return;
        }
        const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({
          email: env.VITE_PERSONAL_EMAIL,
          password: env.VITE_PERSONAL_PASSWORD,
        });
        if (cancelled) return;
        if (signInError) setError(signInError.message);
        else setSession(signedIn.session);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not reach the server.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void ensureSession();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const value: AuthContextValue = { session, user: session?.user ?? null, isLoading, error, retry };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
