'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2, Package } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { ORDER_DETAIL_QUERY } from '@/lib/graphql/operations/grocery';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import { formatPrice, getImageSrc, isImageProxySrc } from '@/lib/utils';
import type { CustomerOrderDetail } from '@/types';

interface OrderDetailResponse {
  order: CustomerOrderDetail | null;
}

function AddressBlock({
  title,
  unavailableLabel,
  address,
}: {
  title: string;
  unavailableLabel: string;
  address?: CustomerOrderDetail['shippingAddress'];
}) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
        {title}
      </p>
      {address ? (
        <div className="mt-2 text-sm" style={{ color: 'var(--color-foreground)' }}>
          <p>{address.streetAddress1}</p>
          <p>{address.postalCode} {address.city}</p>
          <p>{address.country}</p>
        </div>
      ) : (
        <p className="mt-2 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {unavailableLabel}
        </p>
      )}
    </div>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const tCommon = useTranslations('common');
  const tCart = useTranslations('cart');
  const tAccount = useTranslations('account');
  const failedToLoadOrder = tAccount('failedToLoadOrder');
  const [order, setOrder] = useState<CustomerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      setLoading(true);
      setError(null);

      try {
        const response = await graphqlRequest<OrderDetailResponse>(ORDER_DETAIL_QUERY, { id: params.id });
        const message = getGraphqlErrorMessage(response.errors);

        if (message) {
          setError(message);
          return;
        }

        setOrder(response.data?.order ?? null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : failedToLoadOrder);
      } finally {
        setLoading(false);
      }
    }

    void loadOrder();
  }, [params.id, failedToLoadOrder]);

  if (loading) {
    return (
      <div className="container-grocery py-16 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin mb-3" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {tCommon('loading')}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-grocery py-12">
        <div
          className="rounded-2xl border px-4 py-4 text-sm"
          style={{
            borderColor: 'color-mix(in srgb, var(--color-destructive) 40%, var(--color-border))',
            backgroundColor: 'color-mix(in srgb, var(--color-destructive) 8%, transparent)',
            color: 'var(--color-destructive)',
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-grocery py-16 text-center">
        <Package className="mx-auto h-10 w-10 mb-3 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
          {tAccount('orderNotFound')}
        </p>
      </div>
    );
  }

  return (
    <div className="container-grocery py-8 md:py-12">
      <Link
        href="/account#orders"
        className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity duration-fast hover:opacity-80"
        style={{ color: 'var(--color-muted-foreground)' }}
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {tAccount('backToOrders')}
      </Link>

      <div
        className="rounded-[28px] border p-6 md:p-8"
        style={{
          borderColor: 'var(--color-border)',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 45%, white) 0%, var(--color-card) 45%, color-mix(in srgb, var(--color-primary) 10%, white) 100%)',
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--color-primary)' }}>
          {tAccount('order')}
        </p>
        <h1 className="heading-display text-3xl mt-2" style={{ color: 'var(--color-foreground)' }}>
          #{order.number}
        </h1>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span style={{ color: 'var(--color-foreground)' }}>{order.status}</span>
          <span style={{ color: 'var(--color-muted-foreground)' }}>{new Date(order.created).toLocaleString()}</span>
          {order.paymentStatus && <span style={{ color: 'var(--color-muted-foreground)' }}>{tAccount('paymentStatus', { status: order.paymentStatus })}</span>}
          {order.trackingNumber && <span style={{ color: 'var(--color-muted-foreground)' }}>{tAccount('trackingNumber', { number: order.trackingNumber })}</span>}
        </div>
      </div>

      <div className="grid gap-6 mt-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {order.lines.map((line, index) => {
            const imageUrl = getImageSrc(line.thumbnail?.url);

            return (
              <article
                key={`${order.id}-${index}`}
                className="rounded-2xl border p-4"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
              >
                <div className="flex items-start gap-4">
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl shrink-0" style={{ backgroundColor: 'var(--color-muted)' }}>
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={line.productName || tAccount('orderItem')}
                        fill
                        className="object-cover"
                        sizes="64px"
                        unoptimized={isImageProxySrc(imageUrl)}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-5 w-5 opacity-30" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      {line.productName || tAccount('orderItem')}
                    </p>
                    {line.variantName && (
                      <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                        {line.variantName}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <span style={{ color: 'var(--color-muted-foreground)' }}>{tAccount('quantity', { quantity: line.quantity })}</span>
                      {line.unitPrice?.gross && (
                        <span style={{ color: 'var(--color-muted-foreground)' }}>
                          {tAccount('unitPrice', { price: formatPrice(line.unitPrice.gross.amount, line.unitPrice.gross.currency) })}
                        </span>
                      )}
                    </div>
                  </div>

                  {line.totalPrice?.gross && (
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                        {formatPrice(line.totalPrice.gross.amount, line.totalPrice.gross.currency)}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="space-y-4">
          <AddressBlock title={tAccount('shippingAddress')} unavailableLabel={tAccount('notAvailable')} address={order.shippingAddress} />
          <AddressBlock title={tAccount('billingAddress')} unavailableLabel={tAccount('notAvailable')} address={order.billingAddress} />

          <section className="rounded-2xl border p-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
            <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
              {tCart('summary')}
            </p>
            <div className="mt-3 space-y-2 text-sm">
              {order.subtotal?.gross && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-muted-foreground)' }}>{tCart('subtotal')}</span>
                  <span className="tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                    {formatPrice(order.subtotal.gross.amount, order.subtotal.gross.currency)}
                  </span>
                </div>
              )}
              {order.shippingPrice && (
                <div className="flex justify-between">
                  <span style={{ color: 'var(--color-muted-foreground)' }}>{tCart('shipping')}</span>
                  <span className="tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                    {formatPrice(order.shippingPrice.amount, order.shippingPrice.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between font-semibold pt-2" style={{ color: 'var(--color-foreground)' }}>
                <span>{tCart('total')}</span>
                <span className="tabular-nums">
                  {formatPrice(order.total.gross.amount, order.total.gross.currency)}
                </span>
              </div>
            </div>

            {order.shippingMethodName && (
              <p className="text-sm mt-4" style={{ color: 'var(--color-muted-foreground)' }}>
                {tAccount('shippingMethod', { method: order.shippingMethodName })}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
