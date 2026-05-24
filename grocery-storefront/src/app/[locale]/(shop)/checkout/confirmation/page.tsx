'use client';

import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { Link, redirect } from '@/i18n/navigation';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import {
  getConfiguredText,
  getFulfillmentConfig,
  isPickupFulfillment,
  usesBankTransferPromise,
} from '@/lib/fulfillment';

export default function CheckoutConfirmationPage() {
  const t = useTranslations('checkout');
  const tFulfillment = useTranslations('fulfillment');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get('order');
  const email = searchParams.get('email');
  const siteConfig = useStorefrontConfig();
  const fulfillment = getFulfillmentConfig(siteConfig);
  const pickupMode = isPickupFulfillment(siteConfig);
  const bankTransferMode = usesBankTransferPromise(siteConfig);
  const bankTransferText = getConfiguredText(
    fulfillment.bankTransferInstructions,
    tFulfillment('confirmationBankTransfer')
  );
  const pickupText = getConfiguredText(fulfillment.pickupInstructions, tFulfillment('confirmationPickup'));

  if (!orderNumber) {
    redirect({ href: '/', locale });
  }

  return (
    <div className="container-grocery py-16 md:py-24 text-center max-w-lg mx-auto">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-fresh) 15%, transparent)' }}
      >
        <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--color-fresh)' }} aria-hidden="true" />
      </div>

      <h1
        className="heading-display text-2xl md:text-3xl mb-3"
        style={{ color: 'var(--color-foreground)' }}
      >
        {t('orderThankYou')}
      </h1>

      <p className="text-sm mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
        {t('orderNumber')}: <span className="font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>#{orderNumber}</span>
      </p>

      {email && !pickupMode && !bankTransferMode && (
        <p className="text-sm mb-8" style={{ color: 'var(--color-muted-foreground)' }}>
          {t('confirmationSent', { email })}
        </p>
      )}

      {(bankTransferMode || pickupMode) && (
        <div
          className="mt-8 rounded-lg border p-4 text-left text-sm"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-card))',
            color: 'var(--color-foreground)',
          }}
        >
          {bankTransferMode && <p>{bankTransferText}</p>}
          {pickupMode && <p className={bankTransferMode ? 'mt-2' : undefined}>{pickupText}</p>}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
        <Link
          href="/account#orders"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border transition-all duration-fast active:scale-95"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          {tFulfillment('orderHistory')}
        </Link>
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-fast active:scale-95"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {t('continueShopping')}
        </Link>
      </div>
    </div>
  );
}
