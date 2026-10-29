// Personalisation rules. Pure functions, shared by the product page and the cart.
import type { Customization, CustomizationField, Product } from './types';

/**
 * Which fields does the customer see for this product?
 *  - If the product has personalisation switched off: none (and nothing is validated).
 *  - A product-level field REPLACES the global field with the same key (so it can change the label,
 *    make it required, change the price, or switch it off for this product only).
 *  - Disabled fields are hidden. The rest are sorted by their display order.
 */
export function resolveFields(product: Pick<Product, 'id' | 'personalization_enabled'>, all: CustomizationField[]): CustomizationField[] {
  if (!product.personalization_enabled) return [];
  const byKey = new Map<string, CustomizationField>();
  for (const f of all) if (f.scope === 'global') byKey.set(f.key, f);
  for (const f of all) if (f.scope === 'product' && f.product_id === product.id) byKey.set(f.key, f);
  return Array.from(byKey.values()).filter((f) => f.is_enabled).sort((a, b) => a.position - b.position || a.key.localeCompare(b.key));
}

export type FileLike = { type: string; size: number; name?: string };

export function validateFile(field: CustomizationField, file: FileLike): string | null {
  if (!field.allowed_mime_types.includes(file.type)) {
    const names = field.allowed_mime_types.map((t) => t.replace('image/', '').toUpperCase()).join(', ');
    return `${field.label}: only ${names} files are allowed.`;
  }
  if (file.size > field.max_file_bytes) {
    return `${field.label}: the file is too large (max ${Math.round(field.max_file_bytes / 1048576 * 10) / 10} MB).`;
  }
  if (file.size === 0) return `${field.label}: the file is empty.`;
  return null;
}

/**
 * Returns {field_key: error message}. An empty object means the input is valid.
 * `pendingFiles` are photos the customer picked but that are not uploaded yet.
 */
export function validateCustomization(
  fields: CustomizationField[],
  values: Customization,
  pendingFiles: Record<string, FileLike | undefined> = {},
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const raw = values[f.key];
    const v = typeof raw === 'string' ? raw.trim() : '';
    if (f.field_type === 'photo') {
      const file = pendingFiles[f.key];
      if (file) {
        const e = validateFile(f, file);
        if (e) errors[f.key] = e;
      } else if (f.is_required && !v) {
        errors[f.key] = `${f.label} is required.`;
      }
      continue;
    }
    if (!v) {
      if (f.is_required) errors[f.key] = `${f.label} is required.`;
      continue;
    }
    if ((f.field_type === 'text' || f.field_type === 'textarea') && f.max_length != null && v.length > f.max_length) {
      errors[f.key] = `${f.label} can be at most ${f.max_length} characters.`;
    } else if (f.field_type === 'select' && !f.options.includes(v)) {
      errors[f.key] = `Please choose a valid option for ${f.label}.`;
    }
  }
  return errors;
}

/** Keep only values for fields that are visible, trimmed and non-empty. */
export function cleanCustomization(fields: CustomizationField[], values: Customization): Customization {
  const out: Customization = {};
  for (const f of fields) {
    const v = values[f.key];
    if (typeof v === 'string' && v.trim() !== '') out[f.key] = v.trim();
  }
  return out;
}
