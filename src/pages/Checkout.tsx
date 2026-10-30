import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AddressBook from '../components/AddressBook';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { formatPrice } from '../lib/format';
import { getSettings, payWithRazorpay, placeOrder, getOrder, shippingFor } from '../lib/orders';
import { lineTotals, maxQuantity } from '../lib/pricing';
import { SITE_NAME } from '../lib/supabase';
import type { Address, AppSettings, PaymentMethod } from '../lib/types';

export default function Checkout() {
  const { lines, loading, subtotal, clear } = useCart();
  const { user, profile } = useAuth();
  const nav = useNavigate();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { getSettings().then(setSettings).catch((e: Error) => setErr(e.message)); }, []);
  useEffect(() => {
    if (!settings || method) return;
    setMethod(settings.razorpay_enabled ? 'razorpay' : settings.cod_enabled ? 'cod' : null);
  }, [settings, method]);

  const allDigital = lines.length > 0 && lines.every((l) => l.product.product_type === 'digital');
  const shipping = useMemo(() => (settings ? shippingFor(subtotal, settings, allDigital) : 0), [settings, subtotal, allDigital]);
  const codFee = method === 'cod' && settings ? settings.cod_fee_minor : 0;
  const total = subtotal + shipping + codFee;

  if (loading || !settings) return err ? <ErrorBox message={err} /> : <Spinner />;
  if (!lines.length) return <Empty title="Your cart is empty"><Link className="underline" to="/shop">Find a card</Link></Empty>;
  const stockProblem = lines.some((l) => maxQuantity(l.product, l.variant) < l.quantity);

  async function submit() {
    if (!address || !method || !user) return;
    setBusy(true); setErr(null);
    try {
      const orderId = await placeOrder(address.id, method, note);
      await clear();                       // the database already emptied the cart; this refreshes the screen
      if (method === 'razorpay') {
        const order = await getOrder(orderId);
        if (order) {
          try {
            await payWithRazorpay(order, { name: profile?.full_name ?? undefined, email: user.email ?? undefined, contact: address.phone }, SITE_NAME);
          } catch (e) {
            nav(`/orders/${orderId}`, { state: { notice: e instanceof Error ? e.message : 'Payment was not completed.' } });
            return;
          }
        }
      }
      nav(`/orders/${orderId}`, { state: { placed: true } });
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'Could not place the order.');
    } finally {
      setBusy(false);
    }
  }

  const noMethod = !settings.cod_enabled && !settings.razorpay_enabled;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold">Checkout</h1>
        <section><h2 className="mb-2 text-xl font-bold">1. Delivery address</h2>
          <AddressBook selectable selectedId={address?.id} onSelect={setAddress} />
        </section>
        <section><h2 className="mb-2 text-xl font-bold">2. Payment</h2>
          {noMethod ? <ErrorBox message="No payment method is available right now. Please try again later." /> : (
            <div className="space-y-2">
              {settings.razorpay_enabled && (
                <label className={`card flex cursor-pointer gap-3 p-3 ${method === 'razorpay' ? 'border-accent ring-1 ring-accent' : ''}`}>
                  <input type="radio" name="pay" checked={method === 'razorpay'} onChange={() => setMethod('razorpay')} />
                  <div><div className="font-semibold">Pay online</div><div className="text-sm text-muted">UPI, cards, net banking, wallets (Razorpay)</div></div>
                </label>
              )}
              {settings.cod_enabled && (
                <label className={`card flex cursor-pointer gap-3 p-3 ${method === 'cod' ? 'border-accent ring-1 ring-accent' : ''}`}>
                  <input type="radio" name="pay" checked={method === 'cod'} onChange={() => setMethod('cod')} />
                  <div><div className="font-semibold">Cash on delivery</div>
                    <div className="text-sm text-muted">Pay when the card arrives{settings.cod_fee_minor > 0 ? ` (+${formatPrice(settings.cod_fee_minor)} COD fee)` : ''}</div></div>
                </label>
              )}
            </div>
          )}
        </section>
        <section><h2 className="mb-2 text-xl font-bold">3. Note (optional)</h2>
          <textarea className="input" rows={2} maxLength={500} placeholder="Anything we should know about delivery?" value={note} onChange={(e) => setNote(e.target.value)} />
        </section>
      </div>

      <aside className="card h-fit space-y-3 p-4">
        <h2 className="text-lg font-bold">Order summary</h2>
        <ul className="space-y-1 text-sm">
          {lines.map((l) => (
            <li key={l.id} className="flex justify-between gap-2">
              <span className="truncate">{l.quantity} × {l.product.name}{l.variant ? ` (${l.variant.label})` : ''}</span>
              <span>{formatPrice(lineTotals(l.product, l.variant, l.quantity, l.fields, l.customization).total)}</span>
            </li>
          ))}
        </ul>
        <hr className="border-line" />
        <div className="flex justify-between text-sm"><span className="text-muted">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-muted">Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
        {codFee > 0 && <div className="flex justify-between text-sm"><span className="text-muted">COD fee</span><span>{formatPrice(codFee)}</span></div>}
        <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatPrice(total)}</span></div>
        <p className="text-xs text-muted">The final amount is calculated again on our server when you place the order.</p>
        {err && <ErrorBox message={err} />}
        <button className="btn-primary w-full" disabled={busy || !address || !method || stockProblem || noMethod} onClick={submit}>
          {busy ? 'Please wait…' : method === 'razorpay' ? `Pay ${formatPrice(total)}` : 'Place order'}
        </button>
        {!address && <p className="text-xs text-muted">Add or choose a delivery address to continue.</p>}
        {stockProblem && <p className="text-xs text-red-600">Some items are low on stock. Go back to the cart and lower the quantity.</p>}
      </aside>
    </div>
  );
}
