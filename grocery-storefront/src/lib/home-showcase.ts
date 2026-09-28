import type { OpeningHoursEntry } from '@/types/storefront-config';

// Helpers for the "showcase" landing layout (homepage.showcase in the config).

const BULK_PACK = /karton|multipack|zestaw|\b\d+\s*x\s*\d|^\s*\d+\s*x\s/i;

/** A carton, multipack or gift set: fine in the catalogue, wrong as a landing-page pick. */
export function isBulkPack(name: string): boolean {
  return BULK_PACK.test(name);
}

/**
 * The product line a row belongs to: the first three words of the name once
 * sizes, counts and bracketed notes are gone, so "Buldak 140g" and
 * "Buldak 5 x 140g" share one key.
 */
export function productFamilyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1 && !/\d/.test(word))
    .slice(0, 3)
    .join(' ');
}

/** First `limit` rows with a photo, one per product family, no bulk packs; order kept. */
export function pickDiverseProducts<T extends { name: string; thumbnail?: { url?: string | null } | null }>(
  products: T[],
  limit: number,
): T[] {
  const seen = new Set<string>();
  const picked: T[] = [];
  for (const product of products) {
    if (picked.length >= limit) break;
    if (!product.thumbnail?.url || isBulkPack(product.name)) continue;
    const family = productFamilyKey(product.name);
    if (seen.has(family)) continue;
    seen.add(family);
    picked.push(product);
  }
  return picked;
}

export interface TodayHours {
  open: boolean;
  opens: string | null;
  closes: string | null;
}

/** Today's opening hours in Warsaw time; null when the shop publishes no hours. */
export function todayOpeningHours(entries: OpeningHoursEntry[] | undefined, now: Date = new Date()): TodayHours | null {
  if (!entries?.length) return null;
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: 'Europe/Warsaw' }).format(now);
  const entry = entries.find((candidate) => candidate.days?.includes(weekday));
  if (!entry?.opens || !entry.closes) return { open: false, opens: null, closes: null };
  return { open: true, opens: entry.opens, closes: entry.closes };
}
