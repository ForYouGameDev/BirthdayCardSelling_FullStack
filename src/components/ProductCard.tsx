import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import type { Product } from '../lib/types';
import { CardImage } from './ui';

export default function ProductCard({ product }: { product: Product }) {
  const onSale = product.sale_price_minor != null;
  return (
    <Link to={`/product/${product.slug}`} className="group block overflow-hidden rounded-[1.4rem] border border-line bg-surface shadow-sm transition duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-xl hover:shadow-ink/[.06]">
      <div className="relative aspect-[4/5] overflow-hidden bg-bg p-2">
        <div className="h-full overflow-hidden rounded-[1rem]">
          <CardImage product={product} className="h-full w-full transition duration-500 group-hover:scale-105" />
        </div>
        {product.is_sample && <span className="absolute left-4 top-4 rounded-full bg-surface/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted shadow-sm">Sample</span>}
        {!product.in_stock && <span className="absolute right-4 top-4 rounded-full bg-ink px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-bg">Sold out</span>}
        <span className="absolute bottom-4 right-4 flex h-9 w-9 translate-y-2 items-center justify-center rounded-full bg-surface text-lg text-accent opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100" aria-hidden="true">↗</span>
      </div>
      <div className="p-3.5 sm:p-4">
        <div className="line-clamp-2 min-h-[2.75rem] text-sm font-bold leading-5 text-ink sm:text-base">{product.name}</div>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="font-display text-base font-extrabold text-ink sm:text-lg">{formatPrice(product.effective_price_minor, product.currency)}</span>
          {onSale && <span className="text-xs text-muted line-through">{formatPrice(product.price_minor, product.currency)}</span>}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span>Made for moments</span><span className="text-accent">View card →</span>
        </div>
      </div>
    </Link>
  );
}
