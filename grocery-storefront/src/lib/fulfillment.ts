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
