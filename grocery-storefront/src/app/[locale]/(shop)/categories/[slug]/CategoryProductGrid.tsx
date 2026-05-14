'use client';

import { useState } from 'react';
import { PackageOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useClient } from 'urql';

import { Link } from '@/i18n/navigation';
import { CATEGORY_BY_SLUG_QUERY } from '@/lib/graphql/operations/grocery';
import { ProductCard } from '@/components/product/ProductCard';
import { MobileProductCard } from '@/components/product/MobileProductCard';
import type { GroceryProduct } from '@/types';

interface CategoryProductGridProps {
  channel: string;
  slug: string;
  initialProducts: GroceryProduct[];
  initialEndCursor: string | null;
  initialHasMore: boolean;
  totalCount: number;
  pageSize: number;
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
}

interface CategoryBySlugResponse {
  category: {
    products: CategoryProductConnection;
  } | null;
}

export function CategoryProductGrid({
  channel,
  slug,
  initialProducts,
  initialEndCursor,
  initialHasMore,
  totalCount,
  pageSize,
}: CategoryProductGridProps) {
  const t = useTranslations('categories');
  const tCommon = useTranslations('common');
  const client = useClient();
  const [products, setProducts] = useState(initialProducts);
  const [endCursor, setEndCursor] = useState(initialEndCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  async function handleLoadMore() {
    if (!endCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const result = await client.query<CategoryBySlugResponse>(CATEGORY_BY_SLUG_QUERY, {
        channel,
        slug,
        first: pageSize,
        after: endCursor,
      }).toPromise();

      const nextProducts = result.data?.category?.products;

      if (!nextProducts) return;

      setProducts((current) => [
        ...current,
        ...nextProducts.edges.map((edge) => edge.node),
      ]);
      setEndCursor(nextProducts.pageInfo.endCursor);
      setHasMore(nextProducts.pageInfo.hasNextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  if (products.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {products.map((product, index) => (
          <MobileProductCard key={product.id} product={product} imagePriority={index < 6} />
        ))}
      </div>
      <div className="hidden gap-5 md:grid md:grid-cols-3 lg:grid-cols-4">
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} imagePriority={index < 4} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => void handleLoadMore()}
            disabled={loadingMore}
            className="rounded-lg border px-5 py-3 text-sm font-medium transition-opacity duration-fast hover:opacity-80 disabled:opacity-60"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            {loadingMore ? tCommon('loading') : `${t('loadMore')} (${products.length} / ${totalCount})`}
          </button>
        </div>
      )}
    </>
  );
}
