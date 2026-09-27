'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Layers3 } from 'lucide-react';
import { useQuery } from 'urql';

import { Link } from '@/i18n/navigation';
import { useChannel } from '@/hooks/use-channel';
import { PUBLIC_CATEGORY_NAVIGATION_QUERY } from '@/lib/graphql/operations/grocery';
import { buildCategoryTree, type PublicTaxonomyRawCategory } from '@/lib/public-taxonomy';

// Leaves shown per group before the "+N more" link back to the group page.
const MAX_LEAVES_PER_GROUP = 8;

// The menu shows the same tree as the /categories hub: every group and every
// leaf, including the ones that are empty right now.
const TREE_OPTIONS = { requireProductCount: false, includeEmpty: true } as const;

interface CategoriesResponse {
  categories: {
    edges: Array<{ node: PublicTaxonomyRawCategory }>;
    totalCount: number;
  } | null;
}

interface CategoryMegaMenuProps {
  open: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onNavigate: () => void;
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
    query: PUBLIC_CATEGORY_NAVIGATION_QUERY,
    variables: { channel },
    pause: !requested,
  });

  const groups = useMemo(
    () => buildCategoryTree(result.data?.categories?.edges.map((edge) => edge.node) ?? [], locale, TREE_OPTIONS),
    [locale, result.data],
  );

  if (!open) {
    return null;
  }

  return (
    <nav
      aria-label={t('megaMenuLabel')}
      data-testid="category-mega-menu"
      className="fixed left-1/2 z-[60] hidden w-[min(76rem,calc(100vw-2rem))] -translate-x-1/2 xl:block"
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

        {result.fetching && groups.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('loading')}
          </p>
        )}

        {!result.fetching && groups.length === 0 && (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('empty')}
          </p>
        )}

        {groups.length > 0 && (
          <div className="grid gap-6 md:grid-cols-5">
            {groups.map((group) => {
              const count = group.products.totalCount;
              const visibleLeaves = group.children.slice(0, MAX_LEAVES_PER_GROUP);
              const hiddenLeafCount = group.children.length - visibleLeaves.length;

              return (
                <div key={group.id} className="min-w-0" data-testid="category-mega-menu-group">
                  <Link
                    href={`/categories/${group.slug}`}
                    data-testid="category-mega-menu-group-link"
                    className="group block rounded-lg px-2.5 py-2 transition-colors duration-fast hover-surface"
                    style={{ color: 'var(--color-foreground)' }}
                    onClick={onNavigate}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-sm font-semibold leading-snug">{group.name}</span>
                      <ArrowRight
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity duration-fast group-hover:opacity-100"
                        aria-hidden="true"
                      />
                    </span>
                    {typeof count === 'number' && (
                      <span className="mt-0.5 block text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {t('productCount', { count })}
                      </span>
                    )}
                  </Link>

                  {visibleLeaves.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {visibleLeaves.map((leaf) => (
                        <li key={leaf.id}>
                          <Link
                            href={`/categories/${leaf.slug}`}
                            data-testid="category-mega-menu-leaf"
                            className="block rounded-md px-2.5 py-1.5 text-sm transition-colors duration-fast hover-surface"
                            style={{ color: 'var(--color-muted-foreground)' }}
                            onClick={onNavigate}
                          >
                            <span className="line-clamp-1">{leaf.name}</span>
                          </Link>
                        </li>
                      ))}
                      {hiddenLeafCount > 0 && (
                        <li>
                          <Link
                            href={`/categories/${group.slug}`}
                            data-testid="category-mega-menu-more"
                            className="block rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors duration-fast hover-surface"
                            style={{ color: 'var(--color-primary)' }}
                            onClick={onNavigate}
                          >
                            {t('moreLeaves', { count: hiddenLeafCount })}
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
