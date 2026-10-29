import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorBox } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const { user, loading, updatePassword } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) { setErr('Password must be at least 8 characters.'); return; }
    setBusy(true); setErr(null);
    try { await updatePassword(pw); nav('/account', { replace: true }); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not update the password.'); }
    finally { setBusy(false); }
  }

  if (!loading && !user) return <div className="card mx-auto max-w-md p-6">This reset link is invalid or has expired. <Link className="underline" to="/login">Request a new one</Link>.</div>;
  return (
    <form onSubmit={submit} className="card mx-auto max-w-md space-y-3 p-6">
      <h1 className="text-2xl font-extrabold">Choose a new password</h1>
      <div><label className="label" htmlFor="npw">New password</label><input id="npw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} autoComplete="new-password" required /></div>
      {err && <ErrorBox message={err} />}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save password'}</button>
    </form>
  );
}
