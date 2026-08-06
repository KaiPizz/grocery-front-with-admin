import type { FulfillmentConfig, StorefrontConfig } from '@/types/storefront-config';

export const DEFAULT_FULFILLMENT_CONFIG: FulfillmentConfig = {
  mode: 'delivery',
  paymentPromise: 'backend',
  stockDisplayMode: 'exact_when_low',
  pickupAddress: null,
  pickupInstructions: null,
  bankTransferInstructions: null,
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
