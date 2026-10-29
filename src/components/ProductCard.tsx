import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import type { Product } from '../lib/types';
import { CardImage } from './ui';

export default function ProductCard({ product }: { product: Product }) {
  const onSale = product.sale_price_minor != null;
  return (
    <Link to={`/product/${product.slug}`} className="card group block overflow-hidden transition hover:-translate-y-0.5 hover:border-accent">
      <div className="relative aspect-[4/5] overflow-hidden">
        <CardImage product={product} className="h-full w-full transition group-hover:scale-[1.03]" />
        {product.is_sample && <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white">Sample</span>}
        {!product.in_stock && <span className="absolute right-2 top-2 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">Sold out</span>}
      </div>
      <div className="p-3">
        <div className="line-clamp-2 text-sm font-semibold">{product.name}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-bold">{formatPrice(product.effective_price_minor, product.currency)}</span>
          {onSale && <span className="text-xs text-muted line-through">{formatPrice(product.price_minor, product.currency)}</span>}
        </div>
      </div>
    </Link>
  );
}
