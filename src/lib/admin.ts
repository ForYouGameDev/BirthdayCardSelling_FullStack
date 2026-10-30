import { supabase } from './supabase';
import type { AppSettings, Category, CustomizationField, Order, Product, Variant, PriceTier, OrderStatus } from './types';

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// ---------- orders ----------
export async function adminListOrders(status?: string): Promise<Order[]> {
  let q = supabase.from('orders').select('*, order_items(*), order_events(*)').order('created_at', { ascending: false }).limit(300);
  if (status) q = q.eq('status', status);
  return check(await q);
}
export async function adminSetOrderStatus(id: string, status: OrderStatus, courier: string, tracking: string, note: string): Promise<void> {
  const { error } = await supabase.rpc('admin_set_order_status', { p_order: id, p_status: status, p_courier: courier || null, p_tracking: tracking || null, p_note: note || null });
  if (error) throw new Error(error.message);
}
export async function adminPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('personalization').createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

// ---------- products ----------
export async function adminListProducts(): Promise<Product[]> {
  return check(await supabase.from('products').select('*, categories(slug,name), product_images(id,path,alt,position)').order('created_at', { ascending: false }));
}
export async function adminGetProduct(id: string): Promise<Product> {
  return check(await supabase.from('products').select('*, product_images(*), product_variants(*), product_price_tiers(*)').eq('id', id).single());
}
export type ProductInput = Pick<Product, 'sku' | 'slug' | 'name' | 'description' | 'category_id' | 'product_type' | 'price_minor' | 'sale_price_minor' | 'track_inventory' | 'stock_qty' | 'is_active' | 'is_featured' | 'personalization_enabled' | 'delivery_min_days' | 'delivery_max_days'>;
export async function adminSaveProduct(input: ProductInput, id?: string): Promise<Product> {
  if (id) return check(await supabase.from('products').update(input).eq('id', id).select('*').single());
  return check(await supabase.from('products').insert(input).select('*').single());
}
export async function adminDeleteProduct(id: string): Promise<void> {
  check(await supabase.from('products').delete().eq('id', id).select('id'));
}
export async function adminToggleProduct(id: string, patch: { is_active?: boolean; is_featured?: boolean }): Promise<void> {
  check(await supabase.from('products').update(patch).eq('id', id).select('id'));
}

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export async function adminUploadProductImage(productId: string, file: File, position: number): Promise<void> {
  const ext = EXT[file.type];
  if (!ext) throw new Error('Only JPG, PNG or WEBP images are allowed.');
  if (file.size > 5 * 1048576) throw new Error('Image is larger than 5 MB.');
  const path = `${productId}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw new Error(up.error.message);
  check(await supabase.from('product_images').insert({ product_id: productId, path, alt: null, position }).select('id'));
}
export async function adminDeleteProductImage(id: string, path: string): Promise<void> {
  check(await supabase.from('product_images').delete().eq('id', id).select('id'));
  await supabase.storage.from('product-images').remove([path]);
}

export async function adminAddVariant(v: Omit<Variant, 'id'>): Promise<void> {
  check(await supabase.from('product_variants').insert(v).select('id'));
}
export async function adminDeleteVariant(id: string): Promise<void> {
  check(await supabase.from('product_variants').delete().eq('id', id).select('id'));
}
export async function adminAddTier(t: Omit<PriceTier, 'id'>): Promise<void> {
  check(await supabase.from('product_price_tiers').insert(t).select('id'));
}
export async function adminDeleteTier(id: string): Promise<void> {
  check(await supabase.from('product_price_tiers').delete().eq('id', id).select('id'));
}

// ---------- categories ----------
export async function adminListCategories(): Promise<(Category & { is_active: boolean })[]> {
  return check(await supabase.from('categories').select('*').order('sort_order'));
}
export async function adminSaveCategory(c: { slug: string; name: string; description: string | null; sort_order: number; is_active: boolean }, id?: string): Promise<void> {
  if (id) check(await supabase.from('categories').update(c).eq('id', id).select('id'));
  else check(await supabase.from('categories').insert(c).select('id'));
}
export async function adminDeleteCategory(id: string): Promise<void> {
  check(await supabase.from('categories').delete().eq('id', id).select('id'));
}

// ---------- personalisation fields ----------
export async function adminListFields(productId: string | null): Promise<CustomizationField[]> {
  const q = supabase.from('customization_fields').select('*').order('position');
  return check(await (productId ? q.eq('scope', 'product').eq('product_id', productId) : q.eq('scope', 'global')));
}
export type FieldInput = Omit<CustomizationField, 'id'>;
export async function adminSaveField(f: FieldInput, id?: string): Promise<void> {
  if (id) check(await supabase.from('customization_fields').update(f).eq('id', id).select('id'));
  else check(await supabase.from('customization_fields').insert(f).select('id'));
}
export async function adminDeleteField(id: string): Promise<void> {
  check(await supabase.from('customization_fields').delete().eq('id', id).select('id'));
}

// ---------- settings ----------
export async function adminSaveSettings(s: AppSettings): Promise<void> {
  check(await supabase.from('app_settings').update({ ...s, updated_at: new Date().toISOString() }).eq('id', 1).select('id'));
}
