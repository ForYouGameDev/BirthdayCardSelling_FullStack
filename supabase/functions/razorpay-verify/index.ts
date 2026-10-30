// Called by the browser right after Razorpay Checkout succeeds. Checks the signature, then marks the order paid.
import { adminClient, cors, env, json, userClient } from '../_shared/common.ts';
import { verifyCheckoutSignature } from '../_shared/hmac.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const b = await req.json();
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = b ?? {};
    if (![order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature].every((x) => typeof x === 'string' && x)) {
      return json({ error: 'Missing payment details.' }, 400);
    }
    const user = userClient(req);
    const { data: auth } = await user.auth.getUser();
    if (!auth.user) return json({ error: 'Please sign in.' }, 401);

    const { data: order } = await user.from('orders').select('id, razorpay_order_id, payment_status').eq('id', order_id).maybeSingle();
    if (!order) return json({ error: 'Order not found.' }, 404);
    if (order.payment_status === 'paid') return json({ ok: true });
    if (order.razorpay_order_id !== razorpay_order_id) return json({ error: 'Payment does not match this order.' }, 400);

    const valid = await verifyCheckoutSignature(env('RAZORPAY_KEY_SECRET'), razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) return json({ error: 'Payment signature is invalid.' }, 400);

    const { error } = await adminClient().rpc('mark_order_paid', { p_order: order.id, p_rzp_order: razorpay_order_id, p_payment_id: razorpay_payment_id });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unexpected error' }, 500);
  }
});
