import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBox, Spinner } from '../../components/ui';
import { adminListOrders, adminListProducts } from '../../lib/admin';
import { formatPrice } from '../../lib/format';
import type { Order, Product } from '../../lib/types';

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { Promise.all([adminListOrders(), adminListProducts()]).then(([o, p]) => { setOrders(o); setProducts(p); }).catch((e: Error) => setErr(e.message)); }, []);
  if (err) return <ErrorBox message={err} />;
  if (!orders) return <Spinner />;

  const live = orders.filter((o) => o.status !== 'cancelled' && o.status !== 'pending_payment');
  const paid = orders.filter((o) => o.payment_status === 'paid');
  const stats = [
    ['New orders to handle', orders.filter((o) => o.status === 'placed').length],
    ['Shipped, not delivered', orders.filter((o) => o.status === 'shipped').length],
    ['Waiting for payment', orders.filter((o) => o.status === 'pending_payment').length],
    ['Orders (not cancelled)', live.length],
    ['Paid revenue', formatPrice(paid.reduce((s, o) => s + o.total_minor, 0))],
    ['Active products', products.filter((p) => p.is_active).length],
  ];
  const low = products.filter((p) => p.track_inventory && p.is_active && p.stock_qty <= 5);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {stats.map(([k, v]) => <div key={k as string} className="card p-4"><div className="text-sm text-muted">{k}</div><div className="mt-1 text-2xl font-extrabold">{v}</div></div>)}
      </div>
      <div className="card p-4">
        <h2 className="mb-2 font-bold">Low stock (5 or fewer)</h2>
        {low.length === 0 ? <p className="text-sm text-muted">Nothing is running low.</p> : (
          <ul className="space-y-1 text-sm">{low.map((p) => <li key={p.id}><Link className="underline" to={`/admin/products/${p.id}`}>{p.name}</Link> — {p.stock_qty} left</li>)}</ul>
        )}
      </div>
      <p className="text-sm text-muted">Revenue counts only orders whose payment is marked paid. Detailed analytics, coupons and invoices come in the next batch.</p>
    </div>
  );
}
