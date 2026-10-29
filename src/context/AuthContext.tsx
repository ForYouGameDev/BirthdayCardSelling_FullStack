import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isConfigured, supabase } from '../lib/supabase';
import type { Profile } from '../lib/types';

type Ctx = {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Returns true when the account is ready, false when the person must confirm their email first. */
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateProfile: (p: { full_name: string; phone: string }) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

const base = () => `${window.location.origin}${import.meta.env.BASE_URL}`;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isConfigured);

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); }).catch(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const uid = session?.user.id ?? null;
  useEffect(() => {
    if (!uid) { setProfile(null); return; }
    let live = true;
    // The profile row is created by a database trigger; retry briefly in case it is a moment behind the first login.
    (async () => {
      for (let i = 0; i < 4 && live; i++) {
        const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
        if (data) { if (live) setProfile(data as Profile); return; }
        await new Promise((r) => setTimeout(r, 600));
      }
    })();
    return () => { live = false; };
  }, [uid]);

  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: base() } });
    if (error) throw new Error(error.message);
  }, []);
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  }, []);
  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() }, emailRedirectTo: base() } });
    if (error) throw new Error(error.message);
    return Boolean(data.session);
  }, []);
  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${base()}reset-password` });
    if (error) throw new Error(error.message);
  }, []);
  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
  }, []);
  const updateProfile = useCallback(async (p: { full_name: string; phone: string }) => {
    if (!uid) throw new Error('Please sign in.');
    const { data, error } = await supabase.from('profiles').update({ full_name: p.full_name.trim() || null, phone: p.phone.trim() || null }).eq('id', uid).select('*').single();
    if (error) throw new Error(error.message);
    setProfile(data as Profile);
  }, [uid]);
  const signOut = useCallback(async () => { await supabase.auth.signOut(); }, []);

  const value = useMemo<Ctx>(() => ({
    user: session?.user ?? null, profile, isAdmin: profile?.role === 'admin', loading,
    signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, updatePassword, updateProfile, signOut,
  }), [session, profile, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, updatePassword, updateProfile, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): Ctx {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}
