export type CuisineKey = 'japanese' | 'korean' | 'chinese' | 'thai' | 'vietnamese';

export interface CuisineLink {
  key: CuisineKey;
  /** Polish country name exactly as stored in `products.country_of_origin`. */
  country: string;
}

// The "Kuchnie" menu: one entry per country of origin the catalog is built
// around, ordered by catalog size (27/09/2026: JP 441 · KR 418 · CN 334 ·
// TH 174 · VN 60). Labels come from `nav.cuisine.<key>`.
export const CUISINE_LINKS: CuisineLink[] = [
  { key: 'japanese', country: 'Japonia' },
  { key: 'korean', country: 'Korea Południowa' },
  { key: 'chinese', country: 'Chiny' },
  { key: 'thai', country: 'Tajlandia' },
  { key: 'vietnamese', country: 'Wietnam' },
];

export function buildCuisineHref(country: string): string {
  return `/products?country=${encodeURIComponent(country)}`;
}
