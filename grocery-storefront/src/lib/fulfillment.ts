import type { CartDeliveryOption } from '@/types';
import type { FulfillmentConfig, StorefrontConfig } from '@/types/storefront-config';

export const DEFAULT_FULFILLMENT_CONFIG: FulfillmentConfig = {
  mode: 'delivery',
  paymentPromise: 'backend',
  stockDisplayMode: 'exact_when_low',
  pickupAddress: null,
  pickupInstructions: null,
  bankTransferInstructions: null,
  courier: 'none',
  courierTermsVersion: null,
  courierCutoff: null,
};

export function getFulfillmentConfig(config: StorefrontConfig | null): FulfillmentConfig {
  return {
    ...DEFAULT_FULFILLMENT_CONFIG,
    ...(config?.general?.fulfillment ?? {}),
  };
}

export function isPickupFulfillment(config: StorefrontConfig | null): boolean {
  return getFulfillmentConfig(config).mode === 'pickup';
}

export function offersCourierDelivery(config: StorefrontConfig | null): boolean {
  return getFulfillmentConfig(config).courier === 'dpd';
}

/** Terms and privacy switch to the Kurier DPD text only once the owner has published its version. */
export function courierLegalActive(config: StorefrontConfig | null): boolean {
  return offersCourierDelivery(config) && !!getFulfillmentConfig(config).courierTermsVersion;
}

/** The terms version (YYYY-MM-DD) as a date in the page language; read in UTC so no time zone shifts the day. */
export function courierTermsDate(version: string, locale: string): string {
  const date = new Date(`${version}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return version;
  return new Intl.DateTimeFormat(locale === 'pl' ? 'pl-PL' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/**
 * The goods total from which delivery is free: the backend freeAbove of the first non-pickup option
 * (Kurier DPD), else the shop config.
 */
export function freeShippingThresholdFor(
  config: StorefrontConfig | null,
  options: CartDeliveryOption[],
): number {
  const courierThreshold = options.find((option) => !isPickupOption(option) && typeof option.freeAbove === 'number')?.freeAbove;
  return courierThreshold ?? config?.general?.freeShippingThreshold ?? 150;
}

/** The free-shipping bar belongs to shops that deliver: delivery mode, or a pickup shop that also offers DPD. */
export function showsFreeShippingBar(config: StorefrontConfig | null): boolean {
  return !isPickupFulfillment(config) || offersCourierDelivery(config);
}

/** Service line (header strip, footer): pickup alone, or pickup and Kurier DPD. */
export function pickupServiceKey(config: StorefrontConfig | null): 'pickupService' | 'pickupAndCourierService' {
  return offersCourierDelivery(config) ? 'pickupAndCourierService' : 'pickupService';
}

/** Chilled and frozen products travel only by pickup (no cold chain on the DPD parcel). */
export function isColdChainProduct(product: { storageZone?: string | null }): boolean {
  return product.storageZone === 'CHILLED' || product.storageZone === 'FROZEN';
}

/** In-store pickup option: the backend carrier when present, else the legacy "PICKUP" id. */
export function isPickupOption(option: Pick<CartDeliveryOption, 'carrierCode' | 'id' | 'name'>): boolean {
  if (option.carrierCode) return option.carrierCode === 'PICKUP';
  return option.id === 'PICKUP';
}

/**
 * Delivery options the checkout offers. A pickup shop without the courier flag keeps only pickup, so a
 * backend courier method never leaks onto a shop that has not published courier terms; any other shop
 * gets the backend list unchanged.
 */
export function visibleDeliveryOptions(
  config: StorefrontConfig | null,
  options: CartDeliveryOption[],
): CartDeliveryOption[] {
  if (isPickupFulfillment(config) && !offersCourierDelivery(config)) {
    return options.filter(isPickupOption);
  }
  return options;
}

export function usesBankTransferPromise(config: StorefrontConfig | null): boolean {
  return getFulfillmentConfig(config).paymentPromise === 'bank_transfer';
}

export function usesAvailabilityOnlyStock(config: StorefrontConfig | null): boolean {
  return getFulfillmentConfig(config).stockDisplayMode === 'availability_only';
}

export function getConfiguredText(value: string | null | undefined, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}
