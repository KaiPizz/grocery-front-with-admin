import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { StorefrontConfig } from '@/types/storefront-config';
import {
  extractStorefrontConfig,
  getStorefrontConfigUrls,
} from '@/lib/storefront-config-shared';

export {
  extractStorefrontConfig,
  getConfigString,
  getStorefrontConfigUrls,
  withStorefrontConfigDefaults,
} from '@/lib/storefront-config-shared';

interface FetchServerConfigOptions {
  cache?: RequestCache;
  next?: {
    revalidate?: number;
    tags?: string[];
  };
}

function getLocalPublicConfigName(url: string): string | null {
  if (!url.startsWith('/') || url.startsWith('//')) return null;

  let pathname: string;
  try {
    const parsed = new URL(url, 'https://local-static-config.invalid');
    if (parsed.search || parsed.hash) return null;
    pathname = decodeURIComponent(parsed.pathname);
  } catch {
    return null;
  }

  const match = /^\/config\/([A-Za-z0-9][A-Za-z0-9._-]*\.json)$/.exec(pathname);
  return match?.[1] ?? null;
}

async function readLocalPublicConfig(url: string): Promise<StorefrontConfig | null> {
  const fileName = getLocalPublicConfigName(url);
  if (!fileName) return null;

  try {
    const filePath = resolve(process.cwd(), 'public', 'config', fileName);
    return extractStorefrontConfig(JSON.parse(await readFile(filePath, 'utf8')));
  } catch {
    return null;
  }
}

export async function fetchServerConfig(
  options: FetchServerConfigOptions = {},
): Promise<StorefrontConfig | null> {
  for (const url of getStorefrontConfigUrls()) {
    if (url.startsWith('/') && !url.startsWith('//')) {
      const localConfig = await readLocalPublicConfig(url);
      if (localConfig) return localConfig;
      continue;
    }

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
      const config = extractStorefrontConfig(await res.json());
      if (config) return config;
    } catch {
      // Try the next configured source.
    }
  }

  return null;
}
