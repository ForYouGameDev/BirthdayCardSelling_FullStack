import { describe, expect, it } from 'vitest';
import { hmacHex, safeEqual, verifyCheckoutSignature, verifyWebhookSignature } from '../supabase/functions/_shared/hmac';

describe('hmac', () => {
  it('matches a known HMAC-SHA256 vector', async () => {
    // RFC 4231 test case 2
    expect(await hmacHex('Jefe', 'what do ya want for nothing?')).toBe('5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843');
  });
  it('safeEqual', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'ab')).toBe(false);
  });
});

describe('razorpay signatures', () => {
  const secret = 'test_secret';
  it('accepts a correct checkout signature', async () => {
    const sig = await hmacHex(secret, 'order_1|pay_1');
    expect(await verifyCheckoutSignature(secret, 'order_1', 'pay_1', sig)).toBe(true);
  });
  it('rejects a tampered payment id or order id', async () => {
    const sig = await hmacHex(secret, 'order_1|pay_1');
    expect(await verifyCheckoutSignature(secret, 'order_1', 'pay_2', sig)).toBe(false);
    expect(await verifyCheckoutSignature(secret, 'order_2', 'pay_1', sig)).toBe(false);
  });
  it('rejects a signature made with another secret and empty input', async () => {
    const sig = await hmacHex('other', 'order_1|pay_1');
    expect(await verifyCheckoutSignature(secret, 'order_1', 'pay_1', sig)).toBe(false);
    expect(await verifyCheckoutSignature(secret, 'order_1', 'pay_1', '')).toBe(false);
    expect(await verifyCheckoutSignature('', 'order_1', 'pay_1', sig)).toBe(false);
  });
  it('webhook signature covers the exact raw body', async () => {
    const body = '{"event":"payment.captured"}';
    const sig = await hmacHex(secret, body);
    expect(await verifyWebhookSignature(secret, body, sig)).toBe(true);
    expect(await verifyWebhookSignature(secret, body + ' ', sig)).toBe(false);
    expect(await verifyWebhookSignature(secret, body, '')).toBe(false);
  });
});
