'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { ProductListingClient } from '@/components/product-listing/ProductListingClient';
import { useChannel } from '@/hooks/use-channel';
import type { StorageZone } from '@/types';

const PAGE_SIZE = 24;

export default function ProductsPage() {
  const t = useTranslations('products');
  const searchParams = useSearchParams();
  const channel = useChannel();
  const initialZone = searchParams.get('zone') as StorageZone | null;
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'newest';

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
    />
  );
}
