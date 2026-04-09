'use client';

import { useTranslations } from 'next-intl';

export default function PrivacyPage() {
  const t = useTranslations('legal');

  return (
    <div className="container-grocery py-8 md:py-12">
      <h1 className="heading-display text-2xl md:text-3xl mb-8" style={{ color: 'var(--color-foreground)' }}>
        {t('privacyTitle')}
      </h1>
      <div className="max-w-prose text-sm leading-relaxed space-y-4" style={{ color: 'var(--color-muted-foreground)' }}>
        <p>{t('privacyIntro')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('privacyDataTitle')}</h2>
        <p>{t('privacyDataContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('privacyCookiesTitle')}</h2>
        <p>{t('privacyCookiesContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('privacyRightsTitle')}</h2>
        <p>{t('privacyRightsContent')}</p>
        <h2 className="text-base font-semibold mt-6" style={{ color: 'var(--color-foreground)' }}>{t('privacyContactTitle')}</h2>
        <p>{t('privacyContactContent')}</p>
      </div>
    </div>
  );
}
