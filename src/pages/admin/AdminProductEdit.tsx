import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorBox, Spinner } from '../../components/ui';
import {
  adminAddTier, adminAddVariant, adminDeleteProductImage, adminDeleteTier, adminDeleteVariant, adminGetProduct, adminListCategories,
  adminSaveProduct, adminUploadProductImage, type ProductInput,
} from '../../lib/admin';
import { formatPrice, minorToRupees, rupeesToMinor, slugify } from '../../lib/format';
import { imageUrl } from '../../lib/supabase';
import type { Category, Product } from '../../lib/types';

type Form = {
  name: string; sku: string; slug: string; description: string; category_id: string; product_type: 'physical' | 'digital' | 'both';
  price: string; sale: string; track_inventory: boolean; stock_qty: string; is_active: boolean; is_featured: boolean;
  personalization_enabled: boolean; dmin: string; dmax: string;
};
const blank: Form = { name: '', sku: '', slug: '', description: '', category_id: '', product_type: 'physical', price: '', sale: '', track_inventory: true, stock_qty: '0', is_active: true, is_featured: false, personalization_enabled: true, dmin: '', dmax: '' };

export default function AdminProductEdit() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const nav = useNavigate();
  const [form, setForm] = useState<Form>(blank);
  const [cats, setCats] = useState<Category[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ label: '', size: '', finish: '', paper: '', delta: '0', stock: '' });
  const [tier, setTier] = useState({ qty: '', price: '' });

  const load = useCallback(async () => {
    if (isNew || !id) return;
    const p = await adminGetProduct(id);
    setProduct(p);
    setForm({
      name: p.name, sku: p.sku, slug: p.slug, description: p.description ?? '', category_id: p.category_id ?? '', product_type: p.product_type,
      price: minorToRupees(p.price_minor), sale: minorToRupees(p.sale_price_minor), track_inventory: p.track_inventory, stock_qty: String(p.stock_qty),
      is_active: p.is_active, is_featured: p.is_featured, personalization_enabled: p.personalization_enabled,
      dmin: p.delivery_min_days == null ? '' : String(p.delivery_min_days), dmax: p.delivery_max_days == null ? '' : String(p.delivery_max_days),
    });
  }, [id, isNew]);

  useEffect(() => {
    adminListCategories().then(setCats).catch(() => undefined);
    load().catch((e: Error) => setErr(e.message)).finally(() => setLoading(false));
  }, [load]);

  const set = <K extends keyof Form>(k: K, val: Form[K]) => setForm((f) => ({ ...f, [k]: val }));

  async function save(e: FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    const price = rupeesToMinor(form.price);
    const sale = form.sale.trim() === '' ? null : rupeesToMinor(form.sale);
    if (!form.name.trim() || !form.sku.trim()) { setErr('Name and SKU are required.'); return; }
    if (price == null) { setErr('Enter the price in rupees, like 149 or 149.50.'); return; }
    if (form.sale.trim() !== '' && (sale == null || sale >= price)) { setErr('Sale price must be a valid amount lower than the price.'); return; }
    const stock = parseInt(form.stock_qty, 10);
    if (!Number.isInteger(stock) || stock < 0) { setErr('Stock must be 0 or more.'); return; }
    const dmin = form.dmin.trim() === '' ? null : parseInt(form.dmin, 10);
    const dmax = form.dmax.trim() === '' ? null : parseInt(form.dmax, 10);
    if ((dmin != null && (isNaN(dmin) || dmin < 0)) || (dmax != null && (isNaN(dmax) || dmax < (dmin ?? 0)))) { setErr('Delivery days: max must not be lower than min.'); return; }
    const input: ProductInput = {
      sku: form.sku.trim(), slug: slugify(form.slug || form.name), name: form.name.trim(), description: form.description.trim() || null,
      category_id: form.category_id || null, product_type: form.product_type, price_minor: price, sale_price_minor: sale,
      track_inventory: form.track_inventory, stock_qty: stock, is_active: form.is_active, is_featured: form.is_featured,
      personalization_enabled: form.personalization_enabled, delivery_min_days: dmin, delivery_max_days: dmax,
    };
    setBusy(true);
    try {
      const saved = await adminSaveProduct(input, isNew ? undefined : id);
      if (isNew) nav(`/admin/products/${saved.id}`, { replace: true });
      else { setMsg('Saved.'); await load(); }
    } catch (ex) { setErr(ex instanceof Error ? ex.message : 'Could not save.'); }
    finally { setBusy(false); }
  }

  async function act(fn: () => Promise<void>) { setErr(null); try { await fn(); await load(); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed.'); } }

  if (loading) return <Spinner />;
  const images = [...(product?.product_images ?? [])].sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Link to="/admin/products" className="underline">← Products</Link><h1 className="text-2xl font-extrabold">{isNew ? 'New card' : form.name}</h1></div>
      {err && <ErrorBox message={err} />}
      <form onSubmit={save} className="card grid gap-3 p-4 md:grid-cols-2">
        <div><label className="label" htmlFor="pn">Name</label><input id="pn" className="input" value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div><label className="label" htmlFor="ps">SKU</label><input id="ps" className="input" value={form.sku} onChange={(e) => set('sku', e.target.value)} /></div>
        <div><label className="label" htmlFor="pu">URL name (auto if empty)</label><input id="pu" className="input" value={form.slug} onChange={(e) => set('slug', e.target.value)} /></div>
        <div><label className="label" htmlFor="pc">Category</label>
          <select id="pc" className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">None</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
        <div className="md:col-span-2"><label className="label" htmlFor="pd">Description</label><textarea id="pd" rows={3} className="input" value={form.description} onChange={(e) => set('description', e.target.value)} /></div>
        <div><label className="label" htmlFor="pp">Price (₹)</label><input id="pp" className="input" inputMode="decimal" value={form.price} onChange={(e) => set('price', e.target.value)} /></div>
        <div><label className="label" htmlFor="pq">Sale price (₹, optional)</label><input id="pq" className="input" inputMode="decimal" value={form.sale} onChange={(e) => set('sale', e.target.value)} /></div>
        <div><label className="label" htmlFor="pt">Type</label>
          <select id="pt" className="input" value={form.product_type} onChange={(e) => set('product_type', e.target.value as Form['product_type'])}><option value="physical">Physical (shipped)</option><option value="digital">Digital (sent by message)</option><option value="both">Both</option></select></div>
        <div><label className="label" htmlFor="pk">Stock</label><input id="pk" className="input" inputMode="numeric" disabled={!form.track_inventory} value={form.stock_qty} onChange={(e) => set('stock_qty', e.target.value)} /></div>
        <div><label className="label" htmlFor="d1">Delivery min days</label><input id="d1" className="input" inputMode="numeric" value={form.dmin} onChange={(e) => set('dmin', e.target.value)} /></div>
        <div><label className="label" htmlFor="d2">Delivery max days</label><input id="d2" className="input" inputMode="numeric" value={form.dmax} onChange={(e) => set('dmax', e.target.value)} /></div>
        <div className="flex flex-wrap gap-4 md:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.track_inventory} onChange={(e) => set('track_inventory', e.target.checked)} /> Track stock</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Active (visible)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> Featured on home</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.personalization_enabled} onChange={(e) => set('personalization_enabled', e.target.checked)} /> Allow personalisation</label>
        </div>
        <div className="flex items-center gap-3 md:col-span-2"><button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create card' : 'Save changes'}</button>{msg && <span className="text-sm text-green-700 dark:text-green-300" role="status">{msg}</span>}</div>
      </form>

      {isNew ? <p className="text-sm text-muted">Save the card first, then add photos, options and bulk prices.</p> : product && (
        <>
          <section className="card space-y-3 p-4">
            <h2 className="font-bold">Photos</h2>
            <div className="flex flex-wrap gap-3">
              {images.map((im) => (
                <div key={im.id} className="relative h-28 w-24 overflow-hidden rounded-xl border border-line">
                  <img src={imageUrl(im.path)} alt="" className="h-full w-full object-cover" />
                  <button className="absolute right-1 top-1 rounded-full bg-black/70 px-2 text-xs text-white" onClick={() => act(() => adminDeleteProductImage(im.id, im.path))} aria-label="Delete photo">✕</button>
                </div>
              ))}
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void act(() => adminUploadProductImage(product.id, f, images.length)); }} />
            <p className="text-xs text-muted">JPG, PNG or WEBP, up to 5 MB. The first photo is the main one.</p>
          </section>

          <section className="card space-y-3 p-4">
            <h2 className="font-bold">Options (size, finish, paper)</h2>
            {(product.product_variants ?? []).map((x) => (
              <div key={x.id} className="flex items-center gap-3 text-sm"><span className="flex-1">{x.label} · {x.price_delta_minor ? `+${formatPrice(x.price_delta_minor)}` : 'no extra charge'}{x.stock_qty != null ? ` · stock ${x.stock_qty}` : ''}</span><button className="underline" onClick={() => act(() => adminDeleteVariant(x.id))}>Remove</button></div>
            ))}
            <div className="grid gap-2 sm:grid-cols-6">
              <input className="input sm:col-span-2" placeholder="Label, e.g. A5 Glossy" value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} />
              <input className="input" placeholder="Size" value={v.size} onChange={(e) => setV({ ...v, size: e.target.value })} />
              <input className="input" placeholder="Extra ₹" inputMode="decimal" value={v.delta} onChange={(e) => setV({ ...v, delta: e.target.value })} />
              <input className="input" placeholder="Stock (optional)" inputMode="numeric" value={v.stock} onChange={(e) => setV({ ...v, stock: e.target.value })} />
              <button className="btn-ghost" onClick={() => act(async () => {
                const d = rupeesToMinor(v.delta || '0'); const st = v.stock.trim() === '' ? null : parseInt(v.stock, 10);
                if (!v.label.trim() || d == null || (st != null && (isNaN(st) || st < 0))) throw new Error('Enter a label, a valid extra amount and (optional) stock.');
                await adminAddVariant({ product_id: product.id, label: v.label.trim(), size: v.size.trim() || null, finish: v.finish || null, paper: v.paper || null, price_delta_minor: d, stock_qty: st, is_active: true, position: (product.product_variants?.length ?? 0) + 1 });
                setV({ label: '', size: '', finish: '', paper: '', delta: '0', stock: '' });
              })}>Add</button>
            </div>
          </section>

          <section className="card space-y-3 p-4">
            <h2 className="font-bold">Bulk prices (cheaper per card at higher quantity)</h2>
            {(product.product_price_tiers ?? []).map((t) => (
              <div key={t.id} className="flex items-center gap-3 text-sm"><span className="flex-1">{t.min_qty}+ cards: {formatPrice(t.unit_price_minor)} each</span><button className="underline" onClick={() => act(() => adminDeleteTier(t.id))}>Remove</button></div>
            ))}
            <div className="grid gap-2 sm:grid-cols-3">
              <input className="input" placeholder="From quantity (2 or more)" inputMode="numeric" value={tier.qty} onChange={(e) => setTier({ ...tier, qty: e.target.value })} />
              <input className="input" placeholder="Price each ₹" inputMode="decimal" value={tier.price} onChange={(e) => setTier({ ...tier, price: e.target.value })} />
              <button className="btn-ghost" onClick={() => act(async () => {
                const q = parseInt(tier.qty, 10); const p = rupeesToMinor(tier.price);
                if (!Number.isInteger(q) || q < 2 || p == null) throw new Error('Enter a quantity of 2 or more and a valid price.');
                await adminAddTier({ product_id: product.id, min_qty: q, unit_price_minor: p });
                setTier({ qty: '', price: '' });
              })}>Add</button>
            </div>
          </section>
          <p className="text-sm text-muted">Personalisation fields for this card (required, price, hide a global field) are managed in <Link className="underline" to={`/admin/personalization?product=${product.id}`}>Personalisation</Link>.</p>
        </>
      )}
    </div>
  );
}
