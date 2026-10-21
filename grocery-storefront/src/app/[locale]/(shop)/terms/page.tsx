'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import { courierLegalActive, courierTermsDate, getFulfillmentConfig } from '@/lib/fulfillment';
import { getPublicLegalIdentity } from '@/lib/storefront-config-shared';

export default function TermsPage() {
  const t = useTranslations('legal');
  const locale = useLocale();
  const siteConfig = useStorefrontConfig();
  // Kurier DPD text only once the owner has published its terms version; otherwise the pickup-only text.
  const courier = courierLegalActive(siteConfig);
  const { courierTermsVersion, courierCutoff } = getFulfillmentConfig(siteConfig);
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
        <p>{t(courier ? 'termsIntroCourier' : 'termsIntro')}</p>
        <p>
          {courier && courierTermsVersion
            ? t('termsEffectiveDateCourier', { date: courierTermsDate(courierTermsVersion, locale), version: courierTermsVersion })
            : t('termsEffectiveDate')}
        </p>
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
        <p>{t(courier ? 'termsPaymentsContentCourier' : 'termsPaymentsContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t(courier ? 'termsDeliveryTitleCourier' : 'termsDeliveryTitle')}</h2>
        {courier && (
          <>
            <h3 className="text-sm font-semibold mt-4" style={{ color: 'var(--color-foreground)' }}>{t('termsDeliveryCourierSubtitle')}</h3>
            <p>{t('termsDeliveryCourierContent')}</p>
            {courierCutoff && <p>{t('termsDeliveryCutoffCourier', { cutoff: courierCutoff })}</p>}
            <h3 className="text-sm font-semibold mt-4" style={{ color: 'var(--color-foreground)' }}>{t('termsDeliveryPickupSubtitle')}</h3>
          </>
        )}
        <p>{t('termsDeliveryContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsWithdrawalTitle')}</h2>
        <p>{t(courier ? 'termsWithdrawalContentCourier' : 'termsWithdrawalContent')}</p>
        {legalIdentity?.complaintAddress && <p>{t('complaintAddressLabel')} {legalIdentity.complaintAddress}</p>}
        <p>{t(courier ? 'termsWithdrawalFormCourier' : 'termsWithdrawalForm')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsComplaintsTitle')}</h2>
        <p>{t(courier ? 'termsComplaintsContentCourier' : 'termsComplaintsContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsDisputesTitle')}</h2>
        <p>{t('termsDisputesContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('termsReturnsTitle')}</h2>
        <p>{t('termsReturnsContent')}</p>
      </div>
    </div>
  );
}
