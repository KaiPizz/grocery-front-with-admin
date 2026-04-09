'use client';

import { useSalonStore } from '@/stores/salon-store';
import { resolveChannel } from '@/lib/channel';

export function useChannel(): string {
  const salonSlug = useSalonStore((s) => s.salonSlug);
  return resolveChannel(salonSlug);
}
