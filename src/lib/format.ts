export function formatPrice(minor: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: minor % 100 === 0 ? 0 : 2 }).format(minor / 100);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** Deterministic gradient so every card without a photo still looks designed. */
export function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const a = h % 360;
  const b = (a + 40 + (h % 80)) % 360;
  return `linear-gradient(150deg, hsl(${a} 78% 62%), hsl(${b} 80% 48%))`;
}

export function deliveryText(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  const lo = min ?? max ?? 0;
  const hi = max ?? min ?? 0;
  if (hi === 0) return 'Instant delivery by message';
  return lo === hi ? `Delivered in about ${lo} days` : `Delivered in ${lo}-${hi} days`;
}

/** "149" or "149.50" typed by an admin -> 14950 paise. Returns null when it is not a valid amount. */
export function rupeesToMinor(input: string): number | null {
  const t = input.trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
}
export function minorToRupees(minor: number | null | undefined): string {
  if (minor == null) return '';
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);
}
export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
