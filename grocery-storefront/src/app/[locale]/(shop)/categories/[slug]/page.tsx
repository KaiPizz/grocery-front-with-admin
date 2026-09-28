import { getLocale, getTranslations } from 'next-intl/server';
import { ChevronRight, PackageOpen, RefreshCw } from 'lucide-react';
import { notFound } from 'next/navigation';

import { ProductListingClient } from '@/components/product-listing/ProductListingClient';
import { Link } from '@/i18n/navigation';
import { CATEGORY_BY_SLUG_QUERY, PRODUCT_LISTING_QUERY, PUBLIC_CATEGORIES_QUERY } from '@/lib/graphql/operations/grocery';
import { serverGraphqlRequest } from '@/lib/graphql/server-request';
import { resolveChannel } from '@/lib/channel';
import { buildCategoryTree, findPublicCategory, type PublicTaxonomyRawCategory } from '@/lib/public-taxonomy';
import type { GroceryProduct } from '@/types';

const PAGE_SIZE = 24;
const CATEGORY_METADATA_REVALIDATE_SECONDS = 300;
const CATEGORY_PRODUCTS_REVALIDATE_SECONDS = 60;
// The tree is the navigation: empty groups and leaves stay visible so a
// category that reached zero products keeps its URL and its place.
const TREE_OPTIONS = { requireProductCount: false, includeEmpty: true } as const;

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
    edges: Array<{ node: PublicTaxonomyRawCategory }>;
  } | null;
}

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
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

function CategoryBreadcrumb({
  label,
  allCategoriesLabel,
  group,
  current,
}: {
  label: string;
  allCategoriesLabel: string;
  group: { slug: string; name: string } | null;
  current: string;
}) {
  const crumbClassName = 'font-medium transition-opacity duration-fast hover:opacity-80';

  return (
    <nav
      aria-label={label}
      className="mb-6 flex flex-wrap items-center gap-1.5 text-sm"
      style={{ color: 'var(--color-muted-foreground)' }}
      data-testid="category-breadcrumb"
    >
      <Link href="/categories" className={crumbClassName}>
        {allCategoriesLabel}
      </Link>
      {group && (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <Link href={`/categories/${group.slug}`} className={crumbClassName}>
            {group.name}
          </Link>
        </>
      )}
      <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span aria-current="page" style={{ color: 'var(--color-foreground)' }}>
        {current}
      </span>
    </nav>
  );
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [locale, t, tCommon] = await Promise.all([
    getLocale(),
    getTranslations('categories'),
    getTranslations('common'),
  ]);
  const channel = resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG);
  const categorySlug = decodeRouteSlug(slug);
  const categoriesResult = await serverGraphqlRequest<CategoriesResponse>(
    PUBLIC_CATEGORIES_QUERY,
    { channel },
    {
      next: {
        revalidate: CATEGORY_METADATA_REVALIDATE_SECONDS,
        tags: [`${channel}:public-categories`],
      },
    },
  );
  const rawCategories = categoriesResult.data?.categories?.edges.map((edge) => edge.node) ?? [];
  const tree = buildCategoryTree(rawCategories, locale, TREE_OPTIONS);
  const publicCategory = findPublicCategory(rawCategories, categorySlug, locale, TREE_OPTIONS);
  const publicProductsResult = publicCategory
    ? await serverGraphqlRequest<ProductsResponse>(PRODUCT_LISTING_QUERY, {
      channel,
      first: PAGE_SIZE,
      filter: { categories: publicCategory.rawCategoryIds },
    }, {
      next: {
        revalidate: CATEGORY_PRODUCTS_REVALIDATE_SECONDS,
        tags: [`${channel}:category-products:${publicCategory.slug}`],
      },
    })
    : null;
  // Slugs outside the tree (hidden categories) still resolve straight from the catalog.
  const result = publicCategory
    ? { data: { category: null }, errorMessage: publicProductsResult?.errorMessage }
    : await serverGraphqlRequest<CategoryBySlugResponse>(CATEGORY_BY_SLUG_QUERY, {
      channel,
      slug: categorySlug,
      first: PAGE_SIZE,
    }, {
      next: {
        revalidate: CATEGORY_PRODUCTS_REVALIDATE_SECONDS,
        tags: [`${channel}:category:${categorySlug}`],
      },
    });
  const category = result.data?.category ?? null;
  const categoryLookupError = categoriesResult.errorMessage ?? result.errorMessage;
  if (!publicCategory && !categoryLookupError && !category) {
    notFound();
  }
  const publicProducts = publicProductsResult?.data?.products ?? null;
  const totalCount = category?.products.totalCount ?? 0;
  const childCategories = category?.children?.edges.map((edge) => edge.node) ?? [];
  const products = category?.products.edges.map((edge) => edge.node) ?? [];
  const pageInfo = category?.products.pageInfo ?? { hasNextPage: false, endCursor: null };
  const publicTotalCount = publicProducts?.totalCount ?? 0;
  const publicPageInfo = publicProducts?.pageInfo ?? { hasNextPage: false, endCursor: null };
  const publicProductItems = publicProducts?.edges.map((edge) => edge.node) ?? [];
  const expandedGroupSlug = publicCategory
    ? (publicCategory.kind === 'leaf' ? publicCategory.parent?.slug ?? publicCategory.slug : publicCategory.slug)
    : null;
  const categoryNavigation = tree.map((group) => ({
    id: group.id,
    slug: group.slug,
    name: group.name,
    count: group.slug === publicCategory?.slug ? publicTotalCount : group.products.totalCount,
    expanded: group.slug === expandedGroupSlug,
    children: group.children.map((leaf) => ({
      id: leaf.id,
      slug: leaf.slug,
      name: leaf.name,
      count: leaf.slug === publicCategory?.slug ? publicTotalCount : leaf.products.totalCount,
    })),
  }));
  const breadcrumbGroup = publicCategory?.kind === 'leaf' ? publicCategory.parent : null;
  const currentName = publicCategory?.name ?? category?.name ?? categorySlug;

  return (
    <div className="container-grocery py-5 md:py-12">
      <CategoryBreadcrumb
        label={t('breadcrumb')}
        allCategoriesLabel={t('allCategories')}
        group={breadcrumbGroup}
        current={currentName}
      />

      {publicCategory && (
        <>
          <div className="mb-4 flex flex-col gap-2 md:mb-8 md:flex-row md:items-end md:justify-between md:gap-4">
            <div>
              <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.18em] md:block" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('eyebrow')}
              </p>
              <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
                {publicCategory.name}
              </h1>
              {publicCategory.description && (
                <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm md:mt-3 md:line-clamp-none md:text-base" style={{ color: 'var(--color-muted-foreground)' }}>
                  {publicCategory.description}
                </p>
              )}
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
                href={`/categories/${slug}`}
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

      {!publicCategory && categoryLookupError && !category && (
        <div className="rounded-lg border px-5 py-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tCommon('error')}
          </p>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {categoryLookupError}
          </p>
          <Link
            href={`/categories/${slug}`}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-opacity duration-fast hover:opacity-80"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {tCommon('retry')}
          </Link>
        </div>
      )}

      {!publicCategory && category && (
        <>
          <div className="mb-4 flex flex-col gap-2 md:mb-8 md:flex-row md:items-end md:justify-between md:gap-4">
            <div>
              <p className="mb-2 hidden text-xs font-semibold uppercase tracking-[0.18em] md:block" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('eyebrow')}
              </p>
              <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-1.5 line-clamp-2 max-w-2xl text-sm md:mt-3 md:line-clamp-none md:text-base" style={{ color: 'var(--color-muted-foreground)' }}>
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
              basePath={`/categories/${category.slug}`}
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
