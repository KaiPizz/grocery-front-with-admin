import type { PublicCategory } from '@/lib/public-taxonomy';

// Leaves the Asia Deli Go landing features when the admin config names none.
export const ADG_DEFAULT_FEATURED_LEAVES = ['buldak-i-ramyun-ostre', 'kimchi', 'pocky-pepero-i-czekolada'] as const;

type FeaturedGroup = Pick<PublicCategory, 'id' | 'slug' | 'rawCategoryIds'> & {
  children: Array<Pick<PublicCategory['children'][number], 'id' | 'slug'>>;
};

/**
 * Resolves the configured slugs (or the ADG defaults) to raw category ids for
 * the "Polecane" shelf query: a leaf slug gives its own id, a group slug gives
 * every leaf id under it. Unknown slugs are skipped, order is kept, ids are
 * unique.
 */
export function resolveFeaturedLeafIds(
  groups: FeaturedGroup[],
  configuredSlugs: string[],
  isAsiaDeliGo: boolean,
): string[] {
  const slugs = configuredSlugs.length > 0
    ? configuredSlugs
    : isAsiaDeliGo ? [...ADG_DEFAULT_FEATURED_LEAVES] : [];
  const ids: string[] = [];
  const push = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };

  for (const slug of slugs) {
    const group = groups.find((candidate) => candidate.slug === slug);
    if (group) {
      group.rawCategoryIds.forEach(push);
      continue;
    }
    for (const candidate of groups) {
      const leaf = candidate.children.find((child) => child.slug === slug);
      if (leaf) {
        push(leaf.id);
        break;
      }
    }
  }

  return ids;
}
