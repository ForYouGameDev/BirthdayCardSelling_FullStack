import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../lib/format';
import { cancelMyOrder, getOrder, payWithRazorpay } from '../lib/orders';
import { SITE_NAME } from '../lib/supabase';
import { STATUS_LABEL } from '../lib/validation';
import type { Order } from '../lib/types';

export default function OrderDetail() {
  const { id = '' } = useParams();
  const loc = useLocation();
  const state = (loc.state ?? {}) as { placed?: boolean; notice?: string };
  const { user, profile } = useAuth();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [err, setErr] = useState<string | null>(state.notice ?? null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => getOrder(id).then(setOrder).catch((e: Error) => setErr(e.message)), [id]);
  useEffect(() => { void load(); }, [load]);

  if (order === undefined) return err ? <ErrorBox message={err} /> : <Spinner />;
  if (order === null) return <Empty title="Order not found"><Link className="underline" to="/orders">My orders</Link></Empty>;
  const o = order;
  const unpaidOnline = o.payment_method === 'razorpay' && o.status === 'pending_payment';
  const canCancel = o.payment_status !== 'paid' && (o.status === 'pending_payment' || o.status === 'placed');

  async function pay() {
    setBusy(true); setErr(null);
    try {
      await payWithRazorpay(o, { name: profile?.full_name ?? undefined, email: user?.email ?? undefined, contact: o.address.phone }, SITE_NAME);
      await load();
    } catch (e) { setErr(e instanceof Error ? e.message : 'Payment failed.'); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!window.confirm('Cancel this order?')) return;
    setBusy(true); setErr(null);
    try { await cancelMyOrder(o.id); await load(); } catch (e) { setErr(e instanceof Error ? e.message : 'Could not cancel.'); }
    finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {state.placed && o.status === 'placed' && <div className="rounded-xl border border-green-400 p-3 text-green-700 dark:text-green-300" role="status">Thank you! Your order has been placed.</div>}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-3xl font-extrabold">{o.order_no}</h1>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">{STATUS_LABEL[o.status] ?? o.status}</span>
      </div>
      {err && <ErrorBox message={err} />}
      {unpaidOnline && (
        <div className="card flex flex-wrap items-center gap-3 border-amber-400 p-4">
          <span className="flex-1 text-sm">Payment is pending for this order.</span>
          <button className="btn-primary" disabled={busy} onClick={pay}>Pay {formatPrice(o.total_minor)}</button>
        </div>
      )}
      <div className="card divide-y divide-line">
        {(o.order_items ?? []).map((i) => (
          <div key={i.id} className="p-3 text-sm">
            <div className="flex justify-between gap-2"><b>{i.quantity} × {i.name}</b><span>{formatPrice(i.line_total_minor)}</span></div>
            {i.variant_label && <div className="text-muted">{i.variant_label}</div>}
            {i.customization.map((c) => <div key={c.key} className="truncate text-muted">{c.label}: {c.type === 'photo' ? 'photo attached' : c.value}</div>)}
          </div>
        ))}
        <div className="space-y-1 p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{formatPrice(o.subtotal_minor)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Shipping</span><span>{o.shipping_minor ? formatPrice(o.shipping_minor) : 'Free'}</span></div>
          {o.cod_fee_minor > 0 && <div className="flex justify-between"><span className="text-muted">COD fee</span><span>{formatPrice(o.cod_fee_minor)}</span></div>}
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatPrice(o.total_minor)}</span></div>
          <div className="text-muted">{o.payment_method === 'cod' ? 'Cash on delivery' : 'Online payment'} · payment {o.payment_status}</div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="card p-3 text-sm"><h2 className="mb-1 font-bold">Delivery address</h2>
          {o.address.full_name}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}<br />{o.address.city}, {o.address.state} {o.address.postal_code}<br />Phone: {o.address.phone}
        </div>
        <div className="card p-3 text-sm"><h2 className="mb-1 font-bold">Tracking</h2>
          {o.tracking_no ? <>{o.courier || 'Courier'}: <b>{o.tracking_no}</b></> : <span className="text-muted">Tracking details will appear here once shipped.</span>}
        </div>
      </div>
      <div className="card p-3 text-sm"><h2 className="mb-2 font-bold">Order timeline</h2>
        <ol className="space-y-1">
          {(o.order_events ?? []).map((e) => <li key={e.id}><b>{STATUS_LABEL[e.status] ?? e.status}</b> <span className="text-muted">· {new Date(e.created_at).toLocaleString()}{e.note ? ` · ${e.note}` : ''}</span></li>)}
        </ol>
      </div>
      {canCancel && <button className="btn-ghost" disabled={busy} onClick={cancel}>Cancel order</button>}
    </div>
  );
}
