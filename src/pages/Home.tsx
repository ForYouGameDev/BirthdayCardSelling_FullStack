import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ErrorBox, Spinner } from '../components/ui';
import { listCategories, listProducts } from '../lib/api';
import { isConfigured, SITE_NAME } from '../lib/supabase';
import type { Category, Product } from '../lib/types';

export default function Home() {
  const [featured, setFeatured] = useState<Product[] | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured) { setFeatured([]); return; }
    Promise.all([listProducts({ featured: true, limit: 8 }), listCategories()])
      .then(([p, c]) => { setFeatured(p); setCats(c); })
      .catch((e: Error) => setErr(e.message));
  }, []);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl p-8 text-white sm:p-14" style={{ background: 'linear-gradient(135deg, #d63f6d, #ff9a5c)' }}>
        <h1 className="max-w-xl text-4xl font-extrabold sm:text-5xl">Cards that make birthdays feel special</h1>
        <p className="mt-3 max-w-lg text-white/90">Pick a design, add your own message and photo, and we take care of the rest.</p>
        <Link to="/shop" className="btn mt-6 bg-white text-accent hover:opacity-90">Browse cards</Link>
      </section>
      {cats.length > 0 && (
        <section aria-label="Categories" className="flex flex-wrap gap-2">
          {cats.map((c) => <Link key={c.id} to={`/shop?category=${c.slug}`} className="btn-ghost">{c.name}</Link>)}
        </section>
      )}
      <section>
        <h2 className="mb-4 text-2xl font-bold">Featured at {SITE_NAME}</h2>
        {err ? <ErrorBox message={err} /> : featured === null ? <Spinner /> : featured.length === 0 ? <p className="text-muted">No cards yet.</p> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        )}
      </section>
    </div>
  );
}
