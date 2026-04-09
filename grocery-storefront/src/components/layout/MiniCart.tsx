'use client';

import Image from 'next/image';
import { useState, type FocusEvent } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Package, ShoppingCart, X } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/use-hydrated';
import { useCartStore } from '@/stores/cart-store';
import { cn, formatPrice, getImageSrc, isImageProxySrc } from '@/lib/utils';

export function MiniCart() {
  const tCommon = useTranslations('common');
  const tCart = useTranslations('cart');
  const tNav = useTranslations('nav');
  const items = useCartStore((state) => state.items);
  const initialized = useCartStore((state) => state.initialized);
  const itemCount = useCartStore((state) => state.getItemCount());
  const subtotal = useCartStore((state) => state.getSubtotal());
  const removeItem = useCartStore((state) => state.removeItem);
  const [isOpen, setIsOpen] = useState(false);
  const isHydrated = useHydrated();
  const displayItems = isHydrated && initialized ? items : [];
  const displayItemCount = isHydrated && initialized ? itemCount : 0;
  const displaySubtotal = isHydrated && initialized ? subtotal : 0;
  const subtotalCurrency = displayItems[0]?.currency ?? 'PLN';

  function handleBlurCapture(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
      setIsOpen(false);
    }
  }

  return (
    <div
      className="relative hidden md:block"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocusCapture={() => setIsOpen(true)}
      onBlurCapture={handleBlurCapture}
    >
      <Link
        href="/cart"
        className="flex items-center gap-2 rounded-xl px-3 py-2 hover-surface"
        aria-label={`${tNav('cart')}${displayItemCount > 0 ? `, ${tCommon('itemCount', { count: displayItemCount })}` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <span className="relative flex h-10 w-10 items-center justify-center rounded-xl">
          <ShoppingCart className="h-5 w-5" style={{ color: 'var(--color-foreground)' }} />
          {displayItemCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[20px] h-5 px-1 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}
              aria-hidden="true"
            >
              {displayItemCount > 99 ? '99+' : displayItemCount}
            </span>
          )}
        </span>

        <div className="hidden lg:block min-w-[88px] text-left">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            {tNav('cart')}
          </p>
          <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
            {formatPrice(displaySubtotal, subtotalCurrency)}
          </p>
        </div>

        <ChevronDown
          className={cn('hidden lg:block h-4 w-4 transition-transform duration-fast', isOpen && 'rotate-180')}
          style={{ color: 'var(--color-muted-foreground)' }}
          aria-hidden="true"
        />
      </Link>

      <div
        className={cn(
          'absolute right-0 top-full z-[60] w-[min(92vw,26rem)] pt-3 transition-all duration-fast',
          isOpen ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-2 opacity-0 pointer-events-none'
        )}
      >
        <div
          className="rounded-2xl border shadow-2xl overflow-hidden"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'color-mix(in srgb, var(--color-card) 96%, transparent)',
            boxShadow: '0 24px 60px -24px color-mix(in srgb, var(--color-foreground) 28%, transparent)',
          }}
          role="dialog"
          aria-label={tCart('title')}
        >
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="heading-section text-lg" style={{ color: 'var(--color-foreground)' }}>
                  {tCart('title')}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                {formatPrice(displaySubtotal, subtotalCurrency)}
              </p>
            </div>
          </div>

          {displayItems.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <ShoppingCart
                className="mx-auto mb-3 h-10 w-10 opacity-20"
                style={{ color: 'var(--color-muted-foreground)' }}
                aria-hidden="true"
              />
              <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                {tCart('empty')}
              </p>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {tCart('emptyDesc')}
              </p>
              <Link
                href="/products"
                className="mt-5 inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-fast"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {tCart('shopNow')}
              </Link>
            </div>
          ) : (
            <>
              <div className="cart-preview-scroll max-h-[15.25rem] overflow-y-auto px-5">
                <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                  {displayItems.map((item) => {
                    const imageUrl = getImageSrc(item.thumbnail);
                    const productHref = item.slug ? `/products/${item.slug}` : '/cart';

                    return (
                      <li key={item.id} className="grid grid-cols-[56px,1fr,auto] items-start gap-3 py-4">
                        <Link
                          href={productHref}
                          className="relative block h-14 w-14 overflow-hidden rounded-xl"
                          style={{ backgroundColor: 'var(--color-muted)' }}
                          aria-label={item.name}
                        >
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={item.name}
                              width={56}
                              height={56}
                              className="h-full w-full object-cover"
                              unoptimized={isImageProxySrc(imageUrl)}
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center">
                              <Package
                                className="h-5 w-5 opacity-30"
                                style={{ color: 'var(--color-muted-foreground)' }}
                                aria-hidden="true"
                              />
                            </span>
                          )}
                        </Link>

                        <div className="min-w-0">
                          <Link
                            href={productHref}
                            className="line-clamp-2 text-sm font-medium leading-5 transition-opacity duration-fast hover:opacity-80"
                            style={{ color: 'var(--color-foreground)' }}
                          >
                            {item.name}
                          </Link>
                          <div className="mt-1.5 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                              {item.quantity} x {formatPrice(item.price, item.currency)}
                            </p>
                            <p className="text-xs font-medium tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                              {formatPrice(item.totalPrice ?? item.price * item.quantity, item.currency)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-fast hover-surface"
                          aria-label={`${tCart('remove')} ${item.name}`}
                        >
                          <X className="h-4 w-4" style={{ color: 'var(--color-destructive)' }} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border-t px-5 py-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex items-center justify-between gap-4">
                  <Link
                    href="/cart"
                    className="checkout-btn inline-flex min-w-[120px] items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-fast"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                  >
                    {tNav('cart')}
                  </Link>

                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {tCart('total')}
                    </p>
                    <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                      {formatPrice(displaySubtotal, subtotalCurrency)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
