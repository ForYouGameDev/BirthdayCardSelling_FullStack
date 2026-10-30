// Creates a Razorpay order for one of the customer's own unpaid orders.
// The amount comes from the DATABASE (orders.total_minor), never from the browser.
import { adminClient, cors, env, json, userClient } from '../_shared/common.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const { order_id } = await req.json();
    if (typeof order_id !== 'string') return json({ error: 'order_id is required' }, 400);

    const user = userClient(req);
    const { data: auth } = await user.auth.getUser();
    if (!auth.user) return json({ error: 'Please sign in.' }, 401);

    // RLS: a customer can only read their own orders.
    const { data: order, error } = await user.from('orders')
      .select('id, order_no, status, payment_method, payment_status, total_minor, currency, razorpay_order_id')
      .eq('id', order_id).maybeSingle();
    if (error || !order) return json({ error: 'Order not found.' }, 404);
    if (order.payment_method !== 'razorpay' || order.status !== 'pending_payment' || order.payment_status !== 'pending') {
      return json({ error: 'This order is not waiting for online payment.' }, 400);
    }

    const keyId = env('RAZORPAY_KEY_ID');
    let rzpOrderId: string | null = order.razorpay_order_id;
    if (!rzpOrderId) {
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Basic ' + btoa(`${keyId}:${env('RAZORPAY_KEY_SECRET')}`) },
        body: JSON.stringify({ amount: order.total_minor, currency: order.currency, receipt: order.order_no, notes: { order_id: order.id } }),
      });
      const body = await res.json();
      if (!res.ok) return json({ error: body?.error?.description || 'Razorpay could not create the order.' }, 502);
      rzpOrderId = body.id as string;
      const { error: e2 } = await adminClient().rpc('set_razorpay_order', { p_order: order.id, p_rzp_order: rzpOrderId });
      if (e2) return json({ error: e2.message }, 500);
    }
    return json({ key_id: keyId, razorpay_order_id: rzpOrderId, amount: order.total_minor, currency: order.currency, order_no: order.order_no });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
