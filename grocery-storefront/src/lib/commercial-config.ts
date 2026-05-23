import type {
  CommercialCollection,
  CommercialQuickLink,
  StorefrontConfig,
} from '@/types/storefront-config';

function byOrder<T extends { order: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.order - b.order);
}

export function getEnabledCommercialQuickLinks(config: StorefrontConfig | null): CommercialQuickLink[] {
  const commercial = config?.commercial;
  if (!commercial?.enabled) return [];

  return byOrder(commercial.quickLinks.filter((link) => link.enabled));
}

export function getEnabledCommercialCollections(config: StorefrontConfig | null): CommercialCollection[] {
  const commercial = config?.commercial;
  if (!commercial?.enabled) return [];

  return byOrder(commercial.collections.filter((collection) => collection.enabled));
}

export function findCommercialCollection(
  config: StorefrontConfig | null,
  slug: string
): CommercialCollection | null {
  return getEnabledCommercialCollections(config).find((collection) => collection.slug === slug) ?? null;
}

export function getOutletCollection(config: StorefrontConfig | null): CommercialCollection | null {
  const commercial = config?.commercial;
  if (!commercial?.enabled || !commercial.outlet.enabled || !commercial.outlet.collectionSlug) {
    return null;
  }

  return findCommercialCollection(config, commercial.outlet.collectionSlug);
}
