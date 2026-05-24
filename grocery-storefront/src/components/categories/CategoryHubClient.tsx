'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, ChevronDown, Search } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { groupCategories, searchCategories, type GroupableCategory } from '@/lib/category-groups';

interface CategoryHubClientProps {
  categories: GroupableCategory[];
}

function formatProductCount(locale: string, count: number) {
  if (locale === 'pl') {
    if (count === 1) return '1 produkt';
    if (count > 1 && count < 5) return `${count} produkty`;
    return `${count} produktow`;
  }

  return count === 1 ? '1 product' : `${count} products`;
}

function getProductCount(category: GroupableCategory) {
  return category.products?.totalCount ?? 0;
}

export function CategoryHubClient({ categories }: CategoryHubClientProps) {
  const t = useTranslations('categories');
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

  const filteredCategories = useMemo(() => searchCategories(categories, query), [categories, query]);
  const groups = useMemo(() => groupCategories(filteredCategories), [filteredCategories]);

  function handleGroupToggle(groupId: string) {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

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

      {groups.length === 0 && (
        <div
          className="rounded-lg border px-5 py-8 text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('empty')}
          </p>
        </div>
      )}

      {groups.map((group) => {
        const collapsed = collapsedGroups.has(group.id) && !query.trim();

        return (
          <section key={group.id} className="border-t pt-5" style={{ borderColor: 'var(--color-border)' }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="heading-section text-lg md:text-xl" style={{ color: 'var(--color-foreground)' }}>
                {group.title}
              </h2>
              <button
                type="button"
                aria-expanded={!collapsed}
                onClick={() => handleGroupToggle(group.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-fast hover-surface md:hidden"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform duration-fast ${collapsed ? '' : 'rotate-180'}`}
                  aria-hidden="true"
                />
                <span className="sr-only">{group.title}</span>
              </button>
            </div>

            {!collapsed && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.categories.map((category) => {
                  const count = getProductCount(category);
                  const countLabel = count > 0 ? formatProductCount(locale, count) : t('comingSoon');

                  return (
                    <Link
                      key={category.id}
                      href={`/categories/${category.slug}`}
                      aria-label={`${category.name}, ${countLabel}`}
                      className="group flex min-h-28 flex-col justify-between rounded-lg border p-4 transition-transform duration-fast hover:-translate-y-0.5"
                      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                    >
                      <span>
                        <span className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
                          {category.name}
                        </span>
                        {category.description && (
                          <span className="mt-2 line-clamp-2 block text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                            {category.description}
                          </span>
                        )}
                      </span>
                      <span className="mt-4 flex items-center justify-between gap-3">
                        <span
                          className="rounded-full px-3 py-1 text-xs font-semibold"
                          style={{
                            backgroundColor: count > 0
                              ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                              : 'color-mix(in srgb, var(--color-foreground) 7%, transparent)',
                            color: count > 0 ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                          }}
                        >
                          {countLabel}
                        </span>
                        <span className="inline-flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                          {t('browse')}
                          <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
