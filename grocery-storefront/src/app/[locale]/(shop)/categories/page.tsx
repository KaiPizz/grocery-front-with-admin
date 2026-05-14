import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight, Layers3, RefreshCw } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { CATEGORIES_QUERY } from '@/lib/graphql/operations/grocery';
import { serverGraphqlRequest } from '@/lib/graphql/server-request';
import { resolveChannel } from '@/lib/channel';

interface CategoryChildNode {
  id: string;
  slug: string;
  name: string;
  level: number | null;
}

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
  children: {
    edges: Array<{ node: CategoryChildNode }>;
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

function formatProductCount(locale: string, count: number) {
  if (locale === 'pl') {
    if (count === 1) return '1 produkt';
    if (count > 1 && count < 5) return `${count} produkty`;
    return `${count} produktów`;
  }

  return count === 1 ? '1 product' : `${count} products`;
}

function getProductCount(category: CategoryNode) {
  return category.products?.totalCount ?? 0;
}

export default async function CategoriesPage() {
  const [locale, t, tCommon] = await Promise.all([
    getLocale(),
    getTranslations('categories'),
    getTranslations('common'),
  ]);
  const channel = resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG);
  const result = await serverGraphqlRequest<CategoriesResponse>(CATEGORIES_QUERY, { channel });
  const categories = result.data?.categories?.edges.map((edge) => edge.node) ?? [];
  const totalProducts = categories.reduce((sum, category) => sum + getProductCount(category), 0);

  return (
    <div className="container-grocery py-8 md:py-12">
      <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('eyebrow')}
          </p>
          <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
            {t('title')}
          </h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {formatProductCount(locale, totalProducts)}
        </p>
      </div>

      {result.errorMessage && categories.length === 0 && (
        <div className="rounded-lg border px-5 py-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tCommon('error')}
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {result.errorMessage}
          </p>
          <Link
            href="/categories"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {tCommon('retry')}
          </Link>
        </div>
      )}

      {!result.errorMessage && categories.length === 0 && (
        <div className="rounded-lg border px-5 py-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('empty')}
          </p>
        </div>
      )}

      {categories.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="categories-grid">
          {categories.map((category) => {
            const count = getProductCount(category);
            const childCount = category.children?.edges.length ?? 0;
            const countLabel = count > 0 ? formatProductCount(locale, count) : t('comingSoon');

            return (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                aria-label={`${category.name}, ${countLabel}`}
                className="group flex min-h-36 flex-col justify-between rounded-lg border p-4 transition-transform duration-fast hover:-translate-y-0.5"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
              >
                <span>
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      {category.name}
                    </span>
                    <Layers3 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                  </span>
                  {category.description && (
                    <span className="mt-2 line-clamp-2 block text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                      {category.description}
                    </span>
                  )}
                </span>
                <span className="mt-5 flex items-center justify-between gap-3">
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
                    {childCount > 0 ? t('subcategories', { count: childCount }) : t('browse')}
                    <ArrowRight className="h-4 w-4 transition-transform duration-fast group-hover:translate-x-0.5" aria-hidden="true" />
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
