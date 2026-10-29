import { describe, expect, it } from 'vitest';
import { cleanCustomization, resolveFields, validateCustomization, validateFile } from '../src/lib/customization';
import type { CustomizationField } from '../src/lib/types';

function f(over: Partial<CustomizationField>): CustomizationField {
  return {
    id: over.key ?? 'id', scope: 'global', product_id: null, key: 'message', label: 'Message', help_text: null, field_type: 'textarea',
    is_enabled: true, is_required: false, max_length: 10, allowed_mime_types: ['image/png', 'image/jpeg'], max_file_bytes: 1000,
    options: [], extra_price_minor: 0, position: 1, ...over,
  };
}

const P = { id: 'prod-1', personalization_enabled: true };

describe('resolveFields', () => {
  const globalFields = [
    f({ key: 'name', label: 'Name', field_type: 'text', position: 1 }),
    f({ key: 'message', label: 'Message', position: 2 }),
    f({ key: 'photo', label: 'Photo', field_type: 'photo', position: 3 }),
  ];
  it('returns global fields in display order', () => {
    expect(resolveFields(P, globalFields).map((x) => x.key)).toEqual(['name', 'message', 'photo']);
  });
  it('returns nothing when personalisation is off for the product', () => {
    expect(resolveFields({ id: 'prod-1', personalization_enabled: false }, globalFields)).toEqual([]);
  });
  it('hides disabled fields', () => {
    const all = [...globalFields.slice(0, 2), f({ key: 'photo', field_type: 'photo', is_enabled: false })];
    expect(resolveFields(P, all).map((x) => x.key)).toEqual(['name', 'message']);
  });
  it('a product-level field overrides the global one with the same key', () => {
    const all = [...globalFields, f({ scope: 'product', product_id: 'prod-1', key: 'message', label: 'Long message', max_length: 500, is_required: true, position: 2 })];
    const m = resolveFields(P, all).find((x) => x.key === 'message');
    expect(m?.label).toBe('Long message');
    expect(m?.max_length).toBe(500);
  });
  it('a product-level disabled row hides a global field for that product only', () => {
    const all = [...globalFields, f({ scope: 'product', product_id: 'prod-1', key: 'photo', field_type: 'photo', is_enabled: false })];
    expect(resolveFields(P, all).map((x) => x.key)).toEqual(['name', 'message']);
    expect(resolveFields({ id: 'prod-2', personalization_enabled: true }, all).map((x) => x.key)).toEqual(['name', 'message', 'photo']);
  });
  it('ignores product-level rows that belong to another product', () => {
    const all = [...globalFields, f({ scope: 'product', product_id: 'prod-2', key: 'message', label: 'Other', position: 2 })];
    expect(resolveFields(P, all).find((x) => x.key === 'message')?.label).toBe('Message');
  });
});

describe('validateCustomization', () => {
  const fields = [
    f({ key: 'name', label: 'Name', field_type: 'text', is_required: true, max_length: 5 }),
    f({ key: 'msg', label: 'Message', is_required: false, max_length: 10 }),
    f({ key: 'colour', label: 'Colour', field_type: 'select', options: ['Red', 'Blue'] }),
    f({ key: 'photo', label: 'Photo', field_type: 'photo', is_required: true }),
  ];
  it('accepts valid input', () => {
    expect(validateCustomization(fields, { name: 'Sam', colour: 'Red', photo: 'u/p.png' })).toEqual({});
  });
  it('requires required fields', () => {
    const e = validateCustomization(fields, {});
    expect(Object.keys(e).sort()).toEqual(['name', 'photo']);
  });
  it('treats whitespace as empty', () => expect(validateCustomization(fields, { name: '   ', photo: 'x' }).name).toBeTruthy());
  it('enforces max length', () => expect(validateCustomization(fields, { name: 'Samantha', photo: 'x' }).name).toContain('at most 5'));
  it('rejects an option that is not in the list', () => expect(validateCustomization(fields, { name: 'Sam', colour: 'Green', photo: 'x' }).colour).toBeTruthy());
  it('a picked photo satisfies a required photo field', () => {
    expect(validateCustomization(fields, { name: 'Sam' }, { photo: { type: 'image/png', size: 500 } })).toEqual({});
  });
  it('rejects a photo of the wrong type', () => {
    expect(validateCustomization(fields, { name: 'Sam' }, { photo: { type: 'application/pdf', size: 500 } }).photo).toContain('allowed');
  });
  it('rejects a photo that is too big', () => {
    expect(validateCustomization(fields, { name: 'Sam' }, { photo: { type: 'image/png', size: 5000 } }).photo).toContain('too large');
  });
  it('does not validate fields that are not shown', () => {
    expect(validateCustomization([], { name: '' })).toEqual({});
  });
});

describe('validateFile', () => {
  const photo = f({ key: 'photo', label: 'Photo', field_type: 'photo' });
  it('accepts an allowed file', () => expect(validateFile(photo, { type: 'image/jpeg', size: 10 })).toBeNull());
  it('rejects an empty file', () => expect(validateFile(photo, { type: 'image/jpeg', size: 0 })).toContain('empty'));
});

describe('cleanCustomization', () => {
  it('keeps only visible, non-empty, trimmed values', () => {
    const fields = [f({ key: 'name', field_type: 'text' }), f({ key: 'msg' })];
    expect(cleanCustomization(fields, { name: '  Sam ', msg: '  ', hidden: 'secret' })).toEqual({ name: 'Sam' });
  });
});
