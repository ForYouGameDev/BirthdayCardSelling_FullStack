import { describe, expect, it } from 'vitest';
import { baseUnitPrice, clampQty, customizationCharge, effectivePrice, lineTotals, maxQuantity, unitPrice } from '../src/lib/pricing';
import type { CustomizationField, PriceTier } from '../src/lib/types';

const tiers: PriceTier[] = [
  { id: 'a', product_id: 'p', min_qty: 5, unit_price_minor: 11000 },
  { id: 'b', product_id: 'p', min_qty: 10, unit_price_minor: 9900 },
];
const product = { price_minor: 14900, sale_price_minor: 12900 as number | null, product_price_tiers: tiers };

function field(over: Partial<CustomizationField>): CustomizationField {
  return {
    id: 'f', scope: 'global', product_id: null, key: 'photo', label: 'Photo', help_text: null, field_type: 'photo',
    is_enabled: true, is_required: false, max_length: null, allowed_mime_types: ['image/png'], max_file_bytes: 1000,
    options: [], extra_price_minor: 5000, position: 1, ...over,
  };
}

describe('effectivePrice', () => {
  it('uses the sale price when there is one', () => expect(effectivePrice(product)).toBe(12900));
  it('falls back to the normal price', () => expect(effectivePrice({ price_minor: 14900, sale_price_minor: null })).toBe(14900));
});

describe('quantity tiers', () => {
  it('uses the base price below the first tier', () => expect(baseUnitPrice(product, tiers, 4)).toBe(12900));
  it('uses the first tier from its minimum quantity', () => expect(baseUnitPrice(product, tiers, 5)).toBe(11000));
  it('uses the best matching tier', () => {
    expect(baseUnitPrice(product, tiers, 9)).toBe(11000);
    expect(baseUnitPrice(product, tiers, 10)).toBe(9900);
    expect(baseUnitPrice(product, tiers, 99)).toBe(9900);
  });
  it('never charges more than the current price', () => {
    const odd: PriceTier[] = [{ id: 'x', product_id: 'p', min_qty: 2, unit_price_minor: 20000 }];
    expect(baseUnitPrice(product, odd, 2)).toBe(12900);
  });
  it('works with no tiers', () => expect(baseUnitPrice(product, undefined, 50)).toBe(12900));
});

describe('variants', () => {
  it('adds the variant price delta', () => expect(unitPrice(product, { price_delta_minor: 2000 }, 1)).toBe(14900));
  it('adds the delta on top of a tier price', () => expect(unitPrice(product, { price_delta_minor: 2000 }, 5)).toBe(13000));
  it('no variant means no delta', () => expect(unitPrice(product, null, 1)).toBe(12900));
});

describe('personalisation charge', () => {
  const fields = [field({ key: 'photo', extra_price_minor: 5000 }), field({ id: 'g', key: 'message', field_type: 'textarea', extra_price_minor: 0 })];
  it('charges only for filled fields', () => {
    expect(customizationCharge(fields, { message: 'Hi' })).toBe(0);
    expect(customizationCharge(fields, { photo: 'u/p.png', message: 'Hi' })).toBe(5000);
  });
  it('ignores blank values', () => expect(customizationCharge(fields, { photo: '   ' })).toBe(0));
  it('ignores disabled fields', () => expect(customizationCharge([field({ is_enabled: false })], { photo: 'u/p.png' })).toBe(0));
});

describe('lineTotals', () => {
  it('multiplies unit + personalisation charge by quantity', () => {
    const r = lineTotals(product, { price_delta_minor: 2000 }, 5, [field({})], { photo: 'u/p.png' });
    expect(r).toEqual({ unit: 13000, charge: 5000, total: (13000 + 5000) * 5 });
  });
  it('is exact for a single plain card', () => expect(lineTotals(product, null, 1, [], {}).total).toBe(12900));
});

describe('stock', () => {
  it('untracked stock is capped at 100', () => expect(maxQuantity({ track_inventory: false, stock_qty: 0 }, null)).toBe(100));
  it('uses product stock', () => expect(maxQuantity({ track_inventory: true, stock_qty: 7 }, null)).toBe(7));
  it('variant stock wins when set', () => expect(maxQuantity({ track_inventory: true, stock_qty: 7 }, { stock_qty: 2 })).toBe(2));
  it('null variant stock falls back to the product', () => expect(maxQuantity({ track_inventory: true, stock_qty: 7 }, { stock_qty: null })).toBe(7));
  it('zero stock means zero', () => expect(maxQuantity({ track_inventory: true, stock_qty: 0 }, null)).toBe(0));
  it('clampQty keeps the value in range', () => {
    expect(clampQty(0, 5)).toBe(1);
    expect(clampQty(9, 5)).toBe(5);
    expect(clampQty(3.7, 5)).toBe(3);
    expect(clampQty(NaN, 5)).toBe(1);
  });
});
