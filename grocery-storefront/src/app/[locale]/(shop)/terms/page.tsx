'use client';

import { useTranslations } from 'next-intl';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import { getPublicLegalIdentity } from '@/lib/storefront-config-shared';

export default function TermsPage() {
  const t = useTranslations('legal');
  const siteConfig = useStorefrontConfig();
  const legalIdentity = getPublicLegalIdentity(siteConfig);
  const email = siteConfig?.general.email?.trim() ?? '';
  const phone = siteConfig?.general.phone?.trim() ?? '';
  const registrationDetails = legalIdentity ? [
    legalIdentity.nip ? `NIP: ${legalIdentity.nip}` : null,
    legalIdentity.regon ? `REGON: ${legalIdentity.regon}` : null,
    legalIdentity.registrationType === 'krs' && legalIdentity.krs ? `KRS: ${legalIdentity.krs}` : null,
  ].filter((value): value is string => value !== null) : [];

  return (
    <div className="container-grocery py-8 md:py-12">
      <h1 className="heading-display text-2xl md:text-3xl mb-8" style={{ color: 'var(--color-foreground)' }}>
        {t('termsTitle')}
      </h1>
      <div className="max-w-prose text-sm leading-relaxed space-y-4" style={{ color: 'var(--color-muted-foreground)' }}>
        <p>{t('termsIntro')}</p>
        <p>{t('termsEffectiveDate')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsSellerTitle')}</h2>
        {legalIdentity ? (
          <div className="space-y-2">
            <p className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{legalIdentity.legalName}</p>
            {legalIdentity.registeredAddress && <p>{t('registeredAddressLabel')} {legalIdentity.registeredAddress}</p>}
            {legalIdentity.complaintAddress && <p>{t('complaintAddressLabel')} {legalIdentity.complaintAddress}</p>}
            {registrationDetails.length > 0 && <p>{registrationDetails.join(' · ')}</p>}
            {email && (
              <p>
                {t('termsSellerEmail')}{' '}
                <a href={`mailto:${email}`} className="font-semibold underline underline-offset-4" style={{ color: 'var(--color-primary)' }}>
                  {email}
                </a>.
              </p>
            )}
            {phone && (
              <p>
                {t('termsSellerPhone')}{' '}
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-semibold underline underline-offset-4" style={{ color: 'var(--color-primary)' }}>
                  {phone}
                </a>
              </p>
            )}
          </div>
        ) : (
          <p>{t('termsSellerUnavailable')}</p>
        )}
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsOrdersTitle')}</h2>
        <p>{t('termsOrdersContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsPaymentsTitle')}</h2>
        <p>{t('termsPaymentsContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsDeliveryTitle')}</h2>
        <p>{t('termsDeliveryContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsWithdrawalTitle')}</h2>
        <p>{t('termsWithdrawalContent')}</p>
        <p>{t('termsWithdrawalForm')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsComplaintsTitle')}</h2>
        <p>{t('termsComplaintsContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsDisputesTitle')}</h2>
        <p>{t('termsDisputesContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsReturnsTitle')}</h2>
        <p>{t('termsReturnsContent')}</p>
      </div>
    </div>
  );
}
