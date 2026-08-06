'use client';

import { useTranslations } from 'next-intl';
import { useStorefrontConfig } from '@/components/ConfigProvider';

export default function TermsPage() {
  const t = useTranslations('legal');
  const siteConfig = useStorefrontConfig();
  const storeName = siteConfig?.branding.storeName?.trim() ?? '';
  const address = siteConfig?.general.address?.trim() ?? '';
  const email = siteConfig?.general.email?.trim() ?? '';
  const hasSellerContact = Boolean(storeName && address && email);

  return (
    <div className="container-grocery py-8 md:py-12">
      <h1 className="heading-display text-2xl md:text-3xl mb-8" style={{ color: 'var(--color-foreground)' }}>
        {t('termsTitle')}
      </h1>
      <div className="max-w-prose text-sm leading-relaxed space-y-4" style={{ color: 'var(--color-muted-foreground)' }}>
        <p>{t('termsIntro')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsSellerTitle')}</h2>
        {hasSellerContact ? (
          <p>
            {storeName}, {address}. {t('termsSellerEmail')}{' '}
            <a href={`mailto:${email}`} className="font-semibold underline underline-offset-4" style={{ color: 'var(--color-primary)' }}>
              {email}
            </a>.
          </p>
        ) : (
          <p>{t('termsSellerUnavailable')}</p>
        )}
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
