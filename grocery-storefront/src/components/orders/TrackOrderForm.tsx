'use client';

import { useEffect, useState, type SyntheticEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Search } from 'lucide-react';
import { useChannel } from '@/hooks/use-channel';
import { GUEST_ORDER_QUERY } from '@/lib/graphql/operations/grocery';
import { graphqlRequest } from '@/lib/graphql/request';
import { formatOrderDate } from '@/lib/orders/format';
import { orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from '@/lib/orders/status-labels';
import { formatPrice } from '@/lib/utils';

interface GuestOrderLine {
  productName?: string | null;
  quantity: number;
  totalPrice?: { gross: { amount: number; currency: string } } | null;
}

interface GuestOrder {
  number: string;
  created: string;
  status: string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  isPaid: boolean;
  shippingMethodName?: string | null;
  total: { gross: { amount: number; currency: string } };
  lines: GuestOrderLine[];
}

interface GuestOrderResponse {
  guestOrder: GuestOrder | null;
}

type Phase = 'idle' | 'loading' | 'found' | 'notFound' | 'tooMany' | 'error';

const inputClassName =
  'mt-1 w-full rounded-xl border px-4 py-3 text-base outline-none transition-colors duration-fast focus:border-primary';

export function TrackOrderForm({
  initialOrderNumber = '',
  initialEmail = '',
}: {
  initialOrderNumber?: string;
  initialEmail?: string;
}) {
  const t = useTranslations('trackOrder');
  const tOrders = useTranslations('orders');
  const locale = useLocale();
  const channel = useChannel();
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber);
  const [email, setEmail] = useState(initialEmail);
  const [phase, setPhase] = useState<Phase>('idle');
  const [order, setOrder] = useState<GuestOrder | null>(null);
  // Flipped after hydration so tests (and the browser) know the form is interactive.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  async function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedNumber = orderNumber.trim();
    const trimmedEmail = email.trim();
    if (!trimmedNumber || !trimmedEmail) return;

    setPhase('loading');
    setOrder(null);
    try {
      const response = await graphqlRequest<GuestOrderResponse>(GUEST_ORDER_QUERY, {
        channel,
        input: { orderNumber: trimmedNumber, email: trimmedEmail },
      });
      const throttled =
        response.status === 429 ||
        response.errors.some((error) => /throttl|too many/i.test(error.message ?? ''));
      if (throttled) {
        setPhase('tooMany');
        return;
      }
      if (response.errors.length > 0) {
        setPhase('error');
        return;
      }
      const found = response.data?.guestOrder ?? null;
      setOrder(found);
      setPhase(found ? 'found' : 'notFound');
    } catch {
      setPhase('error');
    }
  }

  const alertMessage =
    phase === 'notFound' ? t('notFound') : phase === 'tooMany' ? t('tooManyAttempts') : phase === 'error' ? t('error') : null;

  return (
    <div className="mt-8 space-y-8">
      <form onSubmit={handleSubmit} noValidate className="space-y-4" data-testid="track-order-form" data-ready={ready ? 'true' : 'false'}>
        <div>
          <label htmlFor="track-order-number" className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {t('orderNumber')}
          </label>
          <input
            id="track-order-number"
            name="orderNumber"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={32}
            required
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            placeholder={t('orderNumberPlaceholder')}
            className={inputClassName}
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}
          />
        </div>
        <div>
          <label htmlFor="track-order-email" className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {t('email')}
          </label>
          <input
            id="track-order-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClassName}
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}
          />
        </div>
        <button
          type="submit"
          disabled={phase === 'loading'}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white transition-all duration-fast active:scale-95 disabled:opacity-60 sm:w-auto"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {phase === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
          {phase === 'loading' ? t('checking') : t('submit')}
        </button>
      </form>

      {alertMessage && (
        <p
          role="alert"
          data-testid="track-order-alert"
          className="rounded-2xl border px-4 py-3 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
            backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
            color: 'var(--color-destructive)',
          }}
        >
          {alertMessage}
        </p>
      )}

      {phase === 'found' && order && (
        <section
          data-testid="track-order-result"
          aria-live="polite"
          className="rounded-2xl border p-5 md:p-6"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
        >
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {t('resultTitle', { number: order.number })}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {t('placedOn', { date: formatOrderDate(order.created, locale) })}
          </p>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('statusLabel')}
              </dt>
              <dd className="mt-1 font-medium" style={{ color: 'var(--color-foreground)' }}>
                {orderStatusLabel(tOrders, order.status)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('paymentLabel')}
              </dt>
              <dd className="mt-1 font-medium" style={{ color: 'var(--color-foreground)' }}>
                {paymentStatusLabel(tOrders, order.paymentStatus ?? (order.isPaid ? 'FULLY_CHARGED' : 'PENDING'))}
              </dd>
            </div>
            {order.paymentMethod && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                  {t('methodLabel')}
                </dt>
                <dd className="mt-1 font-medium" style={{ color: 'var(--color-foreground)' }}>
                  {paymentMethodLabel(tOrders, order.paymentMethod)}
                </dd>
              </div>
            )}
          </dl>

          <h3 className="mt-6 text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {t('items')}
          </h3>
          <ul className="mt-2 space-y-2" role="list">
            {order.lines.map((line, index) => (
              <li key={`${order.number}-${index}`} className="flex items-center justify-between gap-3 text-sm" role="listitem">
                <span style={{ color: 'var(--color-foreground)' }}>
                  {line.productName} × {line.quantity}
                </span>
                {line.totalPrice?.gross && (
                  <span className="tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                    {formatPrice(line.totalPrice.gross.amount, line.totalPrice.gross.currency)}
                  </span>
                )}
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-center justify-between border-t pt-4 text-base font-semibold" style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}>
            <span>{t('total')}</span>
            <span className="tabular-nums">{formatPrice(order.total.gross.amount, order.total.gross.currency)}</span>
          </div>

          <p className="mt-4 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {order.shippingMethodName ? `${order.shippingMethodName} · ` : ''}
            {t('pickupHint')}
          </p>
        </section>
      )}
    </div>
  );
}
