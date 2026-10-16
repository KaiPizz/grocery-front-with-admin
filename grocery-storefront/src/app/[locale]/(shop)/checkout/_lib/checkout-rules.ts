import { isPickupFulfillment, isPickupOption } from '@/lib/fulfillment';
import type { CartDeliveryOption } from '@/types';
import type { PaymentMethod } from '@/types/checkout';
import type { StorefrontConfig } from '@/types/storefront-config';

type PaymentMethodLike = Pick<PaymentMethod, 'id' | 'provider'>;

const ADDRESS_FIELDS = ['streetAddress1', 'city', 'postalCode'] as const;
const RECIPIENT_FIELDS = ['recipientFirstName', 'recipientLastName', 'recipientPhone'] as const;

/** Form order, top to bottom; the first visible field with an error gets the focus. */
export const DELIVERY_FIELD_ORDER = [
  'firstName',
  'lastName',
  'email',
  'phone',
  ...RECIPIENT_FIELDS,
  ...ADDRESS_FIELDS,
] as const;

// Paid in cash (or card at the till) when the order is collected.
export function isPayOnCollectionMethod(method: PaymentMethodLike | null): boolean {
  if (!method) return false;
  const code = `${method.id} ${method.provider ?? ''}`.toLowerCase();
  return code.includes('cash') || code.includes('cod');
}

/**
 * Whether the checkout is for in-store pickup right now. Only a pickup shop switches with the selected
 * option (pickup or Kurier DPD); a delivery shop keeps its delivery checkout whatever is selected.
 */
export function resolvePickupSelected(selected: CartDeliveryOption | null, config: StorefrontConfig | null): boolean {
  if (!isPickupFulfillment(config)) return false;
  return selected ? isPickupOption(selected) : true;
}

/** A courier parcel is prepaid: pay-on-collection methods only exist for pickup. */
export function allowedPaymentMethods<T extends PaymentMethodLike>(methods: T[], pickupSelected: boolean): T[] {
  return pickupSelected ? methods : methods.filter((method) => !isPayOnCollectionMethod(method));
}

/** The first field with an error that the form actually renders for this fulfilment. */
export function firstVisibleErrorField(
  errors: Record<string, string | undefined>,
  pickupSelected: boolean,
): (typeof DELIVERY_FIELD_ORDER)[number] | null {
  const hidden: readonly string[] = pickupSelected ? ADDRESS_FIELDS : RECIPIENT_FIELDS;
  return DELIVERY_FIELD_ORDER.find((field) => Boolean(errors[field]) && !hidden.includes(field)) ?? null;
}

/**
 * The option to select for the shopper, or null to leave the selection alone: a choice still on offer
 * stays; otherwise a single option, or pickup when the shop prefers it (a pickup shop that also offers
 * the courier). A delivery shop with several options lets the shopper choose, as before.
 */
export function defaultDeliveryOption(
  visible: CartDeliveryOption[],
  current: CartDeliveryOption | null,
  preferPickup: boolean,
): CartDeliveryOption | null {
  if (current && visible.some((option) => option.id === current.id)) return null;
  if (visible.length === 1) return visible[0];
  return preferPickup ? visible.find(isPickupOption) ?? null : null;
}

/** A cart with chilled or frozen items can only be collected: every non-pickup option is locked. */
export function isDeliveryOptionLocked(option: CartDeliveryOption, cartHasColdChain: boolean): boolean {
  return cartHasColdChain && !isPickupOption(option);
}
