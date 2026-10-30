import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CardImage, ErrorBox, Spinner } from '../../components/ui';
import { adminDeleteProduct, adminListProducts, adminToggleProduct } from '../../lib/admin';
import { formatPrice } from '../../lib/format';
import type { Product } from '../../lib/types';

export default function AdminProducts() {
  const [items, setItems] = useState<Product[] | null>(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => adminListProducts().then(setItems).catch((e: Error) => setErr(e.message)), []);
  useEffect(() => { void load(); }, [load]);

  async function run(p: Promise<void>) { setErr(null); try { await p; await load(); } catch (e) { setErr(e instanceof Error ? e.message : 'Failed.'); } }
  const shown = (items ?? []).filter((p) => !q.trim() || `${p.name} ${p.sku}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Search by name or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        <Link to="/admin/products/new" className="btn-primary">+ New card</Link>
      </div>
      {err && <ErrorBox message={err} />}
      {!items ? <Spinner /> : shown.map((p) => (
        <div key={p.id} className="card flex flex-wrap items-center gap-3 p-3">
          <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg"><CardImage product={p} className="h-full w-full text-[8px]" /></div>
          <div className="min-w-0 flex-1">
            <Link to={`/admin/products/${p.id}`} className="font-semibold hover:text-accent">{p.name}</Link>
            <div className="text-xs text-muted">{p.sku} · {formatPrice(p.effective_price_minor)} · {p.track_inventory ? `${p.stock_qty} in stock` : 'stock not tracked'}{p.is_sample ? ' · sample' : ''}</div>
          </div>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={p.is_active} onChange={(e) => run(adminToggleProduct(p.id, { is_active: e.target.checked }))} /> Active</label>
          <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={p.is_featured} onChange={(e) => run(adminToggleProduct(p.id, { is_featured: e.target.checked }))} /> Featured</label>
          <Link to={`/admin/products/${p.id}`} className="underline">Edit</Link>
          <button className="underline" onClick={() => { if (window.confirm(`Delete "${p.name}" permanently? Old orders keep their copy of the details.`)) void run(adminDeleteProduct(p.id)); }}>Delete</button>
        </div>
      ))}
    </div>
  );
}
