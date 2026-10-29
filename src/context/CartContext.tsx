import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { clearCartItems, deleteCartItem, fetchCart, getFieldsFor, getProductsByIds, hydrate, insertCartItem, updateCartItemQty } from '../lib/api';
import { cartCount, parseStoredCart, sameLine } from '../lib/cart';
import { clampQty, lineTotals, maxQuantity } from '../lib/pricing';
import type { CartLine, CartRef } from '../lib/types';

const KEY = 'cart_v1';

type Ctx = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  loading: boolean;
  error: string | null;
  add: (ref: Omit<CartRef, 'id'>) => Promise<void>;
  setQty: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};

const CartContext = createContext<Ctx | null>(null);

function readLocal(): CartRef[] {
  try { return parseStoredCart(localStorage.getItem(KEY)); } catch { return []; }
}
function writeLocal(refs: CartRef[]) {
  try { localStorage.setItem(KEY, JSON.stringify(refs)); } catch { /* storage blocked: the cart just will not survive a reload */ }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id ?? null;
  const [refs, setRefs] = useState<CartRef[]>([]);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refsRef = useRef(refs);
  refsRef.current = refs;

  // Load: guest -> localStorage. Signed in -> database, after merging whatever the guest had in the browser.
  useEffect(() => {
    if (authLoading) return;
    let live = true;
    (async () => {
      setLoading(true);
      try {
        if (!uid) { if (live) setRefs(readLocal()); return; }
        let server = await fetchCart(uid);
        const local = readLocal();
        if (local.length) {
          for (const l of local) {
            const twin = server.find((s) => sameLine(s, l));
            if (twin) {
              const q = clampQty(twin.quantity + l.quantity, 100);
              await updateCartItemQty(twin.id, q);
              twin.quantity = q;
            } else {
              server.push(await insertCartItem(uid, { product_id: l.product_id, variant_id: l.variant_id, quantity: l.quantity, customization: l.customization }));
            }
          }
          try { localStorage.removeItem(KEY); } catch { /* ignore */ }
          server = await fetchCart(uid);
        }
        if (live) setRefs(server);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : 'Could not load your cart.');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [uid, authLoading]);

  // Re-fetch product details whenever the rows change so prices always come from the shop, not from the browser.
  useEffect(() => {
    let live = true;
    (async () => {
      if (!refs.length) { setLines([]); return; }
      try {
        const ids = Array.from(new Set(refs.map((r) => r.product_id)));
        const [products, fields] = await Promise.all([getProductsByIds(ids), getFieldsFor(ids)]);
        if (live) setLines(hydrate(refs, products, fields));
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : 'Could not load cart details.');
      }
    })();
    return () => { live = false; };
  }, [refs]);

  const persistLocal = (next: CartRef[]) => { if (!uid) writeLocal(next); };

  const add = useCallback(async (ref: Omit<CartRef, 'id'>) => {
    setError(null);
    const current = refsRef.current;
    const twin = current.find((r) => sameLine(r, ref));
    if (twin) {
      const q = clampQty(twin.quantity + ref.quantity, 100);
      if (uid) await updateCartItemQty(twin.id, q);
      const next = current.map((r) => (r.id === twin.id ? { ...r, quantity: q } : r));
      persistLocal(next); setRefs(next);
      return;
    }
    const created: CartRef = uid ? await insertCartItem(uid, ref) : { ...ref, id: `local_${Date.now()}_${current.length}` };
    const next = [...current, created];
    persistLocal(next); setRefs(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const setQty = useCallback(async (id: string, qty: number) => {
    setError(null);
    const line = lines.find((l) => l.id === id);
    const q = clampQty(qty, line ? Math.max(1, maxQuantity(line.product, line.variant)) : 100);
    if (uid) await updateCartItemQty(id, q);
    const next = refsRef.current.map((r) => (r.id === id ? { ...r, quantity: q } : r));
    persistLocal(next); setRefs(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, lines]);

  const remove = useCallback(async (id: string) => {
    setError(null);
    if (uid) await deleteCartItem(id);
    const next = refsRef.current.filter((r) => r.id !== id);
    persistLocal(next); setRefs(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const clear = useCallback(async () => {
    if (uid) await clearCartItems(uid);
    persistLocal([]); setRefs([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const subtotal = useMemo(() => lines.reduce((s, l) => s + lineTotals(l.product, l.variant, l.quantity, l.fields, l.customization).total, 0), [lines]);
  const value = useMemo<Ctx>(() => ({ lines, count: cartCount(refs), subtotal, loading, error, add, setQty, remove, clear }), [lines, refs, subtotal, loading, error, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): Ctx {
  const c = useContext(CartContext);
  if (!c) throw new Error('useCart must be used inside CartProvider');
  return c;
}
