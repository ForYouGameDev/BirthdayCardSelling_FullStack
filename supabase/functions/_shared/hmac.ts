// HMAC-SHA256 helpers (Web Crypto: works in Deno and Node 18+). Used to check Razorpay signatures.
const enc = new TextEncoder();

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message)));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Razorpay checkout signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export async function verifyCheckoutSignature(secret: string, orderId: string, paymentId: string, signature: string): Promise<boolean> {
  if (!secret || !orderId || !paymentId || !signature) return false;
  return safeEqual(await hmacHex(secret, `${orderId}|${paymentId}`), signature.toLowerCase());
}

/** Razorpay webhook signature = HMAC_SHA256(raw request body, webhook_secret). */
export async function verifyWebhookSignature(secret: string, rawBody: string, signature: string): Promise<boolean> {
  if (!secret || !signature) return false;
  return safeEqual(await hmacHex(secret, rawBody), signature.toLowerCase());
}
