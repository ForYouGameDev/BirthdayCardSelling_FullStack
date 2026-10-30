import { useCallback, useEffect, useState } from 'react';
import { ErrorBox, Spinner } from '../../components/ui';
import { adminListOrders, adminPhotoUrl, adminSetOrderStatus } from '../../lib/admin';
import { formatPrice } from '../../lib/format';
import { STATUS_LABEL } from '../../lib/validation';
import type { Order, OrderStatus } from '../../lib/types';

const NEXT: OrderStatus[] = ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

function OrderRow({ o, onChanged }: { o: Order; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<OrderStatus>(o.status === 'pending_payment' ? 'cancelled' : o.status);
  const [courier, setCourier] = useState(o.courier ?? '');
  const [tracking, setTracking] = useState(o.tracking_no ?? '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true); setErr(null);
    try { await adminSetOrderStatus(o.id, status, courier, tracking, note); setNote(''); onChanged(); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not update.'); }
    finally { setBusy(false); }
  }
  async function openPhoto(path: string) {
    const u = await adminPhotoUrl(path);
    if (u) window.open(u, '_blank', 'noopener'); else setErr('Could not open the photo.');
  }

  return (
    <div className="card">
      <button className="flex w-full flex-wrap items-center gap-3 p-3 text-left" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <b className="w-24">{o.order_no}</b>
        <span className="text-sm text-muted">{new Date(o.created_at).toLocaleString()}</span>
        <span className="flex-1 truncate text-sm">{o.address.full_name}</span>
        <span className="text-xs uppercase text-muted">{o.payment_method} · {o.payment_status}</span>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{STATUS_LABEL[o.status]}</span>
        <b>{formatPrice(o.total_minor)}</b>
      </button>
      {open && (
        <div className="space-y-3 border-t border-line p-3 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div><b>Ship to</b><br />{o.address.full_name}<br />{o.address.line1}{o.address.line2 ? `, ${o.address.line2}` : ''}<br />{o.address.city}, {o.address.state} {o.address.postal_code}<br />Phone: {o.address.phone}{o.customer_note && <><br /><i>Note: {o.customer_note}</i></>}</div>
            <div><b>Money</b><br />Subtotal {formatPrice(o.subtotal_minor)} · Shipping {formatPrice(o.shipping_minor)}{o.cod_fee_minor ? ` · COD fee ${formatPrice(o.cod_fee_minor)}` : ''}<br /><b>Total {formatPrice(o.total_minor)}</b>{o.razorpay_payment_id && <><br />Razorpay payment: {o.razorpay_payment_id}</>}</div>
          </div>
          <div className="space-y-2">
            {(o.order_items ?? []).map((i) => (
              <div key={i.id} className="rounded-xl border border-line p-2">
                <b>{i.quantity} × {i.name}</b> <span className="text-muted">({i.sku}{i.variant_label ? ` · ${i.variant_label}` : ''})</span> — {formatPrice(i.line_total_minor)}
                {i.customization.map((c) => (
                  <div key={c.key} className="mt-1">
                    <span className="text-muted">{c.label}:</span>{' '}
                    {c.type === 'photo' ? <button className="underline" onClick={() => openPhoto(c.value)}>Open customer photo</button> : <span className="whitespace-pre-line">{c.value}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {err && <ErrorBox message={err} />}
          {o.status === 'cancelled' ? <p className="text-muted">This order is cancelled and cannot be changed.</p> : (
            <div className="grid gap-2 sm:grid-cols-5">
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as OrderStatus)} aria-label="New status">
                {NEXT.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
              <input className="input" placeholder="Courier" value={courier} onChange={(e) => setCourier(e.target.value)} />
              <input className="input" placeholder="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
              <input className="input" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Update'}</button>
            </div>
          )}
          <div className="text-muted">History: {(o.order_events ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)).map((e) => `${STATUS_LABEL[e.status] ?? e.status} (${new Date(e.created_at).toLocaleDateString()})`).join(' → ')}</div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => adminListOrders(filter || undefined).then(setOrders).catch((e: Error) => setErr(e.message)), [filter]);
  useEffect(() => { setOrders(null); void load(); }, [load]);

  const shown = (orders ?? []).filter((o) => !q.trim() || `${o.order_no} ${o.address.full_name} ${o.address.phone}`.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <select className="input w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Status filter">
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="input w-auto flex-1" placeholder="Search order no., name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {err && <ErrorBox message={err} />}
      {!orders ? <Spinner /> : shown.length === 0 ? <p className="text-muted">No orders found.</p> : shown.map((o) => <OrderRow key={o.id} o={o} onChanged={load} />)}
    </div>
  );
}
