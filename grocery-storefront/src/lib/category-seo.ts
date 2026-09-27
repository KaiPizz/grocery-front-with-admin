// Dependency-free on purpose: node --test imports this file directly
// (tests/category-seo.test.mjs checks the redirect maps against the tree).

export const CATEGORY_MIN_PRODUCTS_FOR_INDEX = 3;
export const CATEGORY_META_DESCRIPTION_MAX_LENGTH = 160;

// Categories merged in the catalog on 2026-08-18: each source category was
// deactivated after its products moved, so the old URL must permanently
// redirect to the surviving category instead of soft-404ing. Targets follow
// the 2026-09-27 tree slugs.
export const MERGED_CATEGORY_REDIRECTS: Record<string, string> = {
  'sosy-sojowe': 'sos-sojowy',
  'sosy-i-marynaty': 'majonez-ketchup-i-inne-sosy',
  'oleje-sezamowe': 'oleje',
  'ryż-do-sushi-i-nie-tylko': 'ryz-i-ziarna',
  'pasty': 'pasty-gochujang-curry-hot-pot',
  'zupy-buliony': 'kluski-tteok-i-mochi-ryzowe',
  'słodycze-japońskie': 'ciastka-wafle-i-choco-pie',
  'świeże-produkty': 'przyprawy-i-furikake',
};

// The 2026-09-27 category tree renamed or merged these leaves (backend
// `scripts/adg/category-tree.json`, copied to tests/fixtures: every `from`
// whose slug changed and every `mergeFrom`). Old URLs keep working as
// permanent redirects — but only once the old slug is no longer live, see
// resolveCategoryRedirect.
export const RENAMED_CATEGORY_REDIRECTS: Record<string, string> = {
  'ramyun-ramen': 'ramyun-w-paczce',
  'duża-micha': 'ramyun-w-kubku-i-misce',
  'makaron-pszenny': 'makaron-pszenny-udon-i-soba',
  'makaron-gryczany': 'makaron-pszenny-udon-i-soba',
  'makarony': 'makaron-pszenny-udon-i-soba',
  'makaron-ryżowy': 'makaron-ryzowy-i-szklisty',
  'makaron-szklisty': 'makaron-ryzowy-i-szklisty',
  'kluski-tteok-do-dań': 'kluski-tteok-i-mochi-ryzowe',
  'japońskie-ciasto-ryżowe': 'kluski-tteok-i-mochi-ryzowe',
  'ryż-i-inne-ziarna': 'ryz-i-ziarna',
  'sosy-marynaty': 'majonez-ketchup-i-inne-sosy',
  'sosy-marynaty-oleje': 'majonez-ketchup-i-inne-sosy',
  'pasty-smakowe': 'pasty-gochujang-curry-hot-pot',
  'przyprawy': 'przyprawy-i-furikake',
  'przyprawy-jednoskładnikowe': 'przyprawy-i-furikake',
  'octy-i-winne-przyprawy': 'octy',
  'ocet-ryżowy-do-sushi': 'octy',
  'buliony': 'buliony-i-dashi',
  'wasabi': 'wasabi-sezam-i-sol',
  'sezam': 'wasabi-sezam-i-sol',
  'sól': 'wasabi-sezam-i-sol',
  'owoce-marynowane-warzywa': 'marynowane-warzywa-i-owoce',
  'słodycze-przekąski': 'ciastka-wafle-i-choco-pie',
  'kawy': 'kawy-i-syropy',
  'syropy': 'kawy-i-syropy',
  'napoje': 'soki-herbaty-gotowe-i-napoje-owocowe',
  'arkusze-nori-gim': 'algi-nori-wakame-kombu',
  'wakame-miyeok': 'algi-nori-wakame-kombu',
  'kombu-dasima': 'algi-nori-wakame-kombu',
  'grzyby-shiitake': 'grzyby-suszone',
  'grzyby-mun': 'grzyby-suszone',
  'inne-grzyby-azjatyckie': 'grzyby-suszone',
  'mąki-panierki-tapioka': 'maki-panierki-i-tapioka',
  'papier-ryżowy': 'papier-ryzowy',
  'pałeczki-i-sztućce': 'paleczki-i-sztucce',
  'noże': 'noze',
  'patelnie-wok-grill': 'patelnie-wok-i-grill',
  'komplety-do-sushi-i-herbaty': 'miski-kubki-i-naczynia',
  'miski': 'miski-kubki-i-naczynia',
  'naczynia': 'miski-kubki-i-naczynia',
  'zaparzacze-do-kawy': 'miski-kubki-i-naczynia',
  'parowary-bambusowe': 'parowary-maty-foremki-i-zestawy-do-sushi',
  'maty-do-zwijania': 'parowary-maty-foremki-i-zestawy-do-sushi',
  'foremki': 'parowary-maty-foremki-i-zestawy-do-sushi',
  'zestawy-do-sushi': 'parowary-maty-foremki-i-zestawy-do-sushi',
  'moździerze': 'parowary-maty-foremki-i-zestawy-do-sushi',
  'koty-szczęścia-i-inne-gadżety': 'prezenty-i-gadzety',
  'prezenty': 'prezenty-i-gadzety',
  'koreańskie-kosmetyki': 'kremy-i-serum',
};

export interface CategorySeoCopy {
  title: string;
  description: string;
  /** undefined = indexable; `follow: false` only for slugs the catalog does not know at all */
  robots: { index: false; follow: boolean } | undefined;
}

interface TreeCategoryLike {
  kind: 'group' | 'leaf';
  name: string;
  description: string;
  products: { totalCount: number | null };
  children: unknown[];
}

export function decodeCategorySlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    // Keep the raw route value; malformed escapes must not break rendering.
    return slug;
  }
}

export function resolveMergedCategoryTarget(slug: string): string | null {
  const decoded = decodeCategorySlug(slug);
  return MERGED_CATEGORY_REDIRECTS[decoded] ?? RENAMED_CATEGORY_REDIRECTS[decoded] ?? null;
}

/**
 * The redirect target for a retired slug, or null. A slug that the catalog
 * still serves (the tree not applied yet, or a merge undone) is never
 * redirected, and neither is anything while the catalog is unreachable
 * (`liveSlugs` null): a permanent redirect issued on a guess sticks in
 * browsers and crawlers.
 */
export function resolveCategoryRedirect(slug: string, liveSlugs: ReadonlySet<string> | null): string | null {
  if (!liveSlugs) return null;
  const target = resolveMergedCategoryTarget(slug);
  if (!target || liveSlugs.has(decodeCategorySlug(slug))) return null;
  return target;
}

export function getCategoryPathForLocale(locale: string, slug: string): string {
  const prefix = locale.toLowerCase().startsWith('en') ? '/en' : '';
  return `${prefix}/categories/${encodeURIComponent(slug)}`;
}

export function isDbCategoryIndexable(productCount: number | null): boolean {
  return (productCount ?? 0) >= CATEGORY_MIN_PRODUCTS_FOR_INDEX;
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

/**
 * Metadata for a node of the public tree (already localized by
 * findPublicCategory). A group with leaves is a navigation hub and stays
 * indexable whatever its count — the sitemap lists every group; leaves and
 * leafless groups follow the product threshold, with the tree-derived count.
 */
export function categorySeoFromTree(category: TreeCategoryLike): CategorySeoCopy {
  const indexable = (category.kind === 'group' && category.children.length > 0)
    || isDbCategoryIndexable(category.products.totalCount);
  return {
    title: category.name,
    description: boundCategoryMetaDescription(category.description || null, category.name),
    robots: indexable ? undefined : { index: false, follow: true },
  };
}
