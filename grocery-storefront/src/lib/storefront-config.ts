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
};

export function withStorefrontConfigDefaults(config: StorefrontConfig | null): StorefrontConfig | null {
  if (!config) return null;

  return {
    ...config,
    general: {
      ...config.general,
      fulfillment: config.general.fulfillment ?? DEFAULT_FULFILLMENT_CONFIG,
    },
    commercial: config.commercial ?? DEFAULT_COMMERCIAL_CONFIG,
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

interface FetchServerConfigOptions {
  cache?: RequestCache;
  next?: {
    revalidate?: number;
    tags?: string[];
  };
}

export async function fetchServerConfig(
  options: FetchServerConfigOptions = {},
): Promise<StorefrontConfig | null> {
  for (const url of getStorefrontConfigUrls()) {
    try {
      const requestInit: RequestInit & { next?: FetchServerConfigOptions['next'] } = {};

      if (options.next) {
        requestInit.next = options.next;
        if (options.cache) requestInit.cache = options.cache;
      } else {
        requestInit.cache = options.cache ?? 'no-store';
      }

      const res = await fetch(url, requestInit);
      if (!res.ok) continue;
      const json = await res.json();
      const config = extractStorefrontConfig(json);
      if (config) return config;
    } catch {
      // Try the next configured source.
    }
  }

  return null;
}

export function getConfigString(value: string | null | undefined): string | undefined {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}
