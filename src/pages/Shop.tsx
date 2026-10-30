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
    <div className="space-y-7">
      <section className="rounded-[1.75rem] border border-line bg-surface px-6 py-8 sm:px-9 sm:py-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-accent">The happy place for thoughtful cards</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{q ? `Results for “${q}”` : 'The card collection'}</h1><p className="mt-2 text-sm text-muted">Find a design that says everything you want them to know.</p></div>
          <span className="text-3xl" aria-hidden="true">🎈</span>
        </div>
      </section>
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-3 sm:flex-row sm:items-center sm:p-4">
        <div className="mr-auto text-sm font-semibold text-muted">Make it a little more personal</div>
        <select className="input sm:w-auto sm:min-w-44" aria-label="Category" value={category} onChange={(e) => set('category', e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select className="input sm:w-auto sm:min-w-48" aria-label="Sort" value={sort} onChange={(e) => set('sort', e.target.value)}>
          {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </div>
      {err ? <ErrorBox message={err} /> : items === null ? <Spinner /> : items.length === 0 ? <Empty title="No cards found">Try another search or category.</Empty> : (
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
      )}
    </div>
  );
}
