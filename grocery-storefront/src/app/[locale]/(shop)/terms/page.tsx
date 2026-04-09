'use client';

import { useTranslations } from 'next-intl';

export default function TermsPage() {
  const t = useTranslations('legal');

  return (
    <div className="container-grocery py-8 md:py-12">
      <h1 className="heading-display text-2xl md:text-3xl mb-8" style={{ color: 'var(--color-foreground)' }}>
        {t('termsTitle')}
      </h1>
      <div className="max-w-prose text-sm leading-relaxed space-y-4" style={{ color: 'var(--color-muted-foreground)' }}>
        <p>{t('termsIntro')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsOrdersTitle')}</h2>
        <p>{t('termsOrdersContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsPaymentsTitle')}</h2>
        <p>{t('termsPaymentsContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsDeliveryTitle')}</h2>
        <p>{t('termsDeliveryContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsReturnsTitle')}</h2>
        <p>{t('termsReturnsContent')}</p>
      </div>
    </div>
  );
}
