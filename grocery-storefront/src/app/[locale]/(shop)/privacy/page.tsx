'use client';

import { useTranslations } from 'next-intl';

import { useStorefrontConfig } from '@/components/ConfigProvider';

export default function PrivacyPage() {
  const t = useTranslations('legal');
  const siteConfig = useStorefrontConfig();
  const contactEmail = siteConfig?.general.email?.trim() ?? '';
  const hasContactEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail);

  return (
    <div className="container-grocery py-8 md:py-12">
      <h1 className="heading-display text-2xl md:text-3xl mb-8" style={{ color: 'var(--color-foreground)' }}>
        {t('privacyTitle')}
      </h1>
      <div className="max-w-prose space-y-4 text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
        <p>{t('privacyIntro')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('privacyDataTitle')}</h2>
        <p>{t('privacyDataContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('privacySocialTitle')}</h2>
        <p>{t('privacySocialContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('privacyCookiesTitle')}</h2>
        <p>{t('privacyCookiesContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('privacyRightsTitle')}</h2>
        <p>{t('privacyRightsContent')}</p>
        <section id="data-deletion" className="scroll-mt-24 space-y-4 pt-2">
          <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('privacyDeletionTitle')}</h2>
          <p>{t('privacyDeletionInstructions')}</p>
          <p>{t('privacyDeletionFacebook')}</p>
          {hasContactEmail ? (
            <p>
              {t('privacyDeletionContact')}{' '}
              <a
                href={`mailto:${contactEmail}`}
                className="font-semibold underline underline-offset-4"
                style={{ color: 'var(--color-primary)' }}
              >
                {contactEmail}
              </a>
              .
            </p>
          ) : (
            <p>{t('privacyContactUnavailable')}</p>
          )}
        </section>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('privacyContactTitle')}</h2>
        {hasContactEmail ? (
          <p>
            {t('privacyContactContent')}{' '}
            <a
              href={`mailto:${contactEmail}`}
              className="font-semibold underline underline-offset-4"
              style={{ color: 'var(--color-primary)' }}
            >
              {contactEmail}
            </a>
            .
          </p>
        ) : (
          <p>{t('privacyContactUnavailable')}</p>
        )}
      </div>
    </div>
  );
}
