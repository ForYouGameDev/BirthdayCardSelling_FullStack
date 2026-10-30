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
    <div className="space-y-16 pb-10">
      <section className="relative isolate overflow-hidden rounded-[2rem] border border-line bg-surface px-6 py-12 shadow-sm sm:px-12 sm:py-16 lg:px-16">
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-1/4 -z-10 h-72 w-72 rounded-full bg-sorbet/20 blur-3xl" />
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-accent">
              <span aria-hidden="true">✦</span> Little things. Big feelings.
            </span>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.06] tracking-tight sm:text-6xl">
              Make their day feel <span className="text-accent">extra special.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg">
              Thoughtful birthday cards, made even more meaningful with your own words, photos and personal touches.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/shop" className="btn-primary px-7 py-3.5 shadow-lg shadow-accent/20">Explore the collection <span aria-hidden="true">→</span></Link>
              <span className="text-sm text-muted">Made for the moments that matter.</span>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-6 text-sm text-muted">
              <span><strong className="text-ink">✦</strong> Personalised designs</span>
              <span><strong className="text-ink">♡</strong> Made with care</span>
              <span><strong className="text-ink">🎁</strong> A gift they’ll keep</span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <div className="absolute -left-5 top-8 h-24 w-24 rounded-full border border-accent/20 bg-accent/5" />
            <div className="absolute -right-4 bottom-8 h-28 w-28 rounded-full border border-sorbet/40 bg-sorbet/10" />
            <div className="relative grid grid-cols-2 gap-3">
              <div className="mt-10 rotate-[-5deg] overflow-hidden rounded-[1.6rem] border border-line bg-bg p-3 shadow-xl">
                <div className="flex aspect-[4/5] flex-col items-center justify-center rounded-[1.1rem] bg-accent/10 p-4 text-center">
                  <span className="text-4xl" aria-hidden="true">🎂</span>
                  <span className="mt-4 font-display text-2xl font-extrabold leading-tight text-accent">Make a wish!</span>
                  <span className="mt-2 text-xs text-muted">A little joy, just for you</span>
                </div>
              </div>
              <div className="overflow-hidden rounded-[1.6rem] border border-line bg-bg p-3 shadow-xl">
                <div className="flex aspect-[4/5] flex-col items-center justify-center rounded-[1.1rem] bg-sorbet/20 p-4 text-center">
                  <span className="text-4xl" aria-hidden="true">🌷</span>
                  <span className="mt-4 font-display text-2xl font-extrabold leading-tight text-ink">You are loved</span>
                  <span className="mt-2 text-xs text-muted">Celebrate beautifully</span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface px-5 py-3 text-sm font-semibold shadow-lg">
              <span className="mr-2 text-accent" aria-hidden="true">✦</span> A card as unique as they are
            </div>
          </div>
        </div>
      </section>

      {cats.length > 0 && (
        <section aria-label="Categories">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Find the perfect feeling</p><h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Shop by occasion</h2></div>
            <Link to="/shop" className="hidden text-sm font-semibold text-accent hover:underline sm:inline">View all cards →</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {cats.map((c, i) => <Link key={c.id} to={`/shop?category=${c.slug}`} className="group flex min-w-[145px] flex-1 items-center justify-between rounded-2xl border border-line bg-surface p-4 transition hover:-translate-y-1 hover:border-accent hover:shadow-md">
              <span className="font-semibold">{c.name}</span><span className="text-xl transition group-hover:translate-x-1" aria-hidden="true">{['✦','♡','🎈','🌷','🎁'][i % 5]}</span>
            </Link>)}
          </div>
        </section>
      )}

      <section>
        <div className="mb-6 flex items-end justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.2em] text-accent">Picked with love</p><h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Customer favourites</h2><p className="mt-2 text-sm text-muted">A few lovely ways to make someone smile.</p></div>
          <Link to="/shop" className="text-sm font-semibold text-accent hover:underline">Shop all →</Link>
        </div>
        {err ? <ErrorBox message={err} /> : featured === null ? <Spinner /> : featured.length === 0 ? <p className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">Our collection is getting ready. Please check back soon.</p> : (
          <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        )}
      </section>

      <section className="overflow-hidden rounded-[2rem] bg-accent px-6 py-10 text-white sm:px-12 sm:py-14">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="text-3xl" aria-hidden="true">💌</span>
          <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">Your words make it unforgettable.</h2>
          <p className="mt-3 max-w-xl leading-7 text-white/85">Add a name, a heartfelt message or a favourite photo. Turn a beautiful card into something that feels truly theirs.</p>
          <Link to="/shop" className="btn mt-7 bg-white px-7 py-3 text-accent shadow-lg transition hover:-translate-y-0.5 hover:bg-bg">Create a little magic <span aria-hidden="true">→</span></Link>
        </div>
      </section>
      <p className="text-center text-xs text-muted">Thank you for choosing {SITE_NAME} to be part of your celebrations.</p>
    </div>
  );
}
