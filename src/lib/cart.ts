// Cart helpers that need no network. Used by CartContext.
import type { CartRef, Customization } from './types';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID_RE.test(s);

export function sameCustomization(a: Customization, b: Customization): boolean {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (ka.length !== kb.length) return false;
  return ka.every((k, i) => k === kb[i] && a[k] === b[k]);
}

/** Two cart rows are the "same card" if product, variant and personalisation are identical. */
export function sameLine(a: Pick<CartRef, 'product_id' | 'variant_id' | 'customization'>, b: Pick<CartRef, 'product_id' | 'variant_id' | 'customization'>): boolean {
  return a.product_id === b.product_id && (a.variant_id ?? null) === (b.variant_id ?? null) && sameCustomization(a.customization, b.customization);
}

/** Read guest cart rows from stored JSON. Anything malformed is dropped (the browser storage is user-editable). */
export function parseStoredCart(raw: string | null): CartRef[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const out: CartRef[] = [];
    for (const r of data) {
      if (!r || typeof r !== 'object') continue;
      const o = r as Record<string, unknown>;
      if (!isUuid(o.product_id)) continue;
      const variant = o.variant_id == null ? null : isUuid(o.variant_id) ? o.variant_id : null;
      const qty = typeof o.quantity === 'number' && Number.isInteger(o.quantity) ? Math.max(1, Math.min(100, o.quantity)) : 1;
      const cust: Customization = {};
      if (o.customization && typeof o.customization === 'object') {
        for (const [k, v] of Object.entries(o.customization as Record<string, unknown>)) {
          if (typeof v === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(k)) cust[k] = v.slice(0, 2000);
        }
      }
      out.push({ id: typeof o.id === 'string' ? o.id : `local_${out.length}_${Date.now()}`, product_id: o.product_id, variant_id: variant, quantity: qty, customization: cust });
    }
    return out;
  } catch {
    return [];
  }
}

export function cartCount(refs: Pick<CartRef, 'quantity'>[]): number {
  return refs.reduce((n, r) => n + r.quantity, 0);
}
