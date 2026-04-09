'use client';

import { useEffect } from 'react';
import { useSalonStore } from '@/stores/salon-store';

export function SalonLoader() {
  const fetchSalon = useSalonStore((s) => s.fetchSalon);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CHANNEL) return;
    fetchSalon();
  }, [fetchSalon]);

  return null;
}
