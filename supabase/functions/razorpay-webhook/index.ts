// Razorpay calls this by itself (even if the customer closed the browser). Deploy with --no-verify-jwt.
// It trusts nothing except a valid HMAC signature made with RAZORPAY_WEBHOOK_SECRET.
import { adminClient, env, json } from '../_shared/common.ts';
import { verifyWebhookSignature } from '../_shared/hmac.ts';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const raw = await req.text();
    const ok = await verifyWebhookSignature(env('RAZORPAY_WEBHOOK_SECRET'), raw, req.headers.get('x-razorpay-signature') ?? '');
    if (!ok) return json({ error: 'Bad signature' }, 400);

    const evt = JSON.parse(raw);
    if (evt.event !== 'payment.captured' && evt.event !== 'order.paid') return json({ ok: true, ignored: evt.event });
    const pay = evt?.payload?.payment?.entity;
    const rzpOrderId: string | undefined = pay?.order_id ?? evt?.payload?.order?.entity?.id;
    const paymentId: string | undefined = pay?.id;
    if (!rzpOrderId || !paymentId) return json({ ok: true, ignored: 'no payment' });

    const db = adminClient();
    const { data: order } = await db.from('orders').select('id, total_minor, payment_status').eq('razorpay_order_id', rzpOrderId).maybeSingle();
    if (!order) return json({ ok: true, ignored: 'unknown order' });          // 200 so Razorpay stops retrying
    if (order.payment_status === 'paid') return json({ ok: true });
    if (typeof pay?.amount === 'number' && pay.amount !== order.total_minor) return json({ error: 'Amount mismatch' }, 400);

    const { error } = await db.rpc('mark_order_paid', { p_order: order.id, p_rzp_order: rzpOrderId, p_payment_id: paymentId });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
