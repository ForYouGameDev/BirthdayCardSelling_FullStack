import { supabase } from './supabase';
import { resolveFields } from './customization';
import type { CartLine, CartRef, Category, Customization, CustomizationField, Product } from './types';
import { isUuid } from './cart';

const PRODUCT_SELECT = '*, categories(slug,name), product_images(id,path,alt,position), product_variants(*), product_price_tiers(*)';

function tidy(p: Product): Product {
  return {
    ...p,
    product_images: [...(p.product_images ?? [])].sort((a, b) => a.position - b.position),
    product_variants: [...(p.product_variants ?? [])].filter((v) => v.is_active).sort((a, b) => a.position - b.position),
    product_price_tiers: [...(p.product_price_tiers ?? [])].sort((a, b) => a.min_qty - b.min_qty),
  };
}

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function listCategories(): Promise<Category[]> {
  return check(await supabase.from('categories').select('id,slug,name,description,sort_order').eq('is_active', true).order('sort_order'));
}

export type ProductQuery = { q?: string; category?: string; sort?: 'new' | 'price_asc' | 'price_desc' | 'popular'; featured?: boolean; limit?: number };

export async function listProducts(opts: ProductQuery = {}): Promise<Product[]> {
  let q = supabase.from('products').select(PRODUCT_SELECT).eq('is_active', true);
  if (opts.featured) q = q.eq('is_featured', true);
  if (opts.category) {
    const cats = await listCategories();
    const c = cats.find((x) => x.slug === opts.category);
    if (!c) return [];
    q = q.eq('category_id', c.id);
  }
  if (opts.q?.trim()) {
    // strip characters that have meaning inside a PostgREST filter
    const term = opts.q.trim().replace(/[%,()*\\]/g, ' ').slice(0, 60);
    if (term) q = q.or(`name.ilike.%${term}%,description.ilike.%${term}%,sku.ilike.%${term}%`);
  }
  const sort = opts.sort ?? 'new';
  q = sort === 'price_asc' ? q.order('effective_price_minor', { ascending: true })
    : sort === 'price_desc' ? q.order('effective_price_minor', { ascending: false })
    : sort === 'popular' ? q.order('sold_count', { ascending: false })
    : q.order('created_at', { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  return check(await q).map(tidy);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const rows = check(await supabase.from('products').select(PRODUCT_SELECT).eq('slug', slug).eq('is_active', true).limit(1));
  return rows.length ? tidy(rows[0] as Product) : null;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  const safe = ids.filter(isUuid);
  if (!safe.length) return [];
  return check(await supabase.from('products').select(PRODUCT_SELECT).in('id', safe)).map(tidy);
}

/** Global fields plus the product-level overrides for the given products. */
export async function getFieldsFor(productIds: string[]): Promise<CustomizationField[]> {
  const safe = productIds.filter(isUuid);
  let q = supabase.from('customization_fields').select('*');
  q = safe.length ? q.or(`scope.eq.global,product_id.in.(${safe.join(',')})`) : q.eq('scope', 'global');
  return check(await q);
}

export function hydrate(refs: CartRef[], products: Product[], fields: CustomizationField[]): CartLine[] {
  const out: CartLine[] = [];
  for (const r of refs) {
    const product = products.find((p) => p.id === r.product_id);
    if (!product || !product.is_active) continue; // product was removed or hidden
    const variant = r.variant_id ? (product.product_variants ?? []).find((v) => v.id === r.variant_id) ?? null : null;
    out.push({ ...r, product, variant, fields: resolveFields(product, fields) });
  }
  return out;
}

// ---------- signed-in cart ----------
async function ensureCartId(userId: string): Promise<string> {
  const found = check(await supabase.from('carts').select('id').eq('user_id', userId).limit(1));
  if (found.length) return found[0].id as string;
  const made = await supabase.from('carts').insert({ user_id: userId }).select('id').single();
  if (made.error) {
    // another tab may have created it at the same moment
    const again = check(await supabase.from('carts').select('id').eq('user_id', userId).limit(1));
    if (again.length) return again[0].id as string;
    throw new Error(made.error.message);
  }
  return made.data.id as string;
}

export async function fetchCart(userId: string): Promise<CartRef[]> {
  const cartId = await ensureCartId(userId);
  const rows = check(await supabase.from('cart_items').select('id,product_id,variant_id,quantity,customization').eq('cart_id', cartId).order('created_at'));
  return rows.map((r) => ({ id: r.id as string, product_id: r.product_id as string, variant_id: (r.variant_id as string | null) ?? null, quantity: r.quantity as number, customization: (r.customization ?? {}) as Customization }));
}

export async function insertCartItem(userId: string, ref: Omit<CartRef, 'id'>): Promise<CartRef> {
  const cartId = await ensureCartId(userId);
  const row = check(await supabase.from('cart_items').insert({ cart_id: cartId, product_id: ref.product_id, variant_id: ref.variant_id, quantity: ref.quantity, customization: ref.customization }).select('id').single());
  return { ...ref, id: (row as { id: string }).id };
}

export async function updateCartItemQty(id: string, quantity: number): Promise<void> {
  check(await supabase.from('cart_items').update({ quantity }).eq('id', id).select('id'));
}

export async function deleteCartItem(id: string): Promise<void> {
  check(await supabase.from('cart_items').delete().eq('id', id).select('id'));
}

export async function clearCartItems(userId: string): Promise<void> {
  const cartId = await ensureCartId(userId);
  check(await supabase.from('cart_items').delete().eq('cart_id', cartId).select('id'));
}

// ---------- personalisation photo (private bucket, folder = user id) ----------
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export async function uploadPersonalPhoto(userId: string, file: File): Promise<string> {
  const ext = EXT[file.type];
  if (!ext) throw new Error('Only JPG, PNG or WEBP photos are allowed.');
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('personalization').upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return path;
}

export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('personalization').createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}
