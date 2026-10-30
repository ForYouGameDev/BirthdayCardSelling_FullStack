import { describe, expect, it } from 'vitest';
import { normalizePhone, validateAddress } from '../src/lib/validation';

const ok = { label: null, full_name: 'Asha Rao', phone: '9876543210', line1: '12 MG Road', line2: null, city: 'Pune', state: 'Maharashtra', postal_code: '411001', country: 'IN' };

describe('validateAddress', () => {
  it('accepts a good address', () => expect(validateAddress(ok)).toEqual({}));
  it('accepts +91 and spaces in the phone', () => expect(validateAddress({ ...ok, phone: '+91 98765-43210' })).toEqual({}));
  it('rejects a short or wrong phone', () => {
    expect(validateAddress({ ...ok, phone: '12345' }).phone).toBeTruthy();
    expect(validateAddress({ ...ok, phone: '5876543210' }).phone).toBeTruthy();
  });
  it('rejects a bad PIN code', () => {
    expect(validateAddress({ ...ok, postal_code: '12345' }).postal_code).toBeTruthy();
    expect(validateAddress({ ...ok, postal_code: '011001' }).postal_code).toBeTruthy();
  });
  it('requires name, street, city and state', () => {
    expect(Object.keys(validateAddress({ ...ok, full_name: '', line1: '', city: '', state: '' })).sort()).toEqual(['city', 'full_name', 'line1', 'state']);
  });
});
describe('normalizePhone', () => {
  it('strips country code and separators', () => expect(normalizePhone('+91 98765 43210')).toBe('9876543210'));
});
