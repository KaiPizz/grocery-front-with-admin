'use client';

import { useTranslations } from 'next-intl';
import { Snowflake, Thermometer, Package } from 'lucide-react';
import type { CartItem } from '@/types';

const ZONE_CONFIG: Record<string, { icon: typeof Snowflake; colorVar: string }> = {
  FROZEN: { icon: Snowflake, colorVar: 'var(--color-frozen)' },
  CHILLED: { icon: Thermometer, colorVar: 'var(--color-chilled)' },
  AMBIENT: { icon: Package, colorVar: 'var(--color-ambient)' },
  OTHER: { icon: Package, colorVar: 'var(--color-muted-foreground)' },
};

const ZONE_ORDER: string[] = ['FROZEN', 'CHILLED', 'AMBIENT', 'OTHER'];

interface StorageZoneGroupProps {
  itemsByZone: Record<string, CartItem[]>;
  renderItem: (item: CartItem) => React.ReactNode;
}

export function StorageZoneGroup({ itemsByZone, renderItem }: StorageZoneGroupProps) {
  const tCommon = useTranslations('common');
  const t = useTranslations('cart');

  const sortedZones = ZONE_ORDER.filter((z) => itemsByZone[z]?.length);

  if (sortedZones.length === 0) return null;

  return (
    <div className="space-y-4" role="list" aria-label={t('groupedByStorageZone')}>
      {sortedZones.map((zone) => {
        const config = ZONE_CONFIG[zone] || ZONE_CONFIG.OTHER;
        const Icon = config.icon;
        const items = itemsByZone[zone];
        const itemCountLabel = tCommon('itemCount', { count: items.length });

        return (
          <section
            key={zone}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--color-border)' }}
            role="listitem"
            aria-label={t('zoneSectionAria', { zone: t(`zoneGroup.${zone}` as any), countLabel: itemCountLabel })}
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{ backgroundColor: `color-mix(in srgb, ${config.colorVar} 10%, transparent)` }}
            >
              <Icon className="w-4 h-4" style={{ color: config.colorVar }} aria-hidden="true" />
              <span className="text-sm font-semibold" style={{ color: config.colorVar }}>
                {t(`zoneGroup.${zone}` as any)}
              </span>
              <span className="text-xs ml-auto tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                {itemCountLabel}
              </span>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {items.map(renderItem)}
            </div>

            <div className="px-4 py-2 text-xs" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
              {t(`zoneNote.${zone}` as any)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
