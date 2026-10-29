export type Category = { id: string; slug: string; name: string; description: string | null; sort_order: number };

export type ProductImage = { id: string; path: string; alt: string | null; position: number };

export type Variant = {
  id: string; product_id: string; label: string;
  size: string | null; finish: string | null; paper: string | null;
  price_delta_minor: number; stock_qty: number | null; is_active: boolean; position: number;
};

export type PriceTier = { id: string; product_id: string; min_qty: number; unit_price_minor: number };

export type FieldType = 'text' | 'textarea' | 'select' | 'photo';

export type CustomizationField = {
  id: string; scope: 'global' | 'product'; product_id: string | null;
  key: string; label: string; help_text: string | null; field_type: FieldType;
  is_enabled: boolean; is_required: boolean; max_length: number | null;
  allowed_mime_types: string[]; max_file_bytes: number; options: string[];
  extra_price_minor: number; position: number;
};

export type Product = {
  id: string; sku: string; slug: string; name: string; description: string | null;
  category_id: string | null; product_type: 'physical' | 'digital' | 'both';
  price_minor: number; sale_price_minor: number | null; effective_price_minor: number; currency: string;
  track_inventory: boolean; stock_qty: number; in_stock: boolean;
  is_active: boolean; is_featured: boolean; is_sample: boolean; personalization_enabled: boolean;
  delivery_min_days: number | null; delivery_max_days: number | null; sold_count: number; created_at: string;
  categories?: { slug: string; name: string } | null;
  product_images?: ProductImage[];
  product_variants?: Variant[];
  product_price_tiers?: PriceTier[];
};

/** {field_key: value}. Photo fields hold a path in the private "personalization" bucket. */
export type Customization = Record<string, string>;

/** What is stored for one cart row (in the browser for guests, in cart_items for signed-in users). */
export type CartRef = { id: string; product_id: string; variant_id: string | null; quantity: number; customization: Customization };

/** A cart row joined with its product, chosen variant and the personalisation fields that apply to it. */
export type CartLine = CartRef & { product: Product; variant: Variant | null; fields: CustomizationField[] };

export type Profile = {
  id: string; email: string | null; full_name: string | null; phone: string | null; avatar_url: string | null;
  role: 'user' | 'admin'; created_at: string;
};
