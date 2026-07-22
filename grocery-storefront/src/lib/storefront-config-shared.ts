import type { StorefrontConfig } from '@/types/storefront-config';
import { DEFAULT_FULFILLMENT_CONFIG } from '@/lib/fulfillment';

const DEFAULT_COMMERCIAL_CONFIG: StorefrontConfig['commercial'] = {
  enabled: false,
  quickLinks: [],
  collections: [],
  outlet: {
    enabled: false,
    label: 'Outlet',
    collectionSlug: null,
  },
  categoryHub: {
    enabled: true,
    items: [],
  },
};

export function withStorefrontConfigDefaults(config: StorefrontConfig | null): StorefrontConfig | null {
  if (!config) return null;

  const commercial = config.commercial;

  return {
    ...config,
    general: {
      ...config.general,
      fulfillment: config.general.fulfillment ?? DEFAULT_FULFILLMENT_CONFIG,
    },
    commercial: commercial
      ? {
        ...commercial,
        categoryHub: commercial.categoryHub ?? DEFAULT_COMMERCIAL_CONFIG.categoryHub,
      }
      : DEFAULT_COMMERCIAL_CONFIG,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function extractStorefrontConfig(payload: unknown): StorefrontConfig | null {
  if (!isRecord(payload)) return null;

  const data = isRecord(payload.data) ? payload.data : null;
  const candidate = data?.config ?? payload.config ?? payload.published ?? null;

  if (!isRecord(candidate)) return null;

  return withStorefrontConfigDefaults(candidate as unknown as StorefrontConfig);
}

export function getStorefrontConfigUrls(): string[] {
  const apiUrl = process.env.NEXT_PUBLIC_CONFIG_API_URL?.trim();
  const staticUrl = process.env.NEXT_PUBLIC_STATIC_CONFIG_URL?.trim();
  const slug = process.env.NEXT_PUBLIC_SALON_SLUG || 'my-grocery-store';
  const urls: string[] = [];

  if (apiUrl) {
    urls.push(`${apiUrl.replace(/\/$/, '')}/api/config/${encodeURIComponent(slug)}`);
  }

  if (staticUrl) {
    urls.push(staticUrl);
  }

  return urls;
}

export function getConfigString(value: string | null | undefined): string | undefined {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}
