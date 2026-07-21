'use client';

/* eslint-disable @next/next/no-img-element -- Category media is owner-managed and can use tenant-owned URLs. */

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight } from 'lucide-react';

import { useStorefrontConfig } from '@/components/ConfigProvider';
import { Link } from '@/i18n/navigation';
import {
  getEnabledCategoryHub,
  mergeCategoryHub,
  type CategoryHubCategory,
} from '@/lib/category-hub';
import type { PublicCategory } from '@/lib/public-taxonomy';
import { getImageSrc } from '@/lib/utils';

interface CategoryHubClientProps {
  categories: PublicCategory[];
}

function getCategoryInitial(category: PublicCategory) {
  return category.name.trim().charAt(0).toUpperCase() || '#';
}

function CategoryArtwork({ category }: { category: CategoryHubCategory }) {
  const imageSrc = getImageSrc(category.imageUrl, {
    maxWidth: 720,
    proxyFallback: 'error',
  });
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const showImage = Boolean(imageSrc && failedImageSrc !== imageSrc);

  return (
    <span
      className="relative block aspect-[4/3] overflow-hidden"
      style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 7%, var(--color-muted))' }}
      data-testid="category-hub-artwork"
    >
      {showImage ? (
        <img
          src={imageSrc!}
          alt=""
          className="h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:transform-none"
          loading="lazy"
          onError={() => setFailedImageSrc(imageSrc)}
          data-testid="category-hub-image"
        />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-4xl font-semibold md:text-5xl"
          style={{
            background:
              'radial-gradient(circle at 72% 24%, color-mix(in srgb, var(--color-primary) 16%, transparent), transparent 34%), color-mix(in srgb, var(--color-primary) 7%, var(--color-card))',
            color: 'var(--color-primary)',
          }}
          aria-hidden="true"
          data-testid="category-hub-image-fallback"
        >
          {getCategoryInitial(category)}
        </span>
      )}
    </span>
  );
}

export function CategoryHubClient({ categories }: CategoryHubClientProps) {
  const t = useTranslations('categories');
  const storefrontConfig = useStorefrontConfig();
  const visibleCategories = useMemo(
    () => mergeCategoryHub(categories, getEnabledCategoryHub(storefrontConfig?.commercial)),
    [categories, storefrontConfig?.commercial],
  );

  if (visibleCategories.length === 0) {
    return (
      <div
        className="rounded-xl border px-5 py-10 text-center"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {t('empty')}
        </p>
      </div>
    );
  }

  return (
    <ul
      className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-5"
      aria-label={t('gridLabel')}
      data-testid="category-hub-grid"
    >
      {visibleCategories.map((category) => {
        const count = category.products.totalCount;
        const countLabel = typeof count === 'number'
          ? t('productCount', { count })
          : t('comingSoon');

        return (
          <li key={category.id} className="min-w-0">
            <Link
              href={`/categories/${category.slug}`}
              aria-label={`${category.name}, ${countLabel}`}
              className="group flex h-full min-h-44 flex-col overflow-hidden rounded-[18px] border shadow-[0_18px_38px_-34px_rgba(15,35,23,0.45)] transition-[border-color,transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-32px_rgba(15,35,23,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-border) 88%, white)',
                backgroundColor: 'var(--color-card)',
                outlineColor: 'var(--color-ring)',
              }}
              data-testid="category-hub-card"
            >
              <CategoryArtwork category={category} />
              <span className="flex flex-1 flex-col p-3 md:p-4">
                <span
                  className="mb-2 w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none md:text-xs"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 11%, transparent)',
                    color: 'var(--color-primary)',
                  }}
                >
                  {countLabel}
                </span>
                <span
                  className="line-clamp-2 text-sm font-semibold leading-snug md:text-base"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  {category.name}
                </span>
                <span
                  className="mt-1.5 line-clamp-2 text-xs leading-relaxed md:text-sm"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  {category.description}
                </span>
                <span
                  className="mt-auto inline-flex min-h-11 items-end gap-1 pt-3 text-xs font-semibold md:text-sm"
                  style={{ color: 'var(--color-primary)' }}
                  aria-hidden="true"
                >
                  {t('browse')}
                  <ArrowRight className="mb-0.5 h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5" />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
