import { supabase } from './supabase';
import type { Address, AddressInput, AppSettings, Order, PaymentMethod } from './types';
import { normalizePhone } from './validation';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function getSettings(): Promise<AppSettings> {
  return check(await supabase.from('app_settings').select('cod_enabled,cod_fee_minor,razorpay_enabled,shipping_fee_minor,free_shipping_over_minor').eq('id', 1).single());
}

/** Same shipping rule as the database (the database result is what is charged). */
export function shippingFor(subtotal: number, s: AppSettings, allDigital: boolean): number {
  if (allDigital) return 0;
  return s.free_shipping_over_minor != null && subtotal >= s.free_shipping_over_minor ? 0 : s.shipping_fee_minor;
}

// ---------- addresses ----------
export async function listAddresses(): Promise<Address[]> {
  return check(await supabase.from('addresses').select('*').order('is_default', { ascending: false }).order('created_at', { ascending: false }));
}
export async function saveAddress(userId: string, input: AddressInput, id?: string): Promise<Address> {
  const row = { ...input, phone: normalizePhone(input.phone), label: input.label?.trim() || null, line2: input.line2?.trim() || null };
  if (id) return check(await supabase.from('addresses').update(row).eq('id', id).select('*').single());
  return check(await supabase.from('addresses').insert({ ...row, user_id: userId }).select('*').single());
}
export async function deleteAddress(id: string): Promise<void> {
  check(await supabase.from('addresses').delete().eq('id', id).select('id'));
}
export async function setDefaultAddress(userId: string, id: string): Promise<void> {
  check(await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId).select('id'));
  check(await supabase.from('addresses').update({ is_default: true }).eq('id', id).select('id'));
}

// ---------- orders ----------
const ORDER_SELECT = '*, order_items(*), order_events(*)';

export async function placeOrder(addressId: string, method: PaymentMethod, note: string): Promise<string> {
  const { data, error } = await supabase.rpc('place_order', { p_address_id: addressId, p_method: method, p_note: note.trim() || null });
  if (error) throw new Error(error.message);
  return data as string;
}
export async function listMyOrders(): Promise<Order[]> {
  return check(await supabase.from('orders').select('*, order_items(id,name,quantity)').order('created_at', { ascending: false }));
}
export async function getOrder(id: string): Promise<Order | null> {
  const o = check(await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle()) as Order | null;
  if (o) o.order_events = [...(o.order_events ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return o;
}
export async function cancelMyOrder(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_my_order', { p_order: id });
  if (error) throw new Error(error.message);
}

// ---------- Razorpay (test or live depends on the keys saved in Supabase secrets) ----------
type RzpResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RzpCtor = new (opts: Record<string, unknown>) => { open(): void; on(ev: string, cb: (r: unknown) => void): void };
declare global { interface Window { Razorpay?: RzpCtor } }

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment window. Check your internet connection.'));
    document.body.appendChild(s);
  });
}

async function callFn<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // Edge Function errors carry a JSON body with our message
    let msg = error.message;
    try { const ctx = (error as unknown as { context?: Response }).context; if (ctx) msg = (await ctx.json()).error || msg; } catch { /* keep default */ }
    throw new Error(msg);
  }
  return data as T;
}

/** Opens Razorpay Checkout. Resolves 'paid' or 'dismissed'. Throws on failure. */
export async function payWithRazorpay(order: Pick<Order, 'id' | 'order_no'>, prefill: { name?: string; email?: string; contact?: string }, siteName: string): Promise<'paid' | 'dismissed'> {
  await loadRazorpayScript();
  const r = await callFn<{ key_id: string; razorpay_order_id: string; amount: number; currency: string }>('razorpay-create-order', { order_id: order.id });
  return new Promise((resolve, reject) => {
    const Rzp = window.Razorpay as RzpCtor;
    const rz = new Rzp({
      key: r.key_id, amount: r.amount, currency: r.currency, order_id: r.razorpay_order_id,
      name: siteName, description: `Order ${order.order_no}`, prefill,
      handler: async (resp: RzpResponse) => {
        try {
          await callFn('razorpay-verify', { order_id: order.id, ...resp });
          resolve('paid');
        } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => resolve('dismissed') },
    });
    rz.on('payment.failed', (e) => {
      const d = (e as { error?: { description?: string } })?.error?.description;
      reject(new Error(d || 'Payment failed. You can try again from your order page.'));
    });
    rz.open();
  });
}
