import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type SignInMethod = 'email' | 'username';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  recovering: boolean;
  signIn: (identifier: string, password: string, method: SignInMethod) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Supabase strips the recovery tokens from the address once it signs the user in,
// so the link type has to be captured before the client has a chance to do that.
const arrivedFromRecoveryLink = window.location.hash.includes('type=recovery');

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(arrivedFromRecoveryLink);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  // Generic failure text only: the provider's message distinguishes "no such
  // account" from "wrong password", which lets anyone enumerate staff emails.
  const signIn = useCallback(async (identifier: string, password: string, method: SignInMethod) => {
    const failure = method === 'username' ? 'Incorrect username or password.' : 'Incorrect email or password.';
    let email = identifier;
    if (method === 'username') {
      const { data, error } = await supabase.rpc('resolve_username_email', { p_username: identifier });
      if (error) console.error('Username lookup failed:', error.message);
      if (error || !data) return { error: failure };
      email = data;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Sign-in failed:', error.message);
      return { error: failure };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading, recovering, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
