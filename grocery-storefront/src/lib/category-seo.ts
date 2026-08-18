import { PUBLIC_CATEGORY_DEFINITIONS } from '@/lib/public-taxonomy';
import { normalizeSeoLocale } from '@/lib/seo-metadata';

export const CATEGORY_MIN_PRODUCTS_FOR_INDEX = 3;
export const CATEGORY_META_DESCRIPTION_MAX_LENGTH = 160;

// Categories merged in the catalog on 2026-08-18: each source category was
// deactivated after its products moved, so the old URL must permanently
// redirect to the surviving category instead of soft-404ing.
const MERGED_CATEGORY_REDIRECTS: Record<string, string> = {
  'sosy-sojowe': 'sos-sojowy',
  'sosy-i-marynaty': 'sosy-marynaty',
  'marynowane-warzywa-i-owoce': 'owoce-marynowane-warzywa',
  'oleje-sezamowe': 'oleje',
  'ryż-do-sushi-i-nie-tylko': 'ryż-i-inne-ziarna',
  'pasty': 'pasty-smakowe',
  'zupy-buliony': 'kluski-tteok-do-dań',
  'słodycze-japońskie': 'słodycze-przekąski',
  'świeże-produkty': 'przyprawy-jednoskładnikowe',
};

export function decodeCategorySlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    // Keep the raw route value; malformed escapes must not break rendering.
    return slug;
  }
}

export function resolveMergedCategoryTarget(slug: string): string | null {
  return MERGED_CATEGORY_REDIRECTS[decodeCategorySlug(slug)] ?? null;
}

export function getCategoryPathForLocale(locale: string, slug: string): string {
  const prefix = normalizeSeoLocale(locale) === 'en' ? '/en' : '';
  return `${prefix}/categories/${encodeURIComponent(slug)}`;
}

export function isDbCategoryIndexable(productCount: number | null): boolean {
  return (productCount ?? 0) >= CATEGORY_MIN_PRODUCTS_FOR_INDEX;
}

export function isPublicHubSlug(slug: string): boolean {
  const decoded = decodeCategorySlug(slug);
  return PUBLIC_CATEGORY_DEFINITIONS.some((definition) => definition.slug === decoded);
}

export function boundCategoryMetaDescription(
  description: string | null,
  fallback: string,
): string {
  const text = (description ?? '').replace(/\s+/g, ' ').trim() || fallback;
  if (text.length <= CATEGORY_META_DESCRIPTION_MAX_LENGTH) return text;

  const cut = text.slice(0, CATEGORY_META_DESCRIPTION_MAX_LENGTH - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const bounded = lastSpace > 80 ? cut.slice(0, lastSpace) : cut;
  return `${bounded.trimEnd()}…`;
}
