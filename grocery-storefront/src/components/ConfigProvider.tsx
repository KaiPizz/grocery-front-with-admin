'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  extractStorefrontConfig,
  getStorefrontConfigUrls,
  withStorefrontConfigDefaults,
} from '@/lib/storefront-config';
import type { StorefrontConfig } from '@/types/storefront-config';

const CONFIG_URLS = getStorefrontConfigUrls();

const ConfigContext = createContext<StorefrontConfig | null>(null);

/**
 * Hook to read storefront config. Available during SSR (no flash).
 * Returns null only if config API was unreachable during server render.
 */
export function useStorefrontConfig(): StorefrontConfig | null {
  return useContext(ConfigContext);
}

function camelToKebab(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}

interface ConfigProviderProps {
  initialConfig: StorefrontConfig | null;
  children: React.ReactNode;
}

/**
 * Provides storefront config via React Context.
 * - initialConfig comes from server-side fetch in layout.tsx (available during SSR)
 * - Background refresh runs after mount to pick up changes
 * - Injects CSS custom properties from config.branding.colors
 */
export function ConfigProvider({ initialConfig, children }: ConfigProviderProps) {
  const [config, setConfig] = useState<StorefrontConfig | null>(withStorefrontConfigDefaults(initialConfig));

  const refreshConfig = useCallback(async () => {
    if (CONFIG_URLS.length === 0) return;

    for (const url of CONFIG_URLS) {
      try {
        const res = await fetch(url, {
          cache: 'no-store',
        });
        if (!res.ok) continue;
        const json = await res.json();
        const fresh = extractStorefrontConfig(json);
        if (fresh) {
          setConfig(fresh);
          return;
        }
      } catch {
        // Keep current config and try the next source.
      }
    }
  }, []);

  useEffect(() => {
    refreshConfig();
  }, [refreshConfig]);

  useEffect(() => {
    if (!config?.branding?.colors) return;
    const root = document.documentElement;
    Object.entries(config.branding.colors).forEach(([key, value]) => {
      if (typeof value === 'string' && value) {
        root.style.setProperty(`--color-${camelToKebab(key)}`, value);
      }
    });
  }, [config?.branding?.colors]);

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
}
