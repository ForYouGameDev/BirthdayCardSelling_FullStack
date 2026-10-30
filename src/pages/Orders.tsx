import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, ErrorBox, Spinner } from '../components/ui';
import { formatPrice } from '../lib/format';
import { listMyOrders } from '../lib/orders';
import { STATUS_LABEL } from '../lib/validation';
import type { Order } from '../lib/types';

export default function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { listMyOrders().then(setOrders).catch((e: Error) => setErr(e.message)); }, []);
  if (err) return <ErrorBox message={err} />;
  if (!orders) return <Spinner />;
  if (!orders.length) return <Empty title="No orders yet"><Link className="underline" to="/shop">Start shopping</Link></Empty>;
  return (
    <div className="space-y-3">
      <h1 className="text-3xl font-extrabold">My orders</h1>
      {orders.map((o) => (
        <Link key={o.id} to={`/orders/${o.id}`} className="card flex flex-wrap items-center gap-3 p-4 hover:border-accent">
          <div className="min-w-0 flex-1">
            <div className="font-semibold">{o.order_no}</div>
            <div className="truncate text-sm text-muted">{new Date(o.created_at).toLocaleDateString()} · {(o.order_items ?? []).map((i) => `${i.quantity}× ${i.name}`).join(', ')}</div>
          </div>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">{STATUS_LABEL[o.status] ?? o.status}</span>
          <b>{formatPrice(o.total_minor, o.currency)}</b>
        </Link>
      ))}
    </div>
  );
}
