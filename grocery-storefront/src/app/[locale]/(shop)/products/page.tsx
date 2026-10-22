'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'urql';

import { ProductListingClient } from '@/components/product-listing/ProductListingClient';
import { useChannel } from '@/hooks/use-channel';
import { PUBLIC_CATEGORY_NAVIGATION_QUERY } from '@/lib/graphql/operations/grocery';
import { CUISINE_LINKS } from '@/lib/cuisines';
import { getFoodCategoryIds } from '@/lib/catalog-product-kind';
import { parseCountryQueryParams } from '@/components/product-listing/listing-filters';
import { DEFAULT_SORT } from '@/lib/listing-sort';
import { buildPublicCategories } from '@/lib/public-taxonomy';
import type { StorageZone } from '@/types';

const PAGE_SIZE = 24;

interface CategoriesResponse {
  categories: {
    edges: Array<{
      node: {
        id: string;
        slug: string;
        name: string;
        description: string | null;
        parent?: { id: string } | null;
        products?: {
          totalCount: number;
        } | null;
      };
    }>;
  } | null;
}

export default function ProductsPage() {
  const t = useTranslations('products');
  const locale = useLocale();
  const tNav = useTranslations('nav');
  const searchParams = useSearchParams();
  const channel = useChannel();
  const initialZone = searchParams.get('zone') as StorageZone | null;
  const initialSearch = (searchParams.get('search') || '').trim();
  const initialSort = searchParams.get('sort') || (initialSearch ? 'relevance' : DEFAULT_SORT);
  const [categoriesResult, reexecuteCategoriesQuery] = useQuery<CategoriesResponse>({
    query: PUBLIC_CATEGORY_NAVIGATION_QUERY,
    variables: { channel },
  });

  const foodOnly = searchParams.get('type') === 'food';
  const rawCategories = useMemo(() => categoriesResult.data?.categories?.edges.map((edge) => edge.node) ?? [], [categoriesResult.data]);
  const foodCategoryIds = useMemo(() => getFoodCategoryIds(rawCategories), [rawCategories]);
  const categoryScopeError = foodOnly && !categoriesResult.fetching
    && (categoriesResult.error || foodCategoryIds.length === 0)
    ? t('filterUnavailable') : null;
  const categoryScopeReady = !foodOnly || (!categoriesResult.fetching && !categoryScopeError && foodCategoryIds.length > 0);
  const countries = parseCountryQueryParams(searchParams);
  const selectedCuisine = countries.length === 1 ? CUISINE_LINKS.find((link) => link.country === countries[0]) : null;

  const categoryNavigation = useMemo(() => (
    buildPublicCategories(
      rawCategories,
      locale,
      { requireProductCount: false },
    ).filter((category) => !foodOnly || foodCategoryIds.includes(category.id)).map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      count: category.products.totalCount,
      children: category.children.map((leaf) => ({
        id: leaf.id,
        slug: leaf.slug,
        name: leaf.name,
        count: leaf.products.totalCount,
      })),
    }))
  ), [rawCategories, locale, foodOnly, foodCategoryIds]);

  return (
    <ProductListingClient
      channel={channel}
      basePath="/products"
      title={initialSearch ? t('searchResultsTitle', { query: initialSearch })
        : foodOnly ? (selectedCuisine ? tNav(`cuisine.${selectedCuisine.key}`) : tNav('cuisines')) : t('title')}
      categoryIds={foodOnly ? foodCategoryIds : undefined}
      categoryScopeReady={categoryScopeReady}
      categoryScopeError={categoryScopeError}
      onCategoryScopeRetry={() => reexecuteCategoriesQuery({ requestPolicy: 'network-only' })}
      initialSearch={initialSearch}
      initialSort={initialSort}
      initialZone={initialZone || ''}
      pageSize={PAGE_SIZE}
      layoutMode="adaptive"
      categoryNavigation={categoryNavigation}
    />
  );
}
