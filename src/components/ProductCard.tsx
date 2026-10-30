
import { Link } from 'react-router-dom';
import { formatPrice } from '../lib/format';
import type { Product } from '../lib/types';
import { CardImage } from './ui';
import { Heart } from './icons';

export default function ProductCard({ product }: { product: Product }) {
  const onSale = product.sale_price_minor != null;
  return (
    <Link to={`/product/${product.slug}`} className="group block overflow-hidden rounded-[1.5rem] border border-[#f0dce4] bg-white shadow-[0_5px_24px_rgba(174,110,139,0.07)] transition duration-300 hover:-translate-y-1.5 hover:border-[#e8b5ca] hover:shadow-[0_14px_32px_rgba(174,110,139,0.15)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#fff1f6]">
        <CardImage product={product} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />

        <div className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/85 text-[#d66d98] shadow-sm">
          <Heart className="h-4 w-4" />
        </div>

        {product.is_sample && <span className="absolute left-3 top-3 rounded-full border border-white/80 bg-[#fff0f5]/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#b65d80] shadow-sm">Sample</span>}

        {!product.in_stock && <span className="absolute bottom-3 left-3 rounded-full bg-[#79566b]/90 px-3 py-1.5 text-xs font-semibold text-white shadow-sm">Sold out</span>}
      </div>

      <div className="p-3.5 sm:p-4">
        <div className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-[#69475a] transition group-hover:text-[#c45e86]">{product.name}</div>

        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="font-bold text-[#c45e86]">{formatPrice(product.effective_price_minor, product.currency)}</span>
          {onSale && <span className="text-xs text-muted line-through">{formatPrice(product.price_minor, product.currency)}</span>}
        </div>

        <div className="mt-3 h-1 w-10 rounded-full bg-[#f3c8d9] transition-all duration-300 group-hover:w-full group-hover:bg-[#d66d98]" />
      </div>
    </Link>
  );
}
