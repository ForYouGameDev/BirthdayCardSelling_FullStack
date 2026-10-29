import { useEffect, useState, type FormEvent } from 'react';
import { ErrorBox, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Account() {
  const { user, profile, isAdmin, updateProfile } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (profile) { setName(profile.full_name ?? ''); setPhone(profile.phone ?? ''); } }, [profile]);

  async function save(e: FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    try { await updateProfile({ full_name: name, phone }); setMsg('Saved.'); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not save.'); }
  }

  if (!profile) return <Spinner />;
  return (
    <form onSubmit={save} className="card mx-auto max-w-lg space-y-3 p-6">
      <h1 className="text-2xl font-extrabold">My account</h1>
      <p className="text-sm text-muted">{user?.email}{isAdmin ? ' · admin' : ''}</p>
      <div><label className="label" htmlFor="fn">Full name</label><input id="fn" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} /></div>
      <div><label className="label" htmlFor="ph">Phone</label><input id="ph" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} inputMode="tel" /></div>
      {err && <ErrorBox message={err} />}
      {msg && <p className="text-sm text-green-700 dark:text-green-300" role="status">{msg}</p>}
      <button className="btn-primary">Save</button>
      <p className="text-xs text-muted">Orders and addresses arrive in the next batch.</p>
    </form>
  );
}
