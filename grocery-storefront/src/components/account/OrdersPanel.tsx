'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Loader2, Package, RefreshCw } from 'lucide-react';
import { useChannel } from '@/hooks/use-channel';
import { Link } from '@/i18n/navigation';
import { CUSTOMER_ORDERS_QUERY } from '@/lib/graphql/operations/grocery';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import { formatPrice } from '@/lib/utils';
import type { CustomerOrderSummary } from '@/types';

interface OrdersResponse {
  orders: {
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
    edges: Array<{
      node: CustomerOrderSummary;
    }>;
  } | null;
}

function formatOrderDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

export function OrdersPanel() {
  const locale = useLocale();
  const tAccount = useTranslations('account');
  const tCommon = useTranslations('common');
  const channel = useChannel();
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async (after?: string | null) => {
    const isLoadMore = Boolean(after);

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await graphqlRequest<OrdersResponse>(CUSTOMER_ORDERS_QUERY, {
        channel,
        first: 10,
        after: after ?? null,
      });
      const message = getGraphqlErrorMessage(response.errors);

      if (message) {
        setError(message);
        return;
      }

      const connection = response.data?.orders;
      const nextOrders = connection?.edges?.map((edge) => edge.node) ?? [];

      setOrders((current) => (isLoadMore ? [...current, ...nextOrders] : nextOrders));
      setTotalCount(connection?.totalCount ?? nextOrders.length);
      setHasNextPage(Boolean(connection?.pageInfo?.hasNextPage));
      setCursor(connection?.pageInfo?.endCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : tAccount('loadOrdersFailed'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [channel, tAccount]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <section
      id="orders"
      className="scroll-mt-32 rounded-2xl border p-5 md:p-6"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('ordersTitle')}
          </h2>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {totalCount > 0 ? tAccount('ordersLoaded', { count: totalCount }) : tAccount('ordersDescription')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadOrders()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium disabled:opacity-60"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          {tAccount('retryOrders')}
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-3" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {tCommon('loading')}
          </p>
        </div>
      ) : error ? (
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
      ) : orders.length === 0 ? (
        <div className="py-12 text-center">
          <Package className="mx-auto h-10 w-10 mb-3 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
          <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
            {tAccount('noOrders')}
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {tAccount('noOrdersHint')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border p-4"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    {tAccount('order')}
                  </p>
                  <p className="text-lg font-semibold mt-1" style={{ color: 'var(--color-foreground)' }}>
                    #{order.number}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                    {formatOrderDate(order.created, locale)}
                  </p>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                    {order.status}
                  </p>
                  <p className="text-lg font-bold tabular-nums mt-1" style={{ color: 'var(--color-foreground)' }}>
                    {formatPrice(order.total.gross.amount, order.total.gross.currency)}
                  </p>
                </div>
              </div>

              <ul className="mt-4 space-y-2" role="list">
                {order.lines.slice(0, 3).map((line, index) => (
                  <li key={`${order.id}-${index}`} className="flex items-center justify-between gap-3 text-sm" role="listitem">
                    <span style={{ color: 'var(--color-foreground)' }}>
                      {tAccount('orderLineQuantity', {
                        name: line.productName || tAccount('orderItem'),
                        quantity: line.quantity,
                      })}
                    </span>
                    {line.totalPrice?.gross && (
                      <span className="tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                        {formatPrice(line.totalPrice.gross.amount, line.totalPrice.gross.currency)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex justify-end">
                <Link
                  href={`/account/orders/${order.id}`}
                  className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-fast hover-surface"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
                >
                  {tAccount('viewOrderDetails')}
                </Link>
              </div>
            </article>
          ))}

          {hasNextPage && cursor && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => void loadOrders(cursor)}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {tAccount('loadMoreOrders')}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
