'use client';

import { Package } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export default function ProductNotFound() {
  const t = useTranslations('product');

  return (
    <div className="container-grocery py-16 text-center">
      <Package
        className="mx-auto mb-3 h-12 w-12 opacity-20"
        style={{ color: 'var(--color-muted-foreground)' }}
        aria-hidden="true"
      />
      <p className="mb-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        {t('notFound')}
      </p>
      <Link
        href="/products"
        className="inline-block text-sm font-medium transition-opacity hover:opacity-80"
        style={{ color: 'var(--color-primary)' }}
      >
        {t('backToProducts')}
      </Link>
    </div>
  );
}
