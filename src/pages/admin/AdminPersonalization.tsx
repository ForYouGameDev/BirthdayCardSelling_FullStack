import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ErrorBox, Spinner } from '../../components/ui';
import { adminDeleteField, adminListFields, adminListProducts, adminSaveField, type FieldInput } from '../../lib/admin';
import { minorToRupees, rupeesToMinor } from '../../lib/format';
import type { CustomizationField, FieldType, Product } from '../../lib/types';

type Form = { key: string; label: string; help_text: string; field_type: FieldType; is_enabled: boolean; is_required: boolean; max_length: string; options: string; max_mb: string; price: string; position: string };
const blank: Form = { key: '', label: '', help_text: '', field_type: 'text', is_enabled: true, is_required: false, max_length: '', options: '', max_mb: '5', price: '0', position: '1' };

export default function AdminPersonalization() {
  const [sp, setSp] = useSearchParams();
  const productId = sp.get('product') || '';
  const [products, setProducts] = useState<Product[]>([]);
  const [fields, setFields] = useState<CustomizationField[] | null>(null);
  const [form, setForm] = useState<Form>(blank);
  const [editId, setEditId] = useState<string | undefined>();
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { adminListProducts().then(setProducts).catch(() => undefined); }, []);
  const load = useCallback(() => adminListFields(productId || null).then(setFields).catch((e: Error) => setErr(e.message)), [productId]);
  useEffect(() => { setFields(null); void load(); }, [load]);

  function edit(f: CustomizationField) {
    setEditId(f.id);
    setForm({ key: f.key, label: f.label, help_text: f.help_text ?? '', field_type: f.field_type, is_enabled: f.is_enabled, is_required: f.is_required, max_length: f.max_length == null ? '' : String(f.max_length), options: f.options.join(', '), max_mb: String(f.max_file_bytes / 1048576), price: minorToRupees(f.extra_price_minor) || '0', position: String(f.position) });
  }

  async function save(e: FormEvent) {
    e.preventDefault(); setErr(null);
    const price = rupeesToMinor(form.price || '0');
    const maxLen = form.max_length.trim() === '' ? null : parseInt(form.max_length, 10);
    const mb = parseFloat(form.max_mb);
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(form.key)) { setErr('Key must be lowercase letters, numbers and _ (start with a letter), e.g. recipient_name.'); return; }
    if (!form.label.trim()) { setErr('Enter a label.'); return; }
    if (price == null) { setErr('Enter a valid extra price in rupees.'); return; }
    if (maxLen != null && (isNaN(maxLen) || maxLen < 1 || maxLen > 2000)) { setErr('Max length must be 1 to 2000.'); return; }
    if (form.field_type === 'photo' && (isNaN(mb) || mb <= 0 || mb > 10)) { setErr('Photo size must be between 0 and 10 MB.'); return; }
    const options = form.field_type === 'select' ? form.options.split(',').map((o) => o.trim()).filter(Boolean) : [];
    if (form.field_type === 'select' && options.length < 2) { setErr('A choice field needs at least 2 options, separated by commas.'); return; }
    const input: FieldInput = {
      scope: productId ? 'product' : 'global', product_id: productId || null, key: form.key, label: form.label.trim(), help_text: form.help_text.trim() || null,
      field_type: form.field_type, is_enabled: form.is_enabled, is_required: form.is_required,
      max_length: form.field_type === 'text' || form.field_type === 'textarea' ? maxLen : null,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'], max_file_bytes: Math.round((form.field_type === 'photo' ? mb : 5) * 1048576),
      options, extra_price_minor: price, position: parseInt(form.position, 10) || 0,
    };
    try { await adminSaveField(input, editId); setForm(blank); setEditId(undefined); await load(); }
    catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not save.'); }
  }
  async function del(f: CustomizationField) {
    if (!window.confirm(`Delete the "${f.label}" field?`)) return;
    try { await adminDeleteField(f.id); await load(); } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not delete.'); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-extrabold">Personalisation fields</h1>
        <select className="input w-auto" aria-label="Scope" value={productId} onChange={(e) => { const n = new URLSearchParams(); if (e.target.value) n.set('product', e.target.value); setSp(n); setEditId(undefined); setForm(blank); }}>
          <option value="">All cards (global)</option>
          {products.map((p) => <option key={p.id} value={p.id}>Only: {p.name}</option>)}
        </select>
      </div>
      <p className="text-sm text-muted">{productId ? 'A field here replaces the global field with the same key for this card only. To hide a global field on this card, add it with the same key and untick "Enabled".' : 'These fields appear on every card that has personalisation switched on.'}</p>
      {err && <ErrorBox message={err} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-2">
          {!fields ? <Spinner /> : fields.length === 0 ? <p className="text-muted">No fields here yet.</p> : fields.map((f) => (
            <div key={f.id} className="card flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1 text-sm"><b>{f.label}</b> <span className="text-muted">({f.key}, {f.field_type}) {f.is_required ? '· required' : '· optional'} {f.is_enabled ? '' : '· OFF'} {f.extra_price_minor ? `· +₹${minorToRupees(f.extra_price_minor)}` : ''}</span></div>
              <button className="underline" onClick={() => edit(f)}>Edit</button><button className="underline" onClick={() => del(f)}>Delete</button>
            </div>
          ))}
        </div>
        <form onSubmit={save} className="card h-fit space-y-3 p-4">
          <h2 className="font-bold">{editId ? 'Edit field' : 'New field'}</h2>
          <div><label className="label" htmlFor="fk">Key (no spaces)</label><input id="fk" className="input" disabled={Boolean(editId)} value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="recipient_name" /></div>
          <div><label className="label" htmlFor="fl">Label shown to customer</label><input id="fl" className="input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
          <div><label className="label" htmlFor="fh">Help text</label><input id="fh" className="input" value={form.help_text} onChange={(e) => setForm({ ...form, help_text: e.target.value })} /></div>
          <div><label className="label" htmlFor="ft">Type</label>
            <select id="ft" className="input" value={form.field_type} onChange={(e) => setForm({ ...form, field_type: e.target.value as FieldType })}><option value="text">Short text</option><option value="textarea">Long text</option><option value="select">Choice list</option><option value="photo">Photo upload</option></select></div>
          {(form.field_type === 'text' || form.field_type === 'textarea') && <div><label className="label" htmlFor="fm">Max characters</label><input id="fm" className="input" inputMode="numeric" value={form.max_length} onChange={(e) => setForm({ ...form, max_length: e.target.value })} /></div>}
          {form.field_type === 'select' && <div><label className="label" htmlFor="fo">Options (comma separated)</label><input id="fo" className="input" value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} /></div>}
          {form.field_type === 'photo' && <div><label className="label" htmlFor="fb">Max photo size (MB)</label><input id="fb" className="input" inputMode="decimal" value={form.max_mb} onChange={(e) => setForm({ ...form, max_mb: e.target.value })} /></div>}
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label" htmlFor="fp">Extra price (₹)</label><input id="fp" className="input" inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
            <div><label className="label" htmlFor="fn">Display order</label><input id="fn" className="input" inputMode="numeric" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} /></div>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_enabled} onChange={(e) => setForm({ ...form, is_enabled: e.target.checked })} /> Enabled</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_required} onChange={(e) => setForm({ ...form, is_required: e.target.checked })} /> Required</label>
          <div className="flex gap-2"><button className="btn-primary">Save</button>{editId && <button type="button" className="btn-ghost" onClick={() => { setEditId(undefined); setForm(blank); }}>Cancel</button>}</div>
        </form>
      </div>
    </div>
  );
}
