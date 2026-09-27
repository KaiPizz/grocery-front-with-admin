import type { PublicCategory } from '@/lib/public-taxonomy';

export interface CategorySitemapPath {
  path: string;
  priority: number;
}

/**
 * Sitemap paths for the category tree: every group is listed, a leaf only once
 * it holds enough products to be worth indexing (the category layout marks
 * thinner leaves noindex).
 */
export function collectCategorySitemapPaths(
  groups: Array<Pick<PublicCategory, 'slug' | 'children' | 'products'>>,
  minLeafProducts: number,
): CategorySitemapPath[] {
  const entries: CategorySitemapPath[] = [];
  for (const group of groups) {
    entries.push({ path: `/categories/${encodeURIComponent(group.slug)}`, priority: 0.8 });
    for (const leaf of group.children) {
      if ((leaf.products.totalCount ?? 0) < minLeafProducts) continue;
      entries.push({ path: `/categories/${encodeURIComponent(leaf.slug)}`, priority: 0.7 });
    }
  }
  return entries;
}
