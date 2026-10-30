import { useEffect, useState, type FormEvent } from 'react';
import { ErrorBox, Spinner } from '../../components/ui';
import { adminSaveSettings } from '../../lib/admin';
import { minorToRupees, rupeesToMinor } from '../../lib/format';
import { getSettings } from '../../lib/orders';

export default function AdminSettings() {
  const [loaded, setLoaded] = useState(false);
  const [cod, setCod] = useState(true);
  const [rzp, setRzp] = useState(false);
  const [codFee, setCodFee] = useState('0');
  const [ship, setShip] = useState('49');
  const [free, setFree] = useState('499');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setCod(s.cod_enabled); setRzp(s.razorpay_enabled); setCodFee(minorToRupees(s.cod_fee_minor) || '0');
      setShip(minorToRupees(s.shipping_fee_minor) || '0'); setFree(minorToRupees(s.free_shipping_over_minor)); setLoaded(true);
    }).catch((e: Error) => setErr(e.message));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    const cf = rupeesToMinor(codFee); const sh = rupeesToMinor(ship); const fr = free.trim() === '' ? null : rupeesToMinor(free);
    if (cf == null || sh == null || (free.trim() !== '' && fr == null)) { setErr('Enter valid amounts in rupees, like 49 or 49.50.'); return; }
    try {
      await adminSaveSettings({ cod_enabled: cod, razorpay_enabled: rzp, cod_fee_minor: cf, shipping_fee_minor: sh, free_shipping_over_minor: fr });
      setMsg('Saved.');
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not save.'); }
  }

  if (!loaded) return err ? <ErrorBox message={err} /> : <Spinner />;
  return (
    <form onSubmit={save} className="card max-w-xl space-y-4 p-5">
      <h1 className="text-2xl font-extrabold">Store settings</h1>
      <label className="flex items-center gap-3"><input type="checkbox" checked={cod} onChange={(e) => setCod(e.target.checked)} /> Allow cash on delivery (COD)</label>
      <label className="flex items-center gap-3"><input type="checkbox" checked={rzp} onChange={(e) => setRzp(e.target.checked)} /> Allow online payment (Razorpay)</label>
      <p className="text-xs text-muted">Turn Razorpay on only after you have deployed the 3 payment functions and saved your Razorpay keys in Supabase (see the setup guide).</p>
      <div><label className="label" htmlFor="cf">COD fee (₹, 0 for none)</label><input id="cf" className="input" value={codFee} onChange={(e) => setCodFee(e.target.value)} inputMode="decimal" /></div>
      <div><label className="label" htmlFor="sh">Shipping fee (₹)</label><input id="sh" className="input" value={ship} onChange={(e) => setShip(e.target.value)} inputMode="decimal" /></div>
      <div><label className="label" htmlFor="fr">Free shipping on orders of (₹) — leave empty for never</label><input id="fr" className="input" value={free} onChange={(e) => setFree(e.target.value)} inputMode="decimal" /></div>
      {err && <ErrorBox message={err} />}
      {msg && <p className="text-sm text-green-700 dark:text-green-300" role="status">{msg}</p>}
      <button className="btn-primary">Save settings</button>
    </form>
  );
}
