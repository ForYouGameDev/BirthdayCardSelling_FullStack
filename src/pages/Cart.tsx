import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CardImage, Empty, ErrorBox, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { lineTotals, maxQuantity } from '../lib/pricing';

export default function Cart() {
  const { lines, loading, error, subtotal, setQty, remove } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [msg, setMsg] = useState<string | null>(null);

  const run = (p: Promise<void>) => p.catch((e: Error) => setMsg(e.message));

  if (loading) return <Spinner />;
  if (!lines.length) return <Empty title="Your cart is empty"><Link className="underline" to="/shop">Find a card</Link></Empty>;

  const blocked = lines.some((l) => maxQuantity(l.product, l.variant) < l.quantity);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        <h1 className="text-3xl font-extrabold">Your cart</h1>
        {(error || msg) && <ErrorBox message={(error || msg) as string} />}
        {lines.map((l) => {
          const t = lineTotals(l.product, l.variant, l.quantity, l.fields, l.customization);
          const max = maxQuantity(l.product, l.variant);
          return (
            <div key={l.id} className="card flex gap-4 p-3">
              <Link to={`/product/${l.product.slug}`} className="h-28 w-24 shrink-0 overflow-hidden rounded-xl"><CardImage product={l.product} className="h-full w-full" /></Link>
              <div className="min-w-0 flex-1">
                <Link to={`/product/${l.product.slug}`} className="font-semibold hover:text-accent">{l.product.name}</Link>
                {l.variant && <div className="text-sm text-muted">{l.variant.label}</div>}
                {l.fields.filter((f) => l.customization[f.key]).map((f) => (
                  <div key={f.key} className="truncate text-sm text-muted">{f.label}: {f.field_type === 'photo' ? 'photo attached' : l.customization[f.key]}</div>
                ))}
                {max < l.quantity && <div className="text-sm text-red-600">Only {max} available. Please lower the quantity.</div>}
                <div className="mt-2 flex items-center gap-3">
                  <input aria-label="Quantity" type="number" min={1} max={Math.max(1, max)} className="input w-20 py-1.5" value={l.quantity} onChange={(e) => run(setQty(l.id, Number(e.target.value)))} />
                  <button className="text-sm text-muted underline hover:text-accent" onClick={() => run(remove(l.id))}>Remove</button>
                  <span className="ml-auto font-bold">{formatPrice(t.total, l.product.currency)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <aside className="card h-fit space-y-3 p-4">
        <h2 className="text-lg font-bold">Summary</h2>
        <div className="flex justify-between"><span className="text-muted">Subtotal</span><b>{formatPrice(subtotal)}</b></div>
        <p className="text-xs text-muted">Shipping, tax and coupons are added at checkout. The final amount is always calculated by the server.</p>
        <button className="btn-primary w-full" disabled={blocked} onClick={() => nav(user ? '/checkout' : '/login', { state: { from: '/checkout' } })}>
          {user ? 'Checkout' : 'Sign in to checkout'}
        </button>
      </aside>
    </div>
  );
}
