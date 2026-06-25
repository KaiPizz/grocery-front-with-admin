import { getLocale, getTranslations } from 'next-intl/server';
import { RefreshCw } from 'lucide-react';

import { Link } from '@/i18n/navigation';
import { PUBLIC_CATEGORIES_QUERY } from '@/lib/graphql/operations/grocery';
import { serverGraphqlRequest } from '@/lib/graphql/server-request';
import { resolveChannel } from '@/lib/channel';
import { CategoryHubClient } from '@/components/categories/CategoryHubClient';
import { buildPublicCategories, type PublicCategory } from '@/lib/public-taxonomy';

interface CategoryNode {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  products?: {
    totalCount: number;
  } | null;
}

interface CategoriesResponse {
  categories: {
    edges: Array<{ node: CategoryNode }>;
    totalCount: number;
  } | null;
}

const CATEGORY_METADATA_REVALIDATE_SECONDS = 300;

function formatProductCount(locale: string, count: number) {
  if (locale === 'pl') {
    if (count === 1) return '1 produkt';
    if (count > 1 && count < 5) return `${count} produkty`;
    return `${count} produktów`;
  }

  return count === 1 ? '1 product' : `${count} products`;
}

function getProductCount(category: PublicCategory) {
  return category.products?.totalCount ?? null;
}

export default async function CategoriesPage() {
  const [locale, t, tCommon] = await Promise.all([
    getLocale(),
    getTranslations('categories'),
    getTranslations('common'),
  ]);
  const channel = resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG);
  const result = await serverGraphqlRequest<CategoriesResponse>(
    PUBLIC_CATEGORIES_QUERY,
    { channel },
    {
      next: {
        revalidate: CATEGORY_METADATA_REVALIDATE_SECONDS,
        tags: [`${channel}:public-categories`],
      },
    },
  );
  const categories = result.data?.categories?.edges.map((edge) => edge.node) ?? [];
  const publicCategories = buildPublicCategories(categories, locale, { requireProductCount: false });
  const allCountsKnown = publicCategories.every((category) => getProductCount(category) !== null);
  const totalProducts = allCountsKnown
    ? publicCategories.reduce((sum, category) => sum + (getProductCount(category) ?? 0), 0)
    : null;

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
        {totalProducts !== null && (
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {formatProductCount(locale, totalProducts)}
          </p>
        )}
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

      {!result.errorMessage && publicCategories.length === 0 && (
        <div className="rounded-lg border px-5 py-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('empty')}
          </p>
        </div>
      )}

      {publicCategories.length > 0 && (
        <CategoryHubClient categories={publicCategories} />
      )}
    </div>
  );
}
