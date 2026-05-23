import type { StorefrontConfig } from '@/types/storefront-config';

const DEFAULT_COMMERCIAL_CONFIG: StorefrontConfig['commercial'] = {
  enabled: false,
  quickLinks: [],
  collections: [],
  outlet: {
    enabled: false,
    label: 'Outlet',
    collectionSlug: null,
  },
};

export function withStorefrontConfigDefaults(config: StorefrontConfig | null): StorefrontConfig | null {
  if (!config) return null;

  return {
    ...config,
    commercial: config.commercial ?? DEFAULT_COMMERCIAL_CONFIG,
  };
}

export async function fetchServerConfig(): Promise<StorefrontConfig | null> {
  const apiUrl = process.env.NEXT_PUBLIC_CONFIG_API_URL?.trim();
  if (!apiUrl) return null;

  const slug = process.env.NEXT_PUBLIC_SALON_SLUG || 'my-grocery-store';
  try {
    const res = await fetch(`${apiUrl}/api/config/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return withStorefrontConfigDefaults(json.data?.config ?? json.config ?? null);
  } catch {
    return null;
  }
}

export function getConfigString(value: string | null | undefined): string | undefined {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}
