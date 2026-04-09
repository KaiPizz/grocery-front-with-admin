'use client';

import { create } from 'zustand';
import type { StorefrontConfig } from '@/types/storefront-config';

interface ConfigState {
  config: StorefrontConfig | null;
  ready: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
}

const CONFIG_API_URL = process.env.NEXT_PUBLIC_CONFIG_API_URL || 'http://localhost:4100';
const SALON_SLUG = process.env.NEXT_PUBLIC_SALON_SLUG || 'my-grocery-store';

/**
 * Read config injected by the server via <script> in layout.tsx.
 * This runs synchronously at module load, BEFORE React hydration,
 * so the Zustand store starts with the correct config — no flash.
 */
function getServerInjectedConfig(): StorefrontConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__STOREFRONT_CONFIG__ ?? null;
  } catch {
    return null;
  }
}

const serverConfig = getServerInjectedConfig();

let fetchPromise: Promise<void> | null = null;

export const useConfigStore = create<ConfigState>()((set, get) => ({
  config: serverConfig,
  ready: serverConfig !== null,
  error: null,

  fetchConfig: async () => {
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
      try {
        const res = await fetch(`${CONFIG_API_URL}/api/config/${SALON_SLUG}`, {
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`Config API returned ${res.status}`);
        const json = await res.json();
        const config: StorefrontConfig = json.data?.config ?? json.config ?? json;
        set({ config, ready: true, error: null });
      } catch (err) {
        if (!get().config) {
          set({ ready: true, error: err instanceof Error ? err.message : 'Failed to load config' });
        }
      } finally {
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  },
}));
