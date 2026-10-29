import { describe, expect, it } from 'vitest';
import { cartCount, isUuid, parseStoredCart, sameCustomization, sameLine } from '../src/lib/cart';
import { deliveryText, formatPrice, gradientFor } from '../src/lib/format';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

describe('sameLine', () => {
  it('is true for identical product, variant and personalisation', () => {
    expect(sameLine({ product_id: A, variant_id: null, customization: { n: 'x' } }, { product_id: A, variant_id: null, customization: { n: 'x' } })).toBe(true);
  });
  it('is false when the message differs', () => {
    expect(sameLine({ product_id: A, variant_id: null, customization: { n: 'x' } }, { product_id: A, variant_id: null, customization: { n: 'y' } })).toBe(false);
  });
  it('is false for different variants or products', () => {
    expect(sameLine({ product_id: A, variant_id: B, customization: {} }, { product_id: A, variant_id: null, customization: {} })).toBe(false);
    expect(sameLine({ product_id: A, variant_id: null, customization: {} }, { product_id: B, variant_id: null, customization: {} })).toBe(false);
  });
  it('ignores key order', () => expect(sameCustomization({ a: '1', b: '2' }, { b: '2', a: '1' })).toBe(true));
});

describe('parseStoredCart', () => {
  it('returns [] for empty or broken JSON', () => {
    expect(parseStoredCart(null)).toEqual([]);
    expect(parseStoredCart('not json')).toEqual([]);
    expect(parseStoredCart('{"a":1}')).toEqual([]);
  });
  it('keeps valid rows and clamps quantity', () => {
    const rows = parseStoredCart(JSON.stringify([{ id: 'l1', product_id: A, variant_id: B, quantity: 500, customization: { recipient_name: 'Sam' } }]));
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(100);
    expect(rows[0].customization).toEqual({ recipient_name: 'Sam' });
  });
  it('drops rows with a bad product id (storage is user-editable)', () => {
    expect(parseStoredCart(JSON.stringify([{ product_id: "x'); drop table", quantity: 1 }]))).toEqual([]);
  });
  it('drops a bad variant id but keeps the row', () => {
    const rows = parseStoredCart(JSON.stringify([{ product_id: A, variant_id: 'nope', quantity: 1 }]));
    expect(rows[0].variant_id).toBeNull();
  });
  it('drops customisation keys with a bad shape', () => {
    const rows = parseStoredCart(JSON.stringify([{ product_id: A, quantity: 1, customization: { 'Bad Key': 'x', ok_key: 'y', n: 5 } }]));
    expect(rows[0].customization).toEqual({ ok_key: 'y' });
  });
});

describe('misc', () => {
  it('isUuid', () => {
    expect(isUuid(A)).toBe(true);
    expect(isUuid('abc')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
  it('cartCount sums quantities', () => expect(cartCount([{ quantity: 2 }, { quantity: 3 }])).toBe(5));
});

describe('format', () => {
  it('formatPrice shows rupees without paise when whole', () => expect(formatPrice(14900)).toContain('149'));
  it('formatPrice keeps paise when needed', () => expect(formatPrice(14950)).toContain('149.5'));
  it('gradientFor is stable', () => expect(gradientFor('abc')).toBe(gradientFor('abc')));
  it('deliveryText', () => {
    expect(deliveryText(4, 7)).toBe('Delivered in 4-7 days');
    expect(deliveryText(3, 3)).toBe('Delivered in about 3 days');
    expect(deliveryText(0, 0)).toBe('Instant delivery by message');
    expect(deliveryText(null, null)).toBeNull();
  });
});
