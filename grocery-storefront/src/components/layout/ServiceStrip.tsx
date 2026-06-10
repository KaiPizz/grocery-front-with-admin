'use client';

import { Landmark, MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useStorefrontConfig } from '@/components/ConfigProvider';
import {
  getConfiguredText,
  getFulfillmentConfig,
  isPickupFulfillment,
  usesBankTransferPromise,
} from '@/lib/fulfillment';
import { ShippingCountdown } from './ShippingCountdown';

export function ServiceStrip() {
  const t = useTranslations('fulfillment');
  const siteConfig = useStorefrontConfig();
  const fulfillment = getFulfillmentConfig(siteConfig);

  if (!isPickupFulfillment(siteConfig)) {
    return <ShippingCountdown cutoff={siteConfig?.general?.sameDayShippingCutoff} />;
  }

  const pickupText = getConfiguredText(fulfillment.pickupInstructions, t('pickupService'));
  const bankTransferText = usesBankTransferPromise(siteConfig)
    ? getConfiguredText(fulfillment.bankTransferInstructions, t('bankTransferService'))
    : null;

  return (
    <div
      className="border-b text-[11px] font-semibold sm:text-sm"
      style={{
        minHeight: 'var(--shipping-countdown-height)',
        borderColor: 'var(--color-border)',
        backgroundColor: 'color-mix(in srgb, var(--color-primary) 9%, var(--color-background))',
        color: 'var(--color-foreground)',
      }}
    >
      <div
        className="container-grocery flex items-center justify-center gap-2 py-1 text-center"
        style={{ minHeight: 'var(--shipping-countdown-height)' }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="inline-flex min-w-0 items-center justify-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
          <span className="min-w-0 truncate">{pickupText}</span>
        </span>
        {bankTransferText && (
          <>
            <span className="shrink-0 opacity-60" aria-hidden="true">|</span>
            <span className="inline-flex min-w-0 items-center justify-center gap-1.5">
              <Landmark className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <span className="min-w-0 truncate">{bankTransferText}</span>
            </span>
          </>
        )}
      </div>
    </div>
  );
}
