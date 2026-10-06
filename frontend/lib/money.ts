/** Money is integer cents everywhere; convert only at render. 7999 -> "$79.99". */
export function centsToDollars(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100).toLocaleString('en-US')}.${String(abs % 100).padStart(2, '0')}`;
}

/** Parses a whole-cents string. Returns null for anything that isn't a plain integer. */
export function parseCents(input: string): number | null {
  const trimmed = input.trim();
  return /^-?\d+$/.test(trimmed) ? Number(trimmed) : null;
}
