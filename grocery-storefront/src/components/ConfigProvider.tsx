'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  extractStorefrontConfig,
  getStorefrontConfigUrls,
  withStorefrontConfigDefaults,
} from '@/lib/storefront-config';
import { localizeConfiguredStorefront } from '@/lib/configured-content-localization';
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

interface LocalizedConfigProviderProps {
  locale: string;
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
  const hasInitialConfig = Boolean(initialConfig);

  const refreshConfig = useCallback(async () => {
    if (CONFIG_URLS.length === 0) return;

    const urlsToTry = hasInitialConfig ? CONFIG_URLS.slice(0, 1) : CONFIG_URLS;

    for (const url of urlsToTry) {
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
  }, [hasInitialConfig]);

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

/**
 * Overrides the raw root config with locale-aware presentation data. This must
 * live below NextIntlClientProvider so client-side language changes update the
 * configured homepage without refetching or mutating owner-managed config.
 */
export function LocalizedConfigProvider({ locale, children }: LocalizedConfigProviderProps) {
  const config = useContext(ConfigContext);
  const localizedConfig = useMemo(
    () => localizeConfiguredStorefront(config, locale),
    [config, locale],
  );

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <ConfigContext.Provider value={localizedConfig}>
      {children}
    </ConfigContext.Provider>
  );
}
