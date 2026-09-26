// Human labels for the codes the storefront GraphQL API returns on orders.
// Backend source of truth: backend/src/modules/storefront-api/types/order.type.ts
// (OrderStatus, PaymentChargeStatusEnum) and orders.payment_method (P24, CASH, …).
// Unknown codes never break the UI: they render through the `unknown` label with the raw code.

export const ORDER_STATUS_CODES = [
  'UNCONFIRMED',
  'UNFULFILLED',
  'PARTIALLY_FULFILLED',
  'FULFILLED',
  'CANCELED',
  'RETURNED',
  'PARTIALLY_RETURNED',
  'DRAFT',
  'EXPIRED',
] as const;

export const PAYMENT_STATUS_CODES = [
  'PENDING',
  'NOT_CHARGED',
  'PARTIALLY_CHARGED',
  'FULLY_CHARGED',
  'PARTIALLY_REFUNDED',
  'FULLY_REFUNDED',
  'REFUSED',
  'CANCELLED',
] as const;

export const PAYMENT_METHOD_CODES = ['P24', 'CASH', 'BANK_TRANSFER', 'CARD'] as const;

/** `useTranslations('orders')` / `getTranslations('orders')` both satisfy this. */
export type OrdersTranslate = (key: string, values?: Record<string, string | number>) => string;

function label(t: OrdersTranslate, group: string, known: readonly string[], code: string | null | undefined): string {
  const value = (code ?? '').trim().toUpperCase();
  if (value && known.includes(value)) return t(`${group}.${value}`);
  return t(`${group}.unknown`, { code: value || '—' });
}

export function orderStatusLabel(t: OrdersTranslate, code?: string | null): string {
  return label(t, 'status', ORDER_STATUS_CODES, code);
}

export function paymentStatusLabel(t: OrdersTranslate, code?: string | null): string {
  return label(t, 'paymentStatus', PAYMENT_STATUS_CODES, code);
}

export function paymentMethodLabel(t: OrdersTranslate, code?: string | null): string {
  return label(t, 'paymentMethod', PAYMENT_METHOD_CODES, code);
}
