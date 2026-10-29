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
