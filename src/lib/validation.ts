import type { AddressInput } from './types';

/** Returns {field: message}. Empty object = valid. Indian addresses: 10-digit mobile, 6-digit PIN. */
export function validateAddress(a: AddressInput): Record<string, string> {
  const e: Record<string, string> = {};
  if (a.full_name.trim().length < 2) e.full_name = 'Enter the full name.';
  if (!/^[6-9]\d{9}$/.test(a.phone.replace(/[\s-]/g, '').replace(/^(\+91|91|0)/, ''))) e.phone = 'Enter a valid 10-digit mobile number.';
  if (a.line1.trim().length < 3) e.line1 = 'Enter the house / street address.';
  if (a.city.trim().length < 2) e.city = 'Enter the city.';
  if (a.state.trim().length < 2) e.state = 'Enter the state.';
  if (!/^[1-9]\d{5}$/.test(a.postal_code.trim())) e.postal_code = 'Enter a valid 6-digit PIN code.';
  return e;
}

export function normalizePhone(p: string): string {
  return p.replace(/[\s-]/g, '').replace(/^(\+91|91|0)/, '');
}

export const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Waiting for payment', placed: 'Order placed', confirmed: 'Confirmed', processing: 'Being prepared',
  shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled',
};
