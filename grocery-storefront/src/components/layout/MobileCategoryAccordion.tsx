'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
import { useQuery } from 'urql';

import { Link } from '@/i18n/navigation';
import { useChannel } from '@/hooks/use-channel';
import { PUBLIC_CATEGORY_NAVIGATION_QUERY } from '@/lib/graphql/operations/grocery';
import { buildCategoryTree, type PublicTaxonomyRawCategory } from '@/lib/public-taxonomy';

interface CategoriesResponse {
  categories: {
    edges: Array<{ node: PublicTaxonomyRawCategory }>;
  } | null;
}

interface MobileCategoryAccordionProps {
  open: boolean;
  onNavigate: () => void;
}

// The drawer shows the same tree as the hub and the category pages: every
// group, and every leaf, including the ones that are empty right now.
const TREE_OPTIONS = { requireProductCount: false, includeEmpty: true } as const;

export function MobileCategoryAccordion({ open, onNavigate }: MobileCategoryAccordionProps) {
  const t = useTranslations('categories');
  const locale = useLocale();
  const channel = useChannel();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [result] = useQuery<CategoriesResponse>({
    query: PUBLIC_CATEGORY_NAVIGATION_QUERY,
    variables: { channel },
    pause: !open,
  });

  const groups = useMemo(
    () => buildCategoryTree(result.data?.categories?.edges.map((edge) => edge.node) ?? [], locale, TREE_OPTIONS),
    [locale, result.data],
  );

  if (groups.length === 0) {
    return null;
  }

  return (
    <nav
      data-testid="mobile-category-accordion"
      aria-label={t('allCategories')}
      className="mt-4 overflow-hidden rounded-2xl border"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div
        className="border-b px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
      >
        {t('allCategories')}
      </div>
      <ul>
        {groups.map((group) => {
          const expanded = expandedId === group.id;
          const hasLeaves = group.children.length > 0;
          const leavesId = `mobile-category-leaves-${group.id}`;

          return (
            <li key={group.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-stretch">
                <Link
                  href={`/categories/${group.slug}`}
                  onClick={onNavigate}
                  data-testid="mobile-category-group-link"
                  className="flex min-h-[48px] min-w-0 flex-1 items-center px-3 py-3 text-sm font-medium hover-surface"
                  style={{ color: 'var(--color-foreground)' }}
                >
                  <span className="line-clamp-1">{group.name}</span>
                </Link>
                {hasLeaves && (
                  <button
                    type="button"
                    data-testid="mobile-category-group"
                    aria-expanded={expanded}
                    aria-controls={leavesId}
                    aria-label={t('groupToggle', { name: group.name })}
                    onClick={() => setExpandedId(expanded ? null : group.id)}
                    className="inline-flex w-12 shrink-0 items-center justify-center border-l hover-surface"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-fast ${expanded ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                )}
              </div>
              {hasLeaves && expanded && (
                <ul
                  id={leavesId}
                  data-testid="mobile-category-leaves"
                  className="border-t pb-1"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 4%, var(--color-card))',
                  }}
                >
                  {group.children.map((leaf) => (
                    <li key={leaf.id}>
                      <Link
                        href={`/categories/${leaf.slug}`}
                        onClick={onNavigate}
                        data-testid="mobile-category-leaf"
                        className="flex min-h-11 items-center justify-between gap-3 py-2 pl-6 pr-3 text-sm hover-surface"
                        style={{ color: 'var(--color-foreground)' }}
                      >
                        <span className="line-clamp-1">{leaf.name}</span>
                        {typeof leaf.products.totalCount === 'number' && (
                          <span className="shrink-0 text-[11px] tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                            {leaf.products.totalCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
