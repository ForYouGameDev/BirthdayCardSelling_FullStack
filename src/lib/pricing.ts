// Price PREVIEW rules (what the customer sees in the shop and cart). Pure functions, no network.
// Batch 2 repeats these rules on the server when an order is created: the server's numbers are the ones that are charged.
//
//   unit price  = min(effective price, tier price for the quantity) + variant price delta
//   personalisation charge (per card) = sum of extra_price of the enabled fields the customer filled in
//   line total  = (unit price + personalisation charge) * quantity
import type { CustomizationField, Customization, PriceTier, Product, Variant } from './types';

export const MAX_QTY = 100;

export function effectivePrice(p: Pick<Product, 'price_minor' | 'sale_price_minor'>): number {
  return p.sale_price_minor ?? p.price_minor;
}

/** The base unit price for a quantity. A tier never makes a card cost MORE than its current price. */
export function baseUnitPrice(p: Pick<Product, 'price_minor' | 'sale_price_minor'>, tiers: PriceTier[] | undefined, qty: number): number {
  const base = effectivePrice(p);
  let best: PriceTier | null = null;
  for (const t of tiers ?? []) {
    if (qty >= t.min_qty && (!best || t.min_qty > best.min_qty)) best = t;
  }
  return best ? Math.min(base, best.unit_price_minor) : base;
}

export function unitPrice(p: Pick<Product, 'price_minor' | 'sale_price_minor'> & { product_price_tiers?: PriceTier[] }, variant: Pick<Variant, 'price_delta_minor'> | null, qty: number): number {
  return baseUnitPrice(p, p.product_price_tiers, qty) + (variant?.price_delta_minor ?? 0);
}

function filled(v: string | undefined): boolean {
  return typeof v === 'string' && v.trim() !== '';
}

/** Extra charge per card for the personalisation fields that were filled in. Only enabled fields count. */
export function customizationCharge(fields: CustomizationField[], values: Customization): number {
  let sum = 0;
  for (const f of fields) {
    if (f.is_enabled && filled(values[f.key])) sum += f.extra_price_minor;
  }
  return sum;
}

export type LineTotals = { unit: number; charge: number; total: number };

export function lineTotals(
  p: Pick<Product, 'price_minor' | 'sale_price_minor'> & { product_price_tiers?: PriceTier[] },
  variant: Pick<Variant, 'price_delta_minor'> | null,
  qty: number,
  fields: CustomizationField[],
  values: Customization,
): LineTotals {
  const unit = unitPrice(p, variant, qty);
  const charge = customizationCharge(fields, values);
  return { unit, charge, total: (unit + charge) * qty };
}

/** How many cards can be bought at most. Untracked stock is capped at MAX_QTY. */
export function maxQuantity(p: Pick<Product, 'track_inventory' | 'stock_qty'>, variant: Pick<Variant, 'stock_qty'> | null): number {
  if (!p.track_inventory) return MAX_QTY;
  const stock = variant && variant.stock_qty != null ? variant.stock_qty : p.stock_qty;
  return Math.max(0, Math.min(MAX_QTY, stock));
}

export function clampQty(n: number, max: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(Math.floor(n), Math.max(1, max)));
}
