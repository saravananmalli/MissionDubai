import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { AuthContext, type AuthContextValue } from '@/app/auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    isLoading,
    async signUpWithPassword(email, password) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return { error: error.message, needsEmailConfirmation: false };
      }
      // If email confirmation is required, signUp succeeds but returns no session.
      return { error: null, needsEmailConfirmation: data.session === null };
    },
    async signInWithPassword(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
    async requestPasswordReset(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
