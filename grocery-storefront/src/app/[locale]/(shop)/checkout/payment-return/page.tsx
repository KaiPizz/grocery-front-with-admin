'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Clock, Loader2, RefreshCw, ShoppingCart, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useRouter } from '@/i18n/navigation';
import { useCartStore } from '@/stores/cart-store';
import {
  P24_SESSION_TTL_MS,
  clearP24CartSnapshot,
  clearP24Pending,
  p24PendingAge,
  readP24CartSnapshot,
  readP24Pending,
} from '@/lib/p24-pending';

// The shopper lands here from Przelewy24. The URL carries only the payment id;
// the state shown always comes from the backend, which itself flips to "paid"
// only after the signed P24 notification has been verified server-side.

type PaymentState = 'loading' | 'pending' | 'paid' | 'failed' | 'error' | 'invalid';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
// The public status endpoint allows five requests per minute per IP:
// 0s, 15s, 30s, 45s, then every 30s, for at most ten minutes.
const EARLY_DELAYS_MS = [15000, 15000, 15000];
const STEADY_DELAY_MS = 30000;
const MAX_POLL_MS = 10 * 60 * 1000;

const MAX_CONSECUTIVE_FAILURES = 3;

export default function PaymentReturnPage() {
  const t = useTranslations('checkout');
  const tFulfillment = useTranslations('fulfillment');
  const tTrackOrder = useTranslations('trackOrder');
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('payment_id');
  const validId = Boolean(paymentId && UUID_RE.test(paymentId));

  const [state, setState] = useState<PaymentState>(validId ? 'loading' : 'invalid');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [canRestoreCart, setCanRestoreCart] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const addLines = useCartStore((state) => state.addLines);
  const router = useRouter();
  const startedAt = useRef(Date.now());
  const failures = useRef(0);

  useEffect(() => {
    if (!validId || typeof window === 'undefined') return;
    const record = readP24Pending();
    if (record?.paymentId === paymentId) {
      if (record.orderNumber) setOrderNumber(record.orderNumber);
      // The P24 session registered by checkout stays valid for 15 minutes.
      if (record.actionUrl && /^https:\/\//.test(record.actionUrl) && p24PendingAge(record) < P24_SESSION_TTL_MS) {
        setResumeUrl(record.actionUrl);
      }
    }
  }, [paymentId, validId]);

  useEffect(() => {
    if (!validId || !paymentId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const check = async () => {
      try {
        const response = await fetch(
          `/api/v1/payments/p24/status?payment_id=${encodeURIComponent(paymentId)}`,
          { cache: 'no-store' }
        );
        if (!response.ok) {
          throw new Error(`status ${response.status}`);
        }
        const data = (await response.json()) as { status?: string };
        if (cancelled) return;
        failures.current = 0;

        const next: PaymentState =
          data.status === 'paid' ? 'paid' : data.status === 'failed' ? 'failed' : 'pending';
        setState(next);

        if (next === 'paid') {
          clearP24Pending();
          clearP24CartSnapshot();
          return;
        }

        if (next === 'failed') {
          // Closed for good: checkout must not send the shopper back here, and
          // the cart they paid for may be restored to try again.
          clearP24Pending();
          setCanRestoreCart(readP24CartSnapshot(paymentId) !== null);
          return;
        }

        if (next === 'pending') {
          if (Date.now() - startedAt.current >= MAX_POLL_MS) {
            setTimedOut(true);
            return;
          }
          const delay = EARLY_DELAYS_MS[attempt] ?? STEADY_DELAY_MS;
          timer = setTimeout(() => setAttempt((count) => count + 1), delay);
        }
      } catch {
        if (cancelled) return;
        // A single 429/5xx or a network drop must not end polling for good.
        failures.current += 1;
        if (failures.current >= MAX_CONSECUTIVE_FAILURES) {
          setState('error');
          return;
        }
        timer = setTimeout(() => setAttempt((count) => count + 1), STEADY_DELAY_MS);
      }
    };

    void check();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attempt, paymentId, validId]);

  const iconWrap = (color: string, children: React.ReactNode) => (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
      style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)` }}
    >
      {children}
    </div>
  );

  let icon: React.ReactNode;
  let message: string;
  switch (state) {
    case 'paid':
      icon = iconWrap('var(--color-fresh)', <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--color-fresh)' }} aria-hidden="true" />);
      message = t('paymentReturn.paid');
      break;
    case 'failed':
      icon = iconWrap('var(--color-destructive)', <XCircle className="w-8 h-8" style={{ color: 'var(--color-destructive)' }} aria-hidden="true" />);
      message = t('paymentReturn.failed');
      break;
    case 'invalid':
      icon = iconWrap('var(--color-destructive)', <XCircle className="w-8 h-8" style={{ color: 'var(--color-destructive)' }} aria-hidden="true" />);
      message = t('paymentReturn.invalid');
      break;
    case 'error':
      icon = iconWrap('var(--color-destructive)', <XCircle className="w-8 h-8" style={{ color: 'var(--color-destructive)' }} aria-hidden="true" />);
      message = t('paymentReturn.checkFailed');
      break;
    case 'pending':
      icon = iconWrap('var(--color-primary)', <Clock className="w-8 h-8" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />);
      message = timedOut ? t('paymentReturn.stillPending') : t('paymentReturn.pending');
      break;
    default:
      icon = iconWrap('var(--color-primary)', <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />);
      message = t('paymentReturn.pending');
  }

  const restoreCart = async () => {
    const snapshot = paymentId ? readP24CartSnapshot(paymentId) : null;
    if (!snapshot) {
      setCanRestoreCart(false);
      return;
    }
    setRestoring(true);
    try {
      if (await addLines(snapshot.lines)) {
        clearP24CartSnapshot();
        router.push('/checkout');
        return;
      }
      toast.error(t('paymentReturn.restoreCartFailed'));
    } finally {
      setRestoring(false);
    }
  };

  const showCheckAgain = state === 'error' || (state === 'pending' && timedOut);
  const showResume = state === 'pending' && resumeUrl !== null;

  return (
    <div className="container-grocery py-16 md:py-24 text-center max-w-lg mx-auto">
      {icon}

      <h1 className="heading-display text-2xl md:text-3xl mb-3" style={{ color: 'var(--color-foreground)' }}>
        {t('paymentReturn.title')}
      </h1>

      <p className="text-sm mb-4" role="status" aria-live="polite" data-testid="payment-return-status" data-state={state} style={{ color: 'var(--color-muted-foreground)' }}>
        {message}
      </p>

      {orderNumber && (
        <p className="text-sm mb-8" style={{ color: 'var(--color-muted-foreground)' }}>
          {t('orderNumber')}: <span className="font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>#{orderNumber}</span>
          {' · '}
          <Link
            href={{ pathname: '/track-order', query: { order: orderNumber } }}
            className="underline underline-offset-4"
            style={{ color: 'var(--color-primary)' }}
            data-testid="payment-return-track"
          >
            {tTrackOrder('confirmationLink')}
          </Link>
        </p>
      )}

      {showResume && (
        <a
          href={resumeUrl ?? undefined}
          data-testid="payment-return-resume"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all duration-fast active:scale-95 mb-6"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {t('paymentReturn.backToP24')}
        </a>
      )}

      {state === 'failed' && canRestoreCart && (
        <button
          type="button"
          onClick={() => void restoreCart()}
          disabled={restoring}
          data-testid="payment-return-restore-cart"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white transition-all duration-fast active:scale-95 mb-6 disabled:opacity-60"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {restoring ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
          {t('paymentReturn.restoreCart')}
        </button>
      )}

      {showCheckAgain && (
        <button
          type="button"
          onClick={() => {
            setState('loading');
            setTimedOut(false);
            failures.current = 0;
            startedAt.current = Date.now();
            setAttempt((count) => count + 1);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold border transition-all duration-fast active:scale-95 mb-6"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('paymentReturn.checkAgain')}
        </button>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
        <Link
          href="/account?tab=orders"
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
