import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { listCategories, listProducts, type ProductQuery } from '../lib/api';
import { isConfigured } from '../lib/supabase';
import type { Category, Product } from '../lib/types';

const SORTS: { v: NonNullable<ProductQuery['sort']>; l: string }[] = [
  { v: 'new', l: 'Newest' }, { v: 'popular', l: 'Most popular' }, { v: 'price_asc', l: 'Price: low to high' }, { v: 'price_desc', l: 'Price: high to low' },
];

export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const category = sp.get('category') ?? '';
  const rawSort = sp.get('sort');
  const sort = SORTS.some((s) => s.v === rawSort) ? (rawSort as NonNullable<ProductQuery['sort']>) : 'new';
  const [cats, setCats] = useState<Category[]>([]);
  const [items, setItems] = useState<Product[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (isConfigured) listCategories().then(setCats).catch(() => undefined); }, []);
  useEffect(() => {
    if (!isConfigured) { setItems([]); return; }
    let live = true;
    setItems(null); setErr(null);
    listProducts({ q, category: category || undefined, sort })
      .then((r) => { if (live) setItems(r); })
      .catch((e: Error) => { if (live) setErr(e.message); });
    return () => { live = false; };
  }, [q, category, sort]);

  const set = (k: string, v: string) => { const n = new URLSearchParams(sp); if (v) n.set(k, v); else n.delete(k); setSp(n, { replace: true }); };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-3xl font-extrabold">{q ? `Results for “${q}”` : 'All cards'}</h1>
        <select className="input w-auto" aria-label="Category" value={category} onChange={(e) => set('category', e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="input w-auto" aria-label="Sort" value={sort} onChange={(e) => set('sort', e.target.value)}>
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>
      {err ? <ErrorBox message={err} /> : items === null ? <Spinner /> : items.length === 0 ? <Empty title="No cards found">Try another search or category.</Empty> : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}
    </div>
  );
}
