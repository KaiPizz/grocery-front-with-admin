'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Layers3 } from 'lucide-react';
import { useQuery } from 'urql';

import { Link } from '@/i18n/navigation';
import { useChannel } from '@/hooks/use-channel';
import { CATEGORIES_QUERY } from '@/lib/graphql/operations/grocery';
import { buildPublicCategories, type PublicCategory } from '@/lib/public-taxonomy';

const COLUMN_COUNT = 4;

interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  level: number | null;
  description: string | null;
  backgroundImage: {
    url: string;
    alt: string | null;
  } | null;
  products: {
    totalCount: number;
  } | null;
}

interface CategoriesResponse {
  categories: {
    edges: Array<{ node: CategoryNode }>;
    totalCount: number;
  } | null;
}

interface CategoryMegaMenuProps {
  open: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onNavigate: () => void;
}

function formatProductCount(locale: string, count: number) {
  if (locale === 'pl') {
    if (count === 1) return '1 produkt';
    if (count > 1 && count < 5) return `${count} produkty`;
    return `${count} produktów`;
  }

  return count === 1 ? '1 product' : `${count} products`;
}

function getProductCount(category: PublicCategory) {
  return category.products?.totalCount ?? 0;
}

function getCategoryInitial(category: PublicCategory) {
  return category.name.trim().charAt(0).toUpperCase() || '#';
}

function splitIntoColumns(categories: PublicCategory[]) {
  const columnSize = Math.ceil(categories.length / COLUMN_COUNT);

  return Array.from({ length: COLUMN_COUNT }, (_, index) => {
    const start = index * columnSize;
    return categories.slice(start, start + columnSize);
  }).filter((column) => column.length > 0);
}

export function CategoryMegaMenu({ open, onMouseEnter, onMouseLeave, onNavigate }: CategoryMegaMenuProps) {
  const t = useTranslations('categories');
  const locale = useLocale();
  const channel = useChannel();
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (open) {
      setRequested(true);
    }
  }, [open]);

  const [result] = useQuery<CategoriesResponse>({
    query: CATEGORIES_QUERY,
    variables: { channel },
    pause: !requested,
  });

  const categories = useMemo(() => {
    const rawCategories = result.data?.categories?.edges
      .map((edge) => edge.node)
      .filter((category) => category.slug && category.name) ?? [];

    return buildPublicCategories(rawCategories, locale);
  }, [locale, result.data]);

  const columns = useMemo(() => splitIntoColumns(categories), [categories]);
  const featuredCategory = categories.find((category) => getProductCount(category) > 0)
    ?? categories[0]
    ?? null;

  if (!open) {
    return null;
  }

  return (
    <nav
      aria-label={t('megaMenuLabel')}
      data-testid="category-mega-menu"
      className="fixed left-1/2 z-[60] hidden w-[min(76rem,calc(100vw-2rem))] -translate-x-1/2 md:block"
      style={{ top: 'calc(var(--header-height) - 1px)' }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="max-h-[calc(100vh-var(--header-height)-1rem)] overflow-y-auto rounded-lg border p-5 shadow-2xl"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-card) 98%, white)',
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
              {t('allCategories')}
            </p>
          </div>
          <Link
            href="/categories"
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-opacity duration-fast hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
            onClick={onNavigate}
          >
            {t('browseAll')}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {result.fetching && categories.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('loading')}
          </p>
        )}

        {!result.fetching && categories.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('empty')}
          </p>
        )}

        {categories.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid gap-5 md:grid-cols-4">
              {columns.map((column, columnIndex) => (
                <div key={`category-column-${columnIndex}`} className="space-y-4">
                  {column.map((category) => {
                    const count = getProductCount(category);
                    const countLabel = count > 0 ? formatProductCount(locale, count) : t('comingSoon');
                    return (
                      <div key={category.id} className="min-w-0">
                        <Link
                          href={`/categories/${category.slug}`}
                          aria-label={`${category.name}, ${countLabel}`}
                          className="group block rounded-lg px-2.5 py-2 transition-colors duration-fast hover-surface"
                          style={{ color: 'var(--color-foreground)' }}
                          onClick={onNavigate}
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="min-w-0 text-sm font-semibold leading-snug">
                              {category.name}
                            </span>
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-fast group-hover:opacity-100" aria-hidden="true" />
                          </span>
                          <span className="mt-1 block text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                            {countLabel}
                          </span>
                        </Link>

                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {featuredCategory && (
              <Link
                href={`/categories/${featuredCategory.slug}`}
                data-testid="category-mega-menu-promo"
                aria-label={`${t('featured')}: ${featuredCategory.name}`}
                className="group flex min-h-64 flex-col overflow-hidden rounded-lg border transition-transform duration-fast hover:-translate-y-0.5"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, var(--color-card))',
                }}
                onClick={onNavigate}
              >
                <span
                  className="flex h-36 w-full items-center justify-center border-b"
                  style={{
                    borderColor: 'var(--color-border)',
                    background:
                      'linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 16%, white), color-mix(in srgb, var(--color-primary) 5%, var(--color-card)))',
                  }}
                >
                  <span
                    className="flex h-16 w-16 items-center justify-center rounded-full border text-3xl font-semibold"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-primary) 22%, transparent)',
                      color: 'var(--color-primary)',
                      backgroundColor: 'color-mix(in srgb, var(--color-card) 80%, transparent)',
                    }}
                    aria-hidden="true"
                  >
                    {getCategoryInitial(featuredCategory)}
                  </span>
                </span>
                <span className="flex flex-1 flex-col justify-between p-4">
                  <span>
                    <span className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('featured')}
                    </span>
                    <span className="mt-2 block text-xl font-semibold leading-tight" style={{ color: 'var(--color-foreground)' }}>
                      {featuredCategory.name}
                    </span>
                    {featuredCategory.description && (
                      <span className="mt-2 line-clamp-2 block text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        {featuredCategory.description}
                      </span>
                    )}
                    <span className="mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}>
                      {formatProductCount(locale, getProductCount(featuredCategory))}
                    </span>
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                    {t('shopCategory')}
                    <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
