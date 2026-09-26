'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { TrackOrderForm } from '@/components/orders/TrackOrderForm';

// Guest order tracking: order number + checkout e-mail. The page is public and
// the backend answers only with an exact match, so nothing here reveals whether
// a number exists on its own.
export default function TrackOrderPage() {
  const t = useTranslations('trackOrder');
  const searchParams = useSearchParams();
  const initialOrderNumber = (searchParams.get('order') ?? '').slice(0, 32);
  const initialEmail = (searchParams.get('email') ?? '').slice(0, 254);

  return (
    <main id="main-content" className="mx-auto w-full max-w-2xl px-4 py-8 md:py-12">
      <h1 className="heading-display text-3xl" style={{ color: 'var(--color-foreground)' }}>
        {t('title')}
      </h1>
      <p className="mt-3 text-sm md:text-base" style={{ color: 'var(--color-muted-foreground)' }}>
        {t('intro')}
      </p>
      <TrackOrderForm initialOrderNumber={initialOrderNumber} initialEmail={initialEmail} />
    </main>
  );
}
