import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { ErrorBox, Spinner } from '../components/ui';
import { listCategories, listProducts } from '../lib/api';
import { isConfigured, SITE_NAME } from '../lib/supabase';
import type { Category, Product } from '../lib/types';
import { Cake, Flower, Sparkles, Heart, ArrowRight } from '../components/icons';

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
    <div className="space-y-16 overflow-hidden">

      <section className="relative isolate overflow-hidden rounded-[2.5rem] border border-[#f5dce5] bg-gradient-to-br from-[#fff0f5] via-[#fff7ed] to-[#f1eaff] px-6 py-14 sm:px-12 sm:py-20 lg:px-16">
        <div className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full bg-[#f9c9dc]/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-64 w-64 rounded-full bg-[#d9c9f5]/40 blur-3xl" />

        <div className="pointer-events-none absolute right-8 top-8 hidden rotate-12 text-[#d98ca9]/50 sm:block">
          <Flower className="h-16 w-16" />
        </div>
        <div className="pointer-events-none absolute bottom-8 right-1/3 hidden text-[#d98ca9]/40 sm:block">
          <Sparkles className="h-10 w-10" />
        </div>

        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#efcbd9] bg-white/75 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#b65d80] shadow-sm">
              <Sparkles className="h-4 w-4" />
              Made for happy moments
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-[1.12] tracking-tight text-[#59364b] sm:text-5xl lg:text-6xl">
              A little card,
              <span className="mt-2 block text-[#d66d98]">a lot of love.</span>
            </h1>

            <p className="mt-6 max-w-md text-base leading-8 text-[#806779] sm:text-lg">
              Beautiful birthday cards made to turn your sweetest wishes into memories worth keeping.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="group inline-flex items-center gap-3 rounded-full bg-[#d66d98] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#d66d98]/25 transition hover:-translate-y-1 hover:bg-[#bd557f]">
                Explore collection
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
              <Link to="/shop" className="inline-flex items-center gap-2 rounded-full border border-[#e9c8d7] bg-white/80 px-7 py-3.5 text-sm font-bold text-[#87556d] transition hover:border-[#d66d98] hover:bg-white">
                Discover cards
              </Link>
            </div>

            <div className="mt-9 flex items-center gap-3 text-sm text-[#987b8d]">
              <Heart className="h-4 w-4 text-[#d66d98]" />
              <span>Designed with love, made for celebrations</span>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-md items-center justify-center">
            <div className="absolute h-72 w-72 rounded-full border border-[#eac8d8] bg-white/40 sm:h-96 sm:w-96" />
            <div className="absolute h-60 w-60 rounded-full border border-dashed border-[#d9b8cb] sm:h-80 sm:w-80" />

            <div className="relative flex aspect-square w-[85%] items-center justify-center overflow-hidden rounded-[2.5rem] border border-white/80 bg-gradient-to-br from-[#ffe0eb] via-[#fff2df] to-[#e9ddff] shadow-2xl shadow-[#b77c9a]/15">
              <div className="absolute left-8 top-8 text-[#cf86a4]">
                <Flower className="h-12 w-12" />
              </div>
              <div className="absolute right-8 top-12 text-[#c69acb]">
                <Sparkles className="h-10 w-10" />
              </div>
              <div className="absolute bottom-9 left-9 text-[#d38aa7]">
                <Heart className="h-9 w-9" />
              </div>
              <div className="absolute bottom-10 right-8 text-[#c69acb]">
                <Flower className="h-12 w-12" />
              </div>

              <div className="relative flex flex-col items-center">
                <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full border border-white/80 bg-white/65 shadow-lg">
                  <Cake className="h-14 w-14 text-[#d66d98]" />
                </div>
                <span className="font-display text-3xl font-extrabold tracking-tight text-[#86516f] sm:text-4xl">
                  Make a wish
                </span>
                <span className="mt-2 text-xs font-semibold uppercase tracking-[0.25em] text-[#b7839c]">
                  Celebrate beautifully
                </span>
                <div className="mt-5 h-1.5 w-16 rounded-full bg-[#d98ca9]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {cats.length > 0 && (
        <section aria-label="Categories" className="space-y-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#c27b99]">Find your feeling</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Shop by occasion</h2>
            <p className="mt-2 text-sm text-muted">A lovely little card for every special moment.</p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {cats.map((c) => (
              <Link key={c.id} to={`/shop?category=${c.slug}`} className="rounded-full border border-[#f0d6e0] bg-white px-6 py-3 text-sm font-semibold text-[#98647c] shadow-sm transition hover:-translate-y-1 hover:border-[#d66d98] hover:bg-[#fff2f7] hover:text-[#c05d85]">
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#c27b99]">Handpicked for you</span>
            <h2 className="mt-2 font-display text-3xl font-extrabold text-ink">Lovely little cards</h2>
            <p className="mt-2 text-sm text-muted">Our favourite designs, made to spread happiness.</p>
          </div>
          <Link to="/shop" className="inline-flex items-center gap-2 rounded-full border border-[#f0d6e0] bg-white px-5 py-2.5 text-sm font-semibold text-[#bd6489] transition hover:bg-[#fff2f7]">
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {err ? <ErrorBox message={err} /> : featured === null ? <Spinner /> : featured.length === 0 ? <p className="rounded-3xl border border-dashed border-line bg-surface p-10 text-center text-muted">No cards yet.</p> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">{featured.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        )}
      </section>

      <section className="relative overflow-hidden rounded-[2rem] border border-[#f2d8e2] bg-gradient-to-r from-[#fff0f5] to-[#f3edff] px-6 py-10 text-center sm:px-12 sm:py-14">
        <div className="pointer-events-none absolute left-8 top-7 text-[#d28ba7]/40">
          <Flower className="h-12 w-12" />
        </div>
        <div className="pointer-events-none absolute bottom-6 right-8 text-[#c59acb]/50">
          <Sparkles className="h-12 w-12" />
        </div>
        <div className="relative">
          <Heart className="mx-auto h-8 w-8 text-[#d66d98]" />
          <h2 className="mt-4 font-display text-3xl font-extrabold text-[#70465d]">Make someone's day special</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#98788a]">
            Sometimes the smallest gesture carries the biggest smile. Find a card that says it all.
          </p>
          <Link to="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#d66d98] px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#d66d98]/20 transition hover:-translate-y-1 hover:bg-[#bd557f]">
            Find the perfect card
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
