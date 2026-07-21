import type { PublicCategory } from '@/lib/public-taxonomy';
import type {
  CommercialCategoryHubConfig,
  CommercialConfig,
} from '@/types/storefront-config';

export interface CategoryHubCategory extends PublicCategory {
  imageUrl: string | null;
}

export function getEnabledCategoryHub(
  commercial: Pick<CommercialConfig, 'enabled' | 'categoryHub'> | null | undefined,
): CommercialCategoryHubConfig | undefined {
  return commercial?.enabled ? commercial.categoryHub : undefined;
}

function fallbackCategories(categories: PublicCategory[]): CategoryHubCategory[] {
  return categories.map((category) => ({
    ...category,
    imageUrl: null,
  }));
}

/**
 * Joins owner-managed presentation data to the public catalog taxonomy.
 *
 * The category page remains a catalog route even when the optional Admin
 * presentation is absent or disabled. Configured items may reorder, decorate,
 * or explicitly hide a category; newly introduced catalog categories are
 * appended in their taxonomy order so an older config cannot make them vanish.
 */
export function mergeCategoryHub(
  categories: PublicCategory[],
  categoryHub: CommercialCategoryHubConfig | null | undefined,
): CategoryHubCategory[] {
  if (!categoryHub?.enabled || !Array.isArray(categoryHub.items) || categoryHub.items.length === 0) {
    return fallbackCategories(categories);
  }

  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const configuredSlugs = new Set<string>();
  const merged: CategoryHubCategory[] = [];

  const configuredItems = [...categoryHub.items].sort((left, right) => left.order - right.order);

  for (const item of configuredItems) {
    const slug = item.categorySlug?.trim();
    if (!slug || configuredSlugs.has(slug)) continue;

    const category = categoryBySlug.get(slug);
    if (!category) continue;

    configuredSlugs.add(slug);
    if (!item.enabled) continue;

    merged.push({
      ...category,
      imageUrl: item.imageUrl?.trim() || null,
    });
  }

  for (const category of categories) {
    if (configuredSlugs.has(category.slug)) continue;

    merged.push({
      ...category,
      imageUrl: null,
    });
  }

  return merged;
}
