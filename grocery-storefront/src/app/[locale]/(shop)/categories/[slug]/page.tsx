import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowLeft, PackageOpen, RefreshCw } from 'lucide-react';

import { ProductListingClient } from '@/components/product-listing/ProductListingClient';
import { Link } from '@/i18n/navigation';
import { CATEGORIES_QUERY, CATEGORY_BY_SLUG_QUERY, PRODUCTS_QUERY } from '@/lib/graphql/operations/grocery';
import { serverGraphqlRequest } from '@/lib/graphql/server-request';
import { resolveChannel } from '@/lib/channel';
import { buildPublicCategories, findPublicCategory } from '@/lib/public-taxonomy';
import type { GroceryProduct } from '@/types';

const PAGE_SIZE = 24;

interface CategoryChildNode {
  id: string;
  slug: string;
  name: string;
  level: number | null;
}

interface CategoryProductConnection {
  edges: Array<{
    node: GroceryProduct;
    cursor: string;
  }>;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
  totalCount: number;
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
  parent: {
    id: string;
    slug: string;
    name: string;
  } | null;
  children: {
    edges: Array<{ node: CategoryChildNode }>;
  } | null;
  products: CategoryProductConnection;
}

interface CategoryBySlugResponse {
  category: CategoryNode | null;
}

interface ProductsResponse {
  products: CategoryProductConnection | null;
}

interface CategoriesResponse {
  categories: {
    edges: Array<{
      node: {
        id: string;
        slug: string;
        name: string;
        products?: {
          totalCount: number;
        } | null;
      };
    }>;
  } | null;
}

interface CategoryPageProps {
  params: {
    slug: string;
  };
}

function formatProductCount(locale: string, count: number) {
  if (locale === 'pl') {
    if (count === 1) return '1 produkt';
    if (count > 1 && count < 5) return `${count} produkty`;
    return `${count} produktów`;
  }

  return count === 1 ? '1 product' : `${count} products`;
}

function decodeRouteSlug(slug: string) {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const [locale, t, tCommon] = await Promise.all([
    getLocale(),
    getTranslations('categories'),
    getTranslations('common'),
  ]);
  const channel = resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG);
  const categorySlug = decodeRouteSlug(params.slug);
  const categoriesResult = await serverGraphqlRequest<CategoriesResponse>(CATEGORIES_QUERY, { channel });
  const rawCategories = categoriesResult.data?.categories?.edges.map((edge) => edge.node) ?? [];
  const publicCategories = buildPublicCategories(rawCategories, locale);
  const publicCategory = findPublicCategory(rawCategories, categorySlug, locale);
  const publicProductsResult = publicCategory
    ? await serverGraphqlRequest<ProductsResponse>(PRODUCTS_QUERY, {
      channel,
      first: PAGE_SIZE,
      filter: { categories: publicCategory.rawCategoryIds },
    })
    : null;
  const result = publicCategory
    ? { data: { category: null }, errorMessage: publicProductsResult?.errorMessage }
    : await serverGraphqlRequest<CategoryBySlugResponse>(CATEGORY_BY_SLUG_QUERY, {
      channel,
      slug: categorySlug,
      first: PAGE_SIZE,
    });
  const category = result.data?.category ?? null;
  const publicProducts = publicProductsResult?.data?.products ?? null;
  const totalCount = category?.products.totalCount ?? 0;
  const childCategories = category?.children?.edges.map((edge) => edge.node) ?? [];
  const products = category?.products.edges.map((edge) => edge.node) ?? [];
  const pageInfo = category?.products.pageInfo ?? { hasNextPage: false, endCursor: null };
  const publicTotalCount = publicProducts?.totalCount ?? 0;
  const publicPageInfo = publicProducts?.pageInfo ?? { hasNextPage: false, endCursor: null };
  const publicProductItems = publicProducts?.edges.map((edge) => edge.node) ?? [];
  const categoryNavigation = publicCategories
    .map((publicNavigationCategory) => ({
      id: publicNavigationCategory.id,
      slug: publicNavigationCategory.slug,
      name: publicNavigationCategory.name,
      count: publicNavigationCategory.products.totalCount,
    }))
    .sort((left, right) => {
      if (left.slug === categorySlug) return -1;
      if (right.slug === categorySlug) return 1;
      return 0;
    });

  return (
    <div className="container-grocery py-8 md:py-12">
      <Link
        href="/categories"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
        style={{ color: 'var(--color-muted-foreground)' }}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('allCategories')}
      </Link>

      {publicCategory && (
        <>
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('eyebrow')}
              </p>
              <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
                {publicCategory.name}
              </h1>
              <p className="mt-3 max-w-2xl text-sm md:text-base" style={{ color: 'var(--color-muted-foreground)' }}>
                {publicCategory.description}
              </p>
            </div>
            <div
              className="inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold"
              style={{
                backgroundColor: publicTotalCount > 0
                  ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                  : 'color-mix(in srgb, var(--color-foreground) 7%, transparent)',
                color: publicTotalCount > 0 ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
              }}
            >
              {publicTotalCount > 0 ? formatProductCount(locale, publicTotalCount) : t('comingSoon')}
            </div>
          </div>

          {result.errorMessage && publicProductItems.length === 0 && (
            <div className="rounded-lg border px-5 py-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {tCommon('error')}
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {result.errorMessage}
              </p>
              <Link
                href={`/categories/${params.slug}`}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {tCommon('retry')}
              </Link>
            </div>
          )}

          {!result.errorMessage && publicProductItems.length > 0 && (
            <ProductListingClient
              channel={channel}
              basePath={`/categories/${publicCategory.slug}`}
              title={publicCategory.name}
              categoryIds={publicCategory.rawCategoryIds}
              initialProducts={publicProductItems}
              initialEndCursor={publicPageInfo.endCursor}
              initialHasMore={publicPageInfo.hasNextPage}
              initialTotalCount={publicTotalCount}
              pageSize={PAGE_SIZE}
              layoutMode="responsive"
              showTitle={false}
              withContainer={false}
              categoryNavigation={categoryNavigation}
              currentCategorySlug={publicCategory.slug}
            />
          )}

          {!result.errorMessage && publicProductItems.length === 0 && (
            <div className="rounded-lg border px-5 py-10 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
              <PackageOpen className="mx-auto h-10 w-10" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {t('comingSoon')}
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('emptyCategory')}
              </p>
              <Link
                href="/categories"
                className="mt-5 inline-flex rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {t('browseAll')}
              </Link>
            </div>
          )}
        </>
      )}

      {!publicCategory && result.errorMessage && !category && (
        <div className="rounded-lg border px-5 py-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tCommon('error')}
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {result.errorMessage}
          </p>
          <Link
            href={`/categories/${params.slug}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {tCommon('retry')}
          </Link>
        </div>
      )}

      {!publicCategory && !result.errorMessage && !category && (
        <div className="rounded-lg border px-5 py-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {t('notFound')}
          </p>
          <Link
            href="/categories"
            className="mt-4 inline-flex rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            {t('browseAll')}
          </Link>
        </div>
      )}

      {!publicCategory && category && (
        <>
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('eyebrow')}
              </p>
              <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-3 max-w-2xl text-sm md:text-base" style={{ color: 'var(--color-muted-foreground)' }}>
                  {category.description}
                </p>
              )}
            </div>
            <div
              className="inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold"
              style={{
                backgroundColor: totalCount > 0
                  ? 'color-mix(in srgb, var(--color-primary) 12%, transparent)'
                  : 'color-mix(in srgb, var(--color-foreground) 7%, transparent)',
                color: totalCount > 0 ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
              }}
            >
              {totalCount > 0 ? formatProductCount(locale, totalCount) : t('comingSoon')}
            </div>
          </div>

          {childCategories.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {childCategories.map((child) => (
                <Link
                  key={child.id}
                  href={`/categories/${child.slug}`}
                  className="rounded-full border px-3 py-1.5 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                >
                  {child.name}
                </Link>
              ))}
            </div>
          )}

          {products.length > 0 ? (
              <ProductListingClient
                channel={channel}
                basePath={`/categories/${category?.slug ?? categorySlug}`}
                title={category.name}
              categoryId={category.id}
              initialProducts={products}
              initialEndCursor={pageInfo.endCursor}
              initialHasMore={pageInfo.hasNextPage}
              initialTotalCount={totalCount}
              pageSize={PAGE_SIZE}
              layoutMode="responsive"
              showTitle={false}
              withContainer={false}
              categoryNavigation={categoryNavigation}
              currentCategorySlug={category.slug}
            />
          ) : (
            <div className="rounded-lg border px-5 py-10 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
              <PackageOpen className="mx-auto h-10 w-10" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                {t('comingSoon')}
              </p>
              <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('emptyCategory')}
              </p>
              <Link
                href="/categories"
                className="mt-5 inline-flex rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {t('browseAll')}
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
