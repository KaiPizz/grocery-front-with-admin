export type CatalogProductKind = 'food' | 'cosmetics' | 'kitchenware' | 'unknown';

interface CatalogProductCategory {
  slug?: string | null;
  parent?: { slug?: string | null } | null;
}

interface CatalogCategoryNode {
  id: string;
  slug: string;
  parent?: { id?: string | null } | null;
}

export const FOOD_CATEGORY_SLUGS: readonly string[] = [
  'makaron-i-ryz',
  'sosy-i-oleje',
  'pasty-przyprawy-i-buliony',
  'kimchi-i-kiszonki',
  'przekaski-i-slodycze',
  'napoje-herbaty-i-kawy',
  'dania-gotowe',
  'do-gotowania-i-sushi',
];

/** Category identity wins over incidental ingredients, nutrition or country data. */
export function getCatalogProductKind(category: CatalogProductCategory | null | undefined): CatalogProductKind {
  const slugs = [category?.slug, category?.parent?.slug];
  if (slugs.includes('kosmetyki-koreanskie')) return 'cosmetics';
  if (slugs.includes('akcesoria-kuchenne')) return 'kitchenware';
  return slugs.some((slug) => slug && FOOD_CATEGORY_SLUGS.includes(slug)) ? 'food' : 'unknown';
}

/** Resolve roots and all their descendants from the current API tree, not fixed IDs. */
export function getFoodCategoryIds(categories: readonly CatalogCategoryNode[]): string[] {
  const byId = new Map(categories.map((category) => [category.id, category]));
  return categories.filter((category) => {
    const visited = new Set<string>();
    let node: CatalogCategoryNode | undefined = category;
    let food = false;
    while (node && !visited.has(node.id)) {
      visited.add(node.id);
      if (node.slug === 'kosmetyki-koreanskie' || node.slug === 'akcesoria-kuchenne') return false;
      if (FOOD_CATEGORY_SLUGS.includes(node.slug)) food = true;
      node = node.parent?.id ? byId.get(node.parent.id) : undefined;
    }
    return food;
  }).map((category) => category.id);
}
