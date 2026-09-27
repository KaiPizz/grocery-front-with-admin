import type { PublicCategory } from '@/lib/public-taxonomy';

// Leaves the Asia Deli Go landing features when the admin config names none.
export const ADG_DEFAULT_FEATURED_LEAVES = ['buldak-i-ramyun-ostre', 'kimchi', 'pocky-pepero-i-czekolada'] as const;

type FeaturedGroup = Pick<PublicCategory, 'id' | 'slug' | 'rawCategoryIds'> & {
  children: Array<Pick<PublicCategory['children'][number], 'id' | 'slug'>>;
};

export interface FeaturedSelection {
  /** raw category ids for the shelf query: a leaf gives its own id, a group every leaf id under it */
  ids: string[];
  /** the configured (or default) slugs that exist in the catalog, in order — the shelf link targets the first */
  slugs: string[];
}

/**
 * Resolves the configured slugs (or the ADG defaults) against the public tree
 * for the "Polecane" shelf. Unknown slugs are skipped, order is kept, ids are
 * unique.
 */
export function resolveFeaturedLeaves(
  groups: FeaturedGroup[],
  configuredSlugs: string[],
  isAsiaDeliGo: boolean,
): FeaturedSelection {
  const wanted = configuredSlugs.length > 0
    ? configuredSlugs
    : isAsiaDeliGo ? [...ADG_DEFAULT_FEATURED_LEAVES] : [];
  const ids: string[] = [];
  const slugs: string[] = [];
  const push = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };

  for (const slug of wanted) {
    const group = groups.find((candidate) => candidate.slug === slug);
    if (group) {
      group.rawCategoryIds.forEach(push);
      slugs.push(slug);
      continue;
    }
    for (const candidate of groups) {
      const leaf = candidate.children.find((child) => child.slug === slug);
      if (leaf) {
        push(leaf.id);
        slugs.push(slug);
        break;
      }
    }
  }

  return { ids, slugs };
}

export function resolveFeaturedLeafIds(
  groups: FeaturedGroup[],
  configuredSlugs: string[],
  isAsiaDeliGo: boolean,
): string[] {
  return resolveFeaturedLeaves(groups, configuredSlugs, isAsiaDeliGo).ids;
}

/**
 * Round-robins the fetched products over the featured categories (in the
 * configured order) so the shelf shows every featured leaf instead of the
 * first `limit` rows of the biggest one; products outside those categories
 * come last. Order inside a category is kept.
 */
export function interleaveFeaturedProducts<T extends { category?: { id: string } | null }>(
  products: T[],
  categoryIds: string[],
  limit: number,
): T[] {
  const buckets = new Map<string, T[]>(categoryIds.map((id) => [id, []]));
  const rest: T[] = [];
  for (const product of products) {
    const bucket = product.category?.id ? buckets.get(product.category.id) : undefined;
    (bucket ?? rest).push(product);
  }

  const picked: T[] = [];
  const queues = [...buckets.values()];
  while (picked.length < limit && queues.some((queue) => queue.length > 0)) {
    for (const queue of queues) {
      if (picked.length >= limit) break;
      const next = queue.shift();
      if (next) picked.push(next);
    }
  }
  return [...picked, ...rest].slice(0, limit);
}
