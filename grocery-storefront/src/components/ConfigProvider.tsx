'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { StorefrontConfig } from '@/types/storefront-config';

const CONFIG_API_URL = process.env.NEXT_PUBLIC_CONFIG_API_URL?.trim() || null;
const SALON_SLUG = process.env.NEXT_PUBLIC_SALON_SLUG || 'my-grocery-store';

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
  const [config, setConfig] = useState<StorefrontConfig | null>(initialConfig);

  const refreshConfig = useCallback(async () => {
    if (!CONFIG_API_URL) return;

    try {
      const res = await fetch(`${CONFIG_API_URL}/api/config/${SALON_SLUG}`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const json = await res.json();
      const fresh: StorefrontConfig = json.data?.config ?? json.config ?? null;
      if (fresh) setConfig(fresh);
    } catch {
      // Keep current config on error
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
