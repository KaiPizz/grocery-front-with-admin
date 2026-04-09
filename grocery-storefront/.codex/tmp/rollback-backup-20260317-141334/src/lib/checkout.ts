import type { PaymentSession } from '@/types/checkout';

export type CheckoutPaymentPhase = 'ready' | 'requires_action' | 'pending' | 'paid' | 'failed';

export interface PendingPaymentContext {
  returnId: string;
  orderNumber: string;
  email: string;
  paymentStatus?: string | null;
  actionUrl?: string | null;
  paymentMethodName?: string | null;
  confirmationNeeded: boolean;
}

const PAYMENT_RETURN_STORAGE_PREFIX = 'checkout-payment-return:';

const FAILURE_KEYWORDS = ['fail', 'error', 'cancel', 'declin'];
const ACTION_KEYWORDS = ['action', 'redirect', 'confirm', 'auth', '3ds', 'requires'];
const SUCCESS_KEYWORDS = ['success', 'paid', 'captur', 'complete', 'settl'];
const PENDING_KEYWORDS = ['pending', 'process', 'authoriz', 'created', 'init'];

export function createPaymentReturnId(): string {
  if (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  return `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function normalizePaymentPhase(
  paymentStatus?: string | null,
  actionUrl?: string | null,
  confirmationNeeded = false
): CheckoutPaymentPhase {
  const normalized = paymentStatus?.trim().toLowerCase() ?? '';

  if (FAILURE_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'failed';
  }

  if (actionUrl || ACTION_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'requires_action';
  }

  if (SUCCESS_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'paid';
  }

  if (confirmationNeeded || PENDING_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return 'pending';
  }

  return 'ready';
}

export function getPaymentStatusLabel(
  phase: CheckoutPaymentPhase,
  paymentMethodName?: string | null
): string {
  const methodLabel = paymentMethodName?.trim() ? `${paymentMethodName}: ` : '';

  switch (phase) {
    case 'requires_action':
      return `${methodLabel}action required`;
    case 'pending':
      return `${methodLabel}pending`;
    case 'paid':
      return `${methodLabel}confirmed`;
    case 'failed':
      return `${methodLabel}failed`;
    default:
      return `${methodLabel}ready`;
  }
}

export function savePendingPaymentContext(context: PendingPaymentContext) {
  if (typeof window === 'undefined') return;

  window.sessionStorage.setItem(
    `${PAYMENT_RETURN_STORAGE_PREFIX}${context.returnId}`,
    JSON.stringify(context)
  );
}

export function readPendingPaymentContext(returnId: string): PendingPaymentContext | null {
  if (typeof window === 'undefined') return null;

  const rawValue = window.sessionStorage.getItem(`${PAYMENT_RETURN_STORAGE_PREFIX}${returnId}`);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as PendingPaymentContext;
  } catch {
    return null;
  }
}

export function clearPendingPaymentContext(returnId: string) {
  if (typeof window === 'undefined') return;

  window.sessionStorage.removeItem(`${PAYMENT_RETURN_STORAGE_PREFIX}${returnId}`);
}

export function buildPendingPaymentContext(
  returnId: string,
  payment: PaymentSession | null,
  orderNumber: string,
  email: string,
  confirmationNeeded: boolean
): PendingPaymentContext {
  return {
    returnId,
    orderNumber,
    email,
    paymentStatus: payment?.status ?? null,
    actionUrl: payment?.actionUrl ?? null,
    paymentMethodName: payment?.methodName ?? null,
    confirmationNeeded,
  };
}
