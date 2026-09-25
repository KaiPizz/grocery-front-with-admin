'use client';

import { useTranslations } from 'next-intl';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';

import { useStorefrontConfig } from '@/components/ConfigProvider';
import { getFulfillmentConfig, isPickupFulfillment } from '@/lib/fulfillment';
import { getPublicLegalIdentity } from '@/lib/storefront-config-shared';

// Public seller identity and contact page. Przelewy24 verification and consumer
// law both require the legal name, NIP, address, phone and email to be reachable
// from every page, so this page renders only configured values and never
// substitutes the brand name for the legal entity.

const SECTION_TITLE = 'text-base font-semibold mt-8';

export default function ContactPage() {
  const t = useTranslations('contact');
  const siteConfig = useStorefrontConfig();
  const legalIdentity = getPublicLegalIdentity(siteConfig);
  const email = siteConfig?.general?.email?.trim() ?? '';
  const phone = siteConfig?.general?.phone?.trim() ?? '';
  const hasEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const hasPhone = phone.replace(/\D/g, '').length >= 7;
  const openingHours = siteConfig?.general?.openingHours ?? [];
  const fulfillment = getFulfillmentConfig(siteConfig);
  const pickupAddress = isPickupFulfillment(siteConfig) ? fulfillment.pickupAddress : null;
  const storeAddressLine = pickupAddress
    ? [pickupAddress.streetAddress1, [pickupAddress.postalCode, pickupAddress.city].filter(Boolean).join(' ')]
        .filter((part) => part && part.trim())
        .join(', ')
    : siteConfig?.general?.address?.trim() ?? '';
  const registrationDetails = legalIdentity
    ? [
        legalIdentity.nip ? `NIP: ${legalIdentity.nip}` : null,
        legalIdentity.regon ? `REGON: ${legalIdentity.regon}` : null,
        legalIdentity.registrationType === 'krs' && legalIdentity.krs ? `KRS: ${legalIdentity.krs}` : null,
      ].filter((value): value is string => value !== null)
    : [];

  return (
    <div className="container-grocery py-8 md:py-12">
      <h1 className="heading-display text-2xl md:text-3xl mb-4" style={{ color: 'var(--color-foreground)' }}>
        {t('title')}
      </h1>
      <div className="max-w-prose text-sm leading-relaxed space-y-3" style={{ color: 'var(--color-muted-foreground)' }}>
        <p>{t('intro')}</p>

        <h2 className={SECTION_TITLE} style={{ color: 'var(--color-foreground)' }}>{t('sellerTitle')}</h2>
        {legalIdentity ? (
          <div className="space-y-1" data-testid="contact-legal-identity">
            <p className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{legalIdentity.legalName}</p>
            {registrationDetails.length > 0 && <p>{registrationDetails.join(' · ')}</p>}
            {legalIdentity.registeredAddress && (
              <p>
                {t('registeredAddress')}: {legalIdentity.registeredAddress}
              </p>
            )}
            {legalIdentity.complaintAddress && (
              <p>
                {t('complaintAddress')}: {legalIdentity.complaintAddress}
              </p>
            )}
          </div>
        ) : (
          <p>{t('sellerUnavailable')}</p>
        )}

        {(storeAddressLine || openingHours.length > 0) && (
          <>
            <h2 className={SECTION_TITLE} style={{ color: 'var(--color-foreground)' }}>{t('storeTitle')}</h2>
            {storeAddressLine && (
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {t('storeAddress')}: {storeAddressLine}
                </span>
              </p>
            )}
            {openingHours.length > 0 && (
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-semibold" style={{ color: 'var(--color-foreground)' }}>{t('hoursTitle')}</p>
                  <ul className="mt-1 space-y-0.5">
                    {openingHours.map((entry) => (
                      <li key={entry.label}>
                        {entry.label}: {entry.opens && entry.closes ? `${entry.opens} – ${entry.closes}` : t('closed')}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}

        <h2 className={SECTION_TITLE} style={{ color: 'var(--color-foreground)' }}>{t('contactTitle')}</h2>
        {hasEmail || hasPhone ? (
          <ul className="space-y-1.5" data-testid="contact-channels">
            {hasEmail && (
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {t('email')}:{' '}
                  <a href={`mailto:${email}`} className="font-semibold underline underline-offset-4" style={{ color: 'var(--color-primary)' }}>
                    {email}
                  </a>
                </span>
              </li>
            )}
            {hasPhone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {t('phone')}:{' '}
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="font-semibold underline underline-offset-4" style={{ color: 'var(--color-primary)' }}>
                    {phone}
                  </a>
                </span>
              </li>
            )}
          </ul>
        ) : (
          <p>{t('contactUnavailable')}</p>
        )}
      </div>
    </div>
  );
}
