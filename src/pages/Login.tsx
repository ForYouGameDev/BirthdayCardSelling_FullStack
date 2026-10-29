import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBox } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { isConfigured } from '../lib/supabase';

type Mode = 'signin' | 'signup' | 'forgot';

export default function Login() {
  const { user, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = (loc.state as { from?: string } | null)?.from || '/';
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => { if (user) nav(from, { replace: true }); }, [user, from, nav]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setInfo(null);
    if (!isConfigured) { setErr('The site is not connected to Supabase yet.'); return; }
    if (mode !== 'forgot' && mode === 'signup' && password.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setBusy(true);
    try {
      if (mode === 'signin') await signInWithEmail(email, password);
      else if (mode === 'signup') {
        const ready = await signUpWithEmail(email, password, name);
        if (!ready) setInfo('Account created. Please check your email and click the confirmation link, then sign in.');
      } else {
        await sendPasswordReset(email);
        setInfo('If that email has an account, a reset link is on its way.');
      }
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setErr(null);
    try {
      // After Google, the browser returns to the site home. Remember where the person wanted to go.
      try { sessionStorage.setItem('after_login', from); } catch { /* ignore */ }
      await signInWithGoogle();
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Google sign-in failed.'); }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card space-y-4 p-6">
        <h1 className="text-2xl font-extrabold">{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create your account' : 'Reset password'}</h1>
        {mode !== 'forgot' && (
          <>
            <button type="button" className="btn-ghost w-full" onClick={google}>Continue with Google</button>
            <div className="text-center text-xs text-muted">or use email</div>
          </>
        )}
        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <div><label className="label" htmlFor="name">Full name</label><input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></div>
          )}
          <div><label className="label" htmlFor="email">Email</label><input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></div>
          {mode !== 'forgot' && (
            <div><label className="label" htmlFor="pw">Password</label><input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} required minLength={mode === 'signup' ? 8 : undefined} /></div>
          )}
          {err && <ErrorBox message={err} />}
          {info && <div className="rounded-xl border border-green-400 p-3 text-sm text-green-700 dark:text-green-300" role="status">{info}</div>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Send reset link'}</button>
        </form>
        <div className="flex justify-between text-sm">
          {mode === 'signin' ? (<><button className="underline" onClick={() => setMode('signup')}>Create account</button><button className="underline" onClick={() => setMode('forgot')}>Forgot password?</button></>)
            : <button className="underline" onClick={() => setMode('signin')}>Back to sign in</button>}
        </div>
      </div>
      <p className="mt-4 text-center text-sm text-muted"><Link to="/shop" className="underline">Keep browsing as guest</Link> — you only need an account to check out.</p>
    </div>
  );
}
