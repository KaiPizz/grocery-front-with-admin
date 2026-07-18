'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'urql';

import { ProductListingClient } from '@/components/product-listing/ProductListingClient';
import { useChannel } from '@/hooks/use-channel';
import { PUBLIC_CATEGORY_NAVIGATION_QUERY } from '@/lib/graphql/operations/grocery';
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
  const searchParams = useSearchParams();
  const channel = useChannel();
  const initialZone = searchParams.get('zone') as StorageZone | null;
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'newest';
  const [categoriesResult] = useQuery<CategoriesResponse>({
    query: PUBLIC_CATEGORY_NAVIGATION_QUERY,
    variables: { channel },
  });

  const categoryNavigation = useMemo(() => (
    buildPublicCategories(
      categoriesResult.data?.categories?.edges.map((edge) => edge.node) ?? [],
      locale,
      { requireProductCount: false },
    ).map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      count: category.products.totalCount,
    }))
  ), [categoriesResult.data, locale]);

  return (
    <ProductListingClient
      channel={channel}
      basePath="/products"
      title={t('title')}
      initialSearch={initialSearch}
      initialSort={initialSort}
      initialZone={initialZone || ''}
      pageSize={PAGE_SIZE}
      layoutMode="adaptive"
      categoryNavigation={categoryNavigation}
    />
  );
}
