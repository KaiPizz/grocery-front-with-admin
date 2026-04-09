'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronRight, Package, RefreshCw } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { CUSTOMER_ORDERS_QUERY } from '@/lib/graphql/operations/grocery';
import { getGraphqlErrorMessage, graphqlRequest } from '@/lib/graphql/request';
import { formatPrice } from '@/lib/utils';
import type { CustomerOrder } from '@/types';

interface OrdersResponse {
  orders: {
    totalCount: number;
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
    edges: Array<{ node: CustomerOrder }>;
  } | null;
}

function formatOrderStatus(value: string | null | undefined): string {
  if (!value) return 'Unknown';

  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function getStatusTone(status: string | null | undefined): { background: string; color: string } {
  const normalized = status?.toLowerCase() ?? '';

  if (normalized.includes('cancel') || normalized.includes('fail')) {
    return {
      background: 'color-mix(in srgb, var(--color-destructive) 14%, transparent)',
      color: 'var(--color-destructive)',
    };
  }

  if (normalized.includes('fulfill') || normalized.includes('complete') || normalized.includes('paid')) {
    return {
      background: 'color-mix(in srgb, var(--color-fresh) 15%, transparent)',
      color: 'var(--color-fresh)',
    };
  }

  return {
    background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
    color: 'var(--color-primary)',
  };
}

export function OrdersPanel() {
  const locale = useLocale();
  const tCommon = useTranslations('common');
  const tCheckout = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async (after?: string | null) => {
    const isLoadMore = Boolean(after);
    setError(null);
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await graphqlRequest<OrdersResponse>(CUSTOMER_ORDERS_QUERY, {
        first: 6,
        after: after ?? null,
      });

      const topLevelMessage = getGraphqlErrorMessage(response.errors);
      if (topLevelMessage) {
        throw new Error(topLevelMessage);
      }

      const nextOrders = response.data?.orders;
      const nodes = nextOrders?.edges?.map((edge) => edge.node) ?? [];

      setOrders((previous) => (isLoadMore ? [...previous, ...nodes] : nodes));
      setCursor(nextOrders?.pageInfo?.endCursor ?? null);
      setHasNextPage(Boolean(nextOrders?.pageInfo?.hasNextPage));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : tCommon('error'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [tCommon]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  if (loading) {
    return (
      <section
        id="orders"
        className="rounded-2xl border p-5 mt-8"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Orders
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              {tCommon('loading')}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        id="orders"
        className="rounded-2xl border p-5 mt-8"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Orders
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-destructive)' }}>
              {error}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadOrders()}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-fast hover-surface"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            {tCommon('retry')}
          </button>
        </div>
      </section>
    );
  }

  if (orders.length === 0) {
    return (
      <section
        id="orders"
        className="rounded-2xl border p-5 mt-8"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
          >
            <Package className="w-5 h-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
              Orders
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
              No orders yet. Once you complete checkout, your order history will show up here.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}
            >
              Browse products
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="orders"
      className="rounded-2xl border p-5 mt-8"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)' }}
        >
          <Package className="w-5 h-5" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-foreground)' }}>
            Orders
          </h2>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            Recent orders, statuses, and payment progress from the live storefront API.
          </p>
        </div>
      </div>

      <div className="space-y-4 mt-6">
        {orders.map((order) => {
          const orderStatusTone = getStatusTone(order.status);
          const formattedDate = new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(order.created));
          const visibleLines = order.lines.slice(0, 3);
          const hiddenLineCount = order.lines.length - visibleLines.length;

          return (
            <article
              key={order.id}
              className="rounded-2xl border p-4"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)' }}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold" style={{ color: 'var(--color-foreground)' }}>
                      {tCheckout('orderNumber')} #{order.number}
                    </h3>
                    <span
                      className="inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={orderStatusTone}
                    >
                      {formatOrderStatus(order.status)}
                    </span>
                  </div>

                  <p className="text-sm mt-2" style={{ color: 'var(--color-muted-foreground)' }}>
                    Placed {formattedDate}
                  </p>

                  {visibleLines.length > 0 && (
                    <ul className="space-y-1.5 mt-3" role="list">
                      {visibleLines.map((line, index) => (
                        <li key={`${order.id}-${index}`} className="text-sm" role="listitem">
                          <span style={{ color: 'var(--color-foreground)' }}>
                            {line.productName || 'Item'}
                          </span>
                          <span style={{ color: 'var(--color-muted-foreground)' }}>
                            {' '}
                            x {line.quantity}
                          </span>
                        </li>
                      ))}
                      {hiddenLineCount > 0 && (
                        <li className="text-sm" style={{ color: 'var(--color-muted-foreground)' }} role="listitem">
                          +{hiddenLineCount} more items
                        </li>
                      )}
                    </ul>
                  )}
                </div>

                <div className="rounded-2xl border px-4 py-3 min-w-[180px]" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                    {tCart('total')}
                  </p>
                  <p className="text-lg font-semibold mt-2 tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                    {formatPrice(order.total.gross.amount, order.total.gross.currency, locale)}
                  </p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {hasNextPage && cursor && (
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={() => void loadOrders(cursor)}
            disabled={loadingMore}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-colors duration-fast hover-surface disabled:opacity-60"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
          >
            {loadingMore && <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />}
            Load more
          </button>
        </div>
      )}
    </section>
  );
}
