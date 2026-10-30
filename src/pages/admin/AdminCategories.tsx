import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ErrorBox, Spinner } from '../../components/ui';
import { adminDeleteCategory, adminListCategories, adminSaveCategory } from '../../lib/admin';
import { slugify } from '../../lib/format';

type Cat = Awaited<ReturnType<typeof adminListCategories>>[number];
const blank = { name: '', slug: '', description: '', sort_order: '0', is_active: true };

export default function AdminCategories() {
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<string | undefined>();
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => adminListCategories().then(setCats).catch((e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); }, [load]);

  async function save(e: FormEvent) {
    e.preventDefault(); setErr(null);
    const slug = slugify(form.slug || form.name);
    if (!form.name.trim() || !slug) { setErr('Enter a name.'); return; }
    try {
      await adminSaveCategory({ name: form.name.trim(), slug, description: form.description.trim() || null, sort_order: parseInt(form.sort_order, 10) || 0, is_active: form.is_active }, editId);
      setForm(blank); setEditId(undefined); await load();
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not save.'); }
  }
  async function del(c: Cat) {
    if (!window.confirm(`Delete "${c.name}"? Its cards will become uncategorised.`)) return;
    try { await adminDeleteCategory(c.id); await load(); } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not delete.'); }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_20rem]">
      <div className="space-y-2">
        {err && <ErrorBox message={err} />}
        {!cats ? <Spinner /> : cats.map((c) => (
          <div key={c.id} className="card flex items-center gap-3 p-3">
            <div className="flex-1"><b>{c.name}</b> <span className="text-sm text-muted">/{c.slug} · order {c.sort_order}{c.is_active ? '' : ' · hidden'}</span></div>
            <button className="underline" onClick={() => { setEditId(c.id); setForm({ name: c.name, slug: c.slug, description: c.description ?? '', sort_order: String(c.sort_order), is_active: c.is_active }); }}>Edit</button>
            <button className="underline" onClick={() => del(c)}>Delete</button>
          </div>
        ))}
      </div>
      <form onSubmit={save} className="card h-fit space-y-3 p-4">
        <h2 className="font-bold">{editId ? 'Edit category' : 'New category'}</h2>
        <div><label className="label" htmlFor="cn">Name</label><input id="cn" className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><label className="label" htmlFor="cs">URL name (auto if empty)</label><input id="cs" className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
        <div><label className="label" htmlFor="cd">Description</label><input id="cd" className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><label className="label" htmlFor="co">Display order</label><input id="co" className="input" inputMode="numeric" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
        <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Visible in shop</label>
        <div className="flex gap-2"><button className="btn-primary">Save</button>{editId && <button type="button" className="btn-ghost" onClick={() => { setEditId(undefined); setForm(blank); }}>Cancel</button>}</div>
      </form>
    </div>
  );
}
