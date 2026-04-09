'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import {
  getPaymentStatusLabel,
  normalizePaymentPhase,
  readPendingPaymentContext,
  type PendingPaymentContext,
} from '@/lib/checkout';

export default function CheckoutConfirmationPage() {
  const t = useTranslations('checkout');
  const searchParams = useSearchParams();
  const [storedPaymentContext, setStoredPaymentContext] = useState<PendingPaymentContext | null>(null);
  const paymentReturnId = searchParams.get('paymentReturnId');
  const routeOrderNumber = searchParams.get('order');
  const routeEmail = searchParams.get('email');
  const routePaymentStatus = searchParams.get('paymentStatus');
  const routeConfirmationNeeded = searchParams.get('confirmationNeeded') === '1';

  useEffect(() => {
    if (!paymentReturnId) {
      setStoredPaymentContext(null);
      return;
    }

    setStoredPaymentContext(readPendingPaymentContext(paymentReturnId));
  }, [paymentReturnId]);

  const orderNumber = routeOrderNumber ?? storedPaymentContext?.orderNumber ?? null;
  const email = routeEmail ?? storedPaymentContext?.email ?? null;
  const actionUrl = storedPaymentContext?.actionUrl ?? null;
  const paymentPhase = normalizePaymentPhase(
    routePaymentStatus ?? storedPaymentContext?.paymentStatus,
    actionUrl,
    routeConfirmationNeeded || storedPaymentContext?.confirmationNeeded || false
  );
  const paymentStatusLabel = getPaymentStatusLabel(paymentPhase, storedPaymentContext?.paymentMethodName);

  let headline = t('orderThankYou');
  let message = email ? t('confirmationSent', { email }) : null;

  if (paymentPhase === 'requires_action') {
    headline = 'Order created. Payment still needs confirmation.';
    message = 'Continue to your payment provider to finish the transaction.';
  } else if (paymentPhase === 'pending') {
    headline = 'Order received. Payment is still pending.';
    message = 'We saved the order, but the provider has not confirmed payment yet.';
  } else if (paymentPhase === 'failed') {
    headline = 'Order created, but payment failed.';
    message = 'Retry payment if your provider offers another attempt.';
  }

  if (!orderNumber && paymentReturnId && !storedPaymentContext) {
    return (
      <div className="container-grocery py-16 md:py-24 text-center max-w-lg mx-auto">
        <Loader2 className="w-8 h-8 mx-auto animate-spin mb-4" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          Restoring your payment session...
        </p>
      </div>
    );
  }

  if (!orderNumber) {
    return (
      <div className="container-grocery py-16 md:py-24 text-center max-w-lg mx-auto">
        <h1 className="heading-display text-2xl md:text-3xl mb-3" style={{ color: 'var(--color-foreground)' }}>
          We could not restore this order confirmation.
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-muted-foreground)' }}>
          Return to the storefront and check your account order history.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/account#orders"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-fast active:scale-95"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            View orders
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border transition-all duration-fast active:scale-95"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            Back to home
          </Link>
        </div>
      </div>
    );
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
        {headline}
      </h1>

      <p className="text-sm mb-1" style={{ color: 'var(--color-muted-foreground)' }}>
        {t('orderNumber')}: <span className="font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>#{orderNumber}</span>
      </p>

      {message && (
        <p className="text-sm mb-8" style={{ color: 'var(--color-muted-foreground)' }}>
          {message}
        </p>
      )}

      <p className="text-xs uppercase tracking-[0.18em] mb-8" style={{ color: 'var(--color-muted-foreground)' }}>
        {paymentStatusLabel}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
        {actionUrl && (
          <button
            type="button"
            onClick={() => window.location.assign(actionUrl)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all duration-fast active:scale-95"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            Continue to payment
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
        <Link
          href="/products"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-fast active:scale-95"
          style={{
            border: actionUrl ? '1px solid var(--color-border)' : 'none',
            color: actionUrl ? 'var(--color-foreground)' : 'white',
            backgroundColor: actionUrl ? 'transparent' : 'var(--color-primary)',
          }}
        >
          {t('continueShopping')}
        </Link>
        <Link
          href="/account#orders"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold border transition-all duration-fast active:scale-95"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          View orders
        </Link>
      </div>
    </div>
  );
}
