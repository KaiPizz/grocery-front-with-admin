'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'urql';

import { ProductListingClient } from '@/components/product-listing/ProductListingClient';
import { useChannel } from '@/hooks/use-channel';
import { CATEGORIES_QUERY } from '@/lib/graphql/operations/grocery';
import type { StorageZone } from '@/types';

const PAGE_SIZE = 24;

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

export default function ProductsPage() {
  const t = useTranslations('products');
  const searchParams = useSearchParams();
  const channel = useChannel();
  const initialZone = searchParams.get('zone') as StorageZone | null;
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'newest';
  const [categoriesResult] = useQuery<CategoriesResponse>({
    query: CATEGORIES_QUERY,
    variables: { channel },
  });

  const categoryNavigation = useMemo(() => (
    categoriesResult.data?.categories?.edges
      .map((edge) => {
        const count = edge.node.products?.totalCount ?? 0;

        return {
          id: edge.node.id,
          slug: edge.node.slug,
          name: edge.node.name,
          count,
        };
      })
      .filter((item) => item.count > 0)
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name)) ?? []
  ), [categoriesResult.data]);

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
