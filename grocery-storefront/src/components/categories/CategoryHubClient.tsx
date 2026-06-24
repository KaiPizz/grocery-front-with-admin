'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Search } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import type { PublicCategory } from '@/lib/public-taxonomy';

interface CategoryHubClientProps {
  categories: PublicCategory[];
}

function formatProductCount(locale: string, count: number) {
  if (locale === 'pl') {
    if (count === 1) return '1 produkt';
    if (count > 1 && count < 5) return `${count} produkty`;
    return `${count} produktów`;
  }

  return count === 1 ? '1 product' : `${count} products`;
}

function getCategoryInitial(category: PublicCategory) {
  return category.name.trim().charAt(0).toUpperCase() || '#';
}

function matchesQuery(category: PublicCategory, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return `${category.name} ${category.description}`.toLowerCase().includes(normalizedQuery);
}

export function CategoryHubClient({ categories }: CategoryHubClientProps) {
  const t = useTranslations('categories');
  const locale = useLocale();
  const [query, setQuery] = useState('');

  const filteredCategories = useMemo(
    () => categories.filter((category) => matchesQuery(category, query)),
    [categories, query],
  );

  return (
    <div className="space-y-6">
      <div className="relative max-w-xl">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
          style={{ color: 'var(--color-muted-foreground)' }}
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t('searchLabel')}
          placeholder={t('searchPlaceholder')}
          className="h-11 w-full rounded-lg border bg-transparent pl-9 pr-3 text-sm outline-none transition-colors duration-fast focus-visible:ring-2"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-foreground)',
          }}
        />
      </div>

      {filteredCategories.length === 0 && (
        <div
          className="rounded-lg border px-5 py-8 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('empty')}
          </p>
        </div>
      )}

      {filteredCategories.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category) => {
            const count = category.products.totalCount;
            const countLabel = typeof count === 'number' && count > 0 ? formatProductCount(locale, count) : null;

            return (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                aria-label={countLabel ? `${category.name}, ${countLabel}` : category.name}
                className="group grid grid-cols-[3.75rem_minmax(0,1fr)] gap-3 rounded-lg border p-3 transition-transform duration-fast hover:-translate-y-0.5"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
              >
                <span
                  className="flex aspect-square items-center justify-center rounded-lg border text-xl font-semibold"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-primary) 18%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 9%, var(--color-card))',
                    color: 'var(--color-primary)',
                  }}
                  aria-hidden="true"
                >
                  {getCategoryInitial(category)}
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-base font-semibold leading-snug" style={{ color: 'var(--color-foreground)' }}>
                    {category.name}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                    {category.description}
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-3">
                    {countLabel && (
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {countLabel}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                      {t('browse')}
                      <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
