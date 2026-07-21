'use client';

/* eslint-disable @next/next/no-img-element -- Runtime-configured category media can use tenant-owned URLs. */

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { getLocaleNeutralConfiguredHref } from '@/lib/configured-content-localization';
import { getImageSrc } from '@/lib/utils';
import type { GridBannerBlock, RoundGridBannerBlock } from '@/types/storefront-config';

interface ConfiguredCategoryGridProps {
  blocks: Array<GridBannerBlock | RoundGridBannerBlock>;
}

export function ConfiguredCategoryGrid({ blocks }: ConfiguredCategoryGridProps) {
  const t = useTranslations('home');
  const seenIds = new Set<string>();
  const items = blocks.flatMap((block) =>
    block.items.flatMap((item) => {
      if (!item.enabled || seenIds.has(item.id)) return [];

      seenIds.add(item.id);
      return [{
        ...item,
        imageFit: block.type === 'round_grid' ? 'cover' : block.imageFit ?? 'contain',
      }];
    })
  );

  if (items.length === 0) return null;

  return (
    <section className="container-grocery py-5 md:py-8" data-testid="home-configured-category-grid">
      <div className="mb-4 flex items-end justify-between gap-3 md:mb-5">
        <h2 className="heading-section text-xl md:text-2xl" style={{ color: 'var(--color-foreground)' }}>
          {t('categoryShortcuts')}
        </h2>
        <Link
          href="/categories"
          className="inline-flex min-h-11 items-center gap-1 rounded-full border px-3 text-sm font-semibold transition-colors duration-fast hover:opacity-80"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
        >
          {t('seeAllCategories')}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:gap-x-4 md:grid-cols-6 md:gap-x-5 md:gap-y-6 xl:grid-cols-9">
        {items.map((item) => (
          <Link
            key={item.id}
            href={getLocaleNeutralConfiguredHref(item.href, item.id)}
            className="group min-w-0"
            data-testid="home-configured-category-link"
          >
            <span
              className="relative block aspect-square overflow-hidden rounded-[18px] border shadow-[0_16px_30px_-26px_rgba(15,35,23,0.4)] transition-[border-color,transform,box-shadow] duration-fast group-hover:-translate-y-0.5"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-border))',
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, var(--color-card))',
              }}
            >
              {item.imageUrl ? (
                <img
                  src={getImageSrc(item.imageUrl, { maxWidth: 480 }) || item.imageUrl}
                  alt={item.title || t('categoryShortcuts')}
                  className={item.imageFit === 'cover'
                    ? 'h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.03]'
                    : 'h-full w-full object-contain p-2 transition-transform duration-normal group-hover:scale-[1.04] md:p-3'}
                  loading="lazy"
                />
              ) : (
                <span className="block h-full w-full" style={{ backgroundColor: 'var(--color-muted)' }} />
              )}
            </span>
            <span
              className="mt-2 line-clamp-2 block text-center text-xs font-semibold leading-snug transition-colors duration-fast group-hover:text-[var(--color-primary)] md:text-sm"
              style={{ color: 'var(--color-foreground)' }}
            >
              {item.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
