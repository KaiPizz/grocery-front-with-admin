'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Salon } from '@/types';

interface SalonState {
  salon: Salon | null;
  salonSlug: string | null;
  isLoading: boolean;
  setSalon: (salon: Salon) => void;
  setSalonSlug: (slug: string) => void;
  fetchSalon: () => Promise<void>;
}

const configuredSalonSlug = process.env.NEXT_PUBLIC_SALON_SLUG || null;

export const useSalonStore = create<SalonState>()(
  persist(
    (set, get) => ({
      salon: null,
      salonSlug: configuredSalonSlug,
      isLoading: false,
      setSalon: (salon) => set({ salon, salonSlug: salon.slug }),
      setSalonSlug: (slug) => set({ salonSlug: slug }),
      fetchSalon: async () => {
        const slug = configuredSalonSlug || get().salonSlug;
        if (!slug || get().salon?.slug === slug) return;

        set({ isLoading: true, salonSlug: slug });
        try {
          const baseUrl = typeof window !== 'undefined'
            ? '/api/proxy'
            : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api/v1');
          const res = await fetch(`${baseUrl}/public/salon/${slug}`);
          if (res.ok) {
            const salon = await res.json();
            set({ salon, salonSlug: salon.slug, isLoading: false });
          } else {
            set({ salon: null, isLoading: false });
          }
        } catch {
          set({ salon: null, isLoading: false });
        }
      },
    }),
    {
      name: 'grocery-salon',
      version: 2,
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SalonState> | undefined;
        const salonSlug = configuredSalonSlug || persisted?.salonSlug || null;
        const salon = persisted?.salon?.slug === salonSlug ? persisted.salon : null;

        return {
          ...currentState,
          ...persisted,
          salonSlug,
          salon,
        };
      },
    }
  )
);
