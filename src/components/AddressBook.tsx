import { useEffect, useState, type FormEvent } from 'react';
import { ErrorBox } from './ui';
import { useAuth } from '../context/AuthContext';
import { deleteAddress, listAddresses, saveAddress, setDefaultAddress } from '../lib/orders';
import { validateAddress } from '../lib/validation';
import type { Address, AddressInput } from '../lib/types';

const EMPTY: AddressInput = { label: '', full_name: '', phone: '', line1: '', line2: '', city: '', state: '', postal_code: '', country: 'IN' };

type Props = { selectable?: boolean; selectedId?: string | null; onSelect?: (a: Address | null) => void };

export default function AddressBook({ selectable, selectedId, onSelect }: Props) {
  const { user, profile } = useAuth();
  const [items, setItems] = useState<Address[] | null>(null);
  const [form, setForm] = useState<AddressInput | null>(null);
  const [editId, setEditId] = useState<string | undefined>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function reload(selectFirst = false) {
    try {
      const a = await listAddresses();
      setItems(a);
      if (selectable && onSelect && (selectFirst || !a.some((x) => x.id === selectedId))) onSelect(a.find((x) => x.is_default) ?? a[0] ?? null);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not load addresses.'); }
  }
  useEffect(() => { void reload(true); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  function openNew() { setEditId(undefined); setErrors({}); setForm({ ...EMPTY, full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' }); }
  function openEdit(a: Address) {
    setEditId(a.id); setErrors({});
    setForm({ label: a.label ?? '', full_name: a.full_name, phone: a.phone, line1: a.line1, line2: a.line2 ?? '', city: a.city, state: a.state, postal_code: a.postal_code, country: a.country });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form || !user) return;
    const v = validateAddress(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true); setErr(null);
    try {
      const saved = await saveAddress(user.id, form, editId);
      if (!editId && (items?.length ?? 0) === 0) await setDefaultAddress(user.id, saved.id);
      setForm(null);
      await reload();
      if (selectable && onSelect) onSelect(saved);
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not save the address.'); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this address?')) return;
    try { await deleteAddress(id); await reload(); } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not delete.'); }
  }

  const field = (k: keyof AddressInput, label: string, extra: { required?: boolean; inputMode?: 'tel' | 'numeric'; maxLength?: number } = {}) => (
    <div>
      <label className="label" htmlFor={`ad_${k}`}>{label}</label>
      <input id={`ad_${k}`} className="input" value={(form?.[k] as string) ?? ''} inputMode={extra.inputMode} maxLength={extra.maxLength ?? 120}
        onChange={(e) => setForm((f) => (f ? { ...f, [k]: e.target.value } : f))} />
      {errors[k] && <p className="err" role="alert">{errors[k]}</p>}
    </div>
  );

  return (
    <div className="space-y-3">
      {err && <ErrorBox message={err} />}
      {items === null ? <p className="text-muted">Loading addresses…</p> : items.length === 0 && !form ? <p className="text-muted">No saved addresses yet.</p> : null}
      {items?.map((a) => (
        <div key={a.id} className={`card p-3 ${selectable && selectedId === a.id ? 'border-accent ring-1 ring-accent' : ''}`}>
          <label className="flex cursor-pointer gap-3">
            {selectable && <input type="radio" name="address" className="mt-1" checked={selectedId === a.id} onChange={() => onSelect?.(a)} />}
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold">{a.full_name} {a.label && <span className="text-muted">· {a.label}</span>} {a.is_default && <span className="rounded-full bg-accent/10 px-2 text-xs text-accent">Default</span>}</div>
              <div className="text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postal_code}</div>
              <div className="text-muted">Phone: {a.phone}</div>
            </div>
          </label>
          <div className="mt-2 flex gap-3 text-sm">
            <button type="button" className="underline" onClick={() => openEdit(a)}>Edit</button>
            <button type="button" className="underline" onClick={() => remove(a.id)}>Delete</button>
            {!a.is_default && user && <button type="button" className="underline" onClick={() => setDefaultAddress(user.id, a.id).then(() => reload())}>Make default</button>}
          </div>
        </div>
      ))}
      {form ? (
        <form onSubmit={submit} className="card space-y-3 p-4">
          <h3 className="font-bold">{editId ? 'Edit address' : 'New address'}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {field('full_name', 'Full name')}
            {field('phone', 'Mobile number', { inputMode: 'tel', maxLength: 15 })}
          </div>
          {field('line1', 'House no., street')}
          {field('line2', 'Area, landmark (optional)')}
          <div className="grid gap-3 sm:grid-cols-3">
            {field('city', 'City')}
            {field('state', 'State')}
            {field('postal_code', 'PIN code', { inputMode: 'numeric', maxLength: 6 })}
          </div>
          {field('label', 'Label, e.g. Home (optional)', { maxLength: 30 })}
          <div className="flex gap-2">
            <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
            <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>
        </form>
      ) : <button type="button" className="btn-ghost" onClick={openNew}>+ Add new address</button>}
    </div>
  );
}
