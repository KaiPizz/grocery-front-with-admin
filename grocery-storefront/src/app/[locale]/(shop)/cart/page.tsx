'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { ShoppingCart, Trash2, Minus, Plus, Package, ArrowRight, Truck, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import { StorageZoneGroup } from '@/components/grocery/StorageZoneGroup';
import { Link } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/use-hydrated';
import {
  getConfiguredText,
  getFulfillmentConfig,
  isPickupFulfillment,
  usesBankTransferPromise,
} from '@/lib/fulfillment';
import { formatPrice, getImageSrc, isImageProxySrc } from '@/lib/utils';
import type { CartItem } from '@/types';

export default function CartPage() {
  const t = useTranslations('cart');
  const tFulfillment = useTranslations('fulfillment');
  const tCommon = useTranslations('common');
  const tWishlist = useTranslations('wishlist');
  const isHydrated = useHydrated();
  const initialized = useCartStore((state) => state.initialized);
  const itemCount = useCartStore((state) => state.getItemCount());
  const items = useCartStore((state) => state.items);
  const removeItem = useCartStore((state) => state.removeItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getSubtotal = useCartStore((state) => state.getSubtotal);
  const getItemsByZone = useCartStore((state) => state.getItemsByZone);
  const addWishlistItem = useWishlistStore((state) => state.addItem);

  const siteConfig = useStorefrontConfig();
  const fulfillment = getFulfillmentConfig(siteConfig);
  const pickupMode = isPickupFulfillment(siteConfig);
  const bankTransferMode = usesBankTransferPromise(siteConfig);
  const freeShippingThreshold = siteConfig?.general?.freeShippingThreshold ?? 150;
  const pickupNotice = getConfiguredText(fulfillment.pickupInstructions, tFulfillment('cartPickupNotice'));
  const bankTransferNotice = getConfiguredText(fulfillment.bankTransferInstructions, tFulfillment('cartBankTransferNotice'));

  const displayItems = isHydrated && initialized ? items : [];
  const subtotal = isHydrated && initialized ? getSubtotal() : 0;
  const currency = displayItems[0]?.currency ?? 'PLN';
  const itemsByZone = isHydrated && initialized ? getItemsByZone() : {};
  const hasZones = Object.keys(itemsByZone).length > 1 || !itemsByZone.OTHER;

  async function handleSaveForLater(item: CartItem) {
    const success = await addWishlistItem({
      productId: item.productId,
      variantId: item.variantId,
      slug: item.slug,
      name: item.name,
      thumbnail: item.thumbnail,
      price: item.price,
      currency: item.currency,
      quantity: item.quantity,
      storageZone: item.storageZone,
    });
    if (!success) {
      toast.error(tCommon('error'));
      return;
    }

    removeItem(item.id);
    toast.success(tWishlist('savedForLater'));
  }

  function renderCartItem(item: CartItem) {
    const imageUrl = getImageSrc(item.thumbnail);
    const lineTotal = formatPrice(item.totalPrice ?? item.price * item.quantity, item.currency);

    return (
      <div key={item.id} className="px-4 py-3" style={{ backgroundColor: 'var(--color-card)' }} data-testid="cart-item">
        <div className="flex items-start gap-3" data-testid="cart-item-info">
          <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--color-muted)' }}>
            {imageUrl ? (
              <Image src={imageUrl} alt="" width={56} height={56} className="object-cover w-full h-full" unoptimized={isImageProxySrc(imageUrl)} />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="w-5 h-5 opacity-30" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
              {item.name}
            </p>
            {item.allergens && item.allergens.length > 0 && (
              <div className="mt-0.5 flex flex-wrap gap-1">
                {item.allergens.slice(0, 2).map((allergen) => (
                  <span key={allergen} className="allergen-chip text-[10px]">{allergen}</span>
                ))}
              </div>
            )}
            <p className="mt-0.5 text-sm tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
              {formatPrice(item.price, item.currency)}
            </p>
            <button
              type="button"
              onClick={() => void handleSaveForLater(item)}
              className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium transition-opacity duration-fast hover:opacity-80"
              style={{ color: 'var(--color-primary)' }}
              aria-label={t('saveForLaterItem', { name: item.name })}
            >
              <Heart className="w-3.5 h-3.5" aria-hidden="true" />
              {tWishlist('saveForLater')}
            </button>
          </div>

          <span className="text-sm font-bold tabular-nums text-right sm:hidden" style={{ color: 'var(--color-foreground)' }}>
            {lineTotal}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3" data-testid="cart-item-controls">
          <div className="flex items-center gap-0.5 rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity - 1)}
              className="flex h-11 w-11 items-center justify-center transition-colors duration-fast hover-surface"
              aria-label={`Decrease ${item.name} quantity`}
            >
              <Minus className="w-4 h-4" style={{ color: 'var(--color-foreground)' }} aria-hidden="true" />
            </button>
            <span className="min-w-[40px] px-2 text-center text-sm font-medium tabular-nums" style={{ color: 'var(--color-foreground)' }} aria-live="polite">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(item.id, item.quantity + 1)}
              className="flex h-11 w-11 items-center justify-center transition-colors duration-fast hover-surface"
              aria-label={`Increase ${item.name} quantity`}
            >
              <Plus className="w-4 h-4" style={{ color: 'var(--color-foreground)' }} aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm font-bold tabular-nums sm:block" style={{ color: 'var(--color-foreground)' }}>
              {lineTotal}
            </span>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-fast hover-surface"
              aria-label={`${t('remove')} ${item.name}`}
            >
              <Trash2 className="w-4 h-4" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderFulfillmentNotice(compact = false) {
    if (!pickupMode && !bankTransferMode) return null;

    return (
      <div
        className={compact ? 'mb-2.5 rounded-lg border px-3 py-2 text-[11px]' : 'mb-5 rounded-lg border p-3 text-sm'}
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-card))',
          color: 'var(--color-foreground)',
        }}
      >
        {pickupMode && <p>{pickupNotice}</p>}
        {bankTransferMode && <p className={pickupMode ? 'mt-1' : undefined}>{bankTransferNotice}</p>}
      </div>
    );
  }

  if (!isHydrated || !initialized) {
    return (
      <div className="container-grocery py-16 text-center">
        <ShoppingCart className="mx-auto mb-4 h-16 w-16 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <h1 className="heading-display mb-2 text-xl" style={{ color: 'var(--color-foreground)' }}>{tCommon('loading')}</h1>
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="container-grocery py-16 text-center">
        <ShoppingCart className="mx-auto mb-4 h-16 w-16 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <h1 className="heading-display mb-2 text-xl" style={{ color: 'var(--color-foreground)' }}>{t('empty')}</h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>{t('emptyDesc')}</p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 rounded-xl px-8 py-3 font-semibold text-white transition-all duration-fast active:scale-95"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {t('shopNow')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-grocery py-8 pb-56 md:py-12 md:pb-12">
      <h1 className="heading-display mb-6 text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
        {t('title')}
        <span className="ml-2 text-base font-normal tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
          ({isHydrated && initialized ? itemCount : 0})
        </span>
      </h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {hasZones ? (
            <StorageZoneGroup itemsByZone={itemsByZone} renderItem={renderCartItem} />
          ) : (
            <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border)' }}>
              <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {displayItems.map(renderCartItem)}
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:block">
          <div className="sticky top-20 rounded-xl border p-5" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
            <h2 className="heading-section mb-4 text-lg" style={{ color: 'var(--color-foreground)' }}>
              {t('title')}
            </h2>

            <div className="mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-muted-foreground)' }}>{t('subtotal')}</span>
                <span className="font-medium tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                  {formatPrice(subtotal, currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--color-muted-foreground)' }}>{t('shipping')}</span>
                <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  Calculated at checkout
                </span>
              </div>
            </div>

            <div className="mb-5 flex justify-between border-t pt-3" style={{ borderColor: 'var(--color-border)' }}>
              <span className="font-bold" style={{ color: 'var(--color-foreground)' }}>{t('total')}</span>
              <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                {formatPrice(subtotal, currency)}
              </span>
            </div>

            {pickupMode ? renderFulfillmentNotice() : (() => {
              const progress = freeShippingThreshold > 0 ? Math.min(subtotal / freeShippingThreshold, 1) : 1;
              const remaining = Math.max(freeShippingThreshold - subtotal, 0);
              return (
                <div className="mb-5">
                  <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--color-muted)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-normal"
                      style={{
                        width: `${progress * 100}%`,
                        backgroundColor: progress >= 1 ? 'var(--color-fresh)' : 'var(--color-primary)',
                      }}
                    />
                  </div>
                  <p className="mt-1.5 flex items-center gap-1 text-xs" style={{ color: progress >= 1 ? 'var(--color-fresh)' : 'var(--color-muted-foreground)' }}>
                    <Truck className="w-3.5 h-3.5" aria-hidden="true" />
                    {progress >= 1
                      ? (t('freeShippingReached') || 'You qualify for free shipping!')
                      : (t('freeShippingRemaining', { amount: formatPrice(remaining, currency) }) || `Add ${formatPrice(remaining, currency)} more for free shipping`)}
                  </p>
                </div>
              );
            })()}

            <Link
              href="/checkout"
              className="checkout-btn flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white transition-all duration-fast active:scale-[0.98]"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {t('checkout')}
              <ArrowRight className="w-5 h-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 z-40 border-t backdrop-blur lg:hidden"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-card) 96%, transparent)',
          bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
          paddingBottom: '0.75rem',
        }}
        data-testid="mobile-cart-summary-bar"
      >
        <div className="container-grocery py-3">
          {pickupMode ? renderFulfillmentNotice(true) : (() => {
            const progress = freeShippingThreshold > 0 ? Math.min(subtotal / freeShippingThreshold, 1) : 1;
            const remaining = Math.max(freeShippingThreshold - subtotal, 0);
            return (
              <div className="mb-2.5" data-testid="mobile-cart-free-shipping">
                <div
                  className="h-1.5 overflow-hidden rounded-full"
                  style={{ backgroundColor: 'var(--color-muted)' }}
                  aria-hidden="true"
                >
                  <div
                    className="h-full rounded-full transition-all duration-normal"
                    style={{
                      width: `${progress * 100}%`,
                      backgroundColor: progress >= 1 ? 'var(--color-fresh)' : 'var(--color-primary)',
                    }}
                  />
                </div>
                <p
                  className="mt-1 flex items-center gap-1 text-[11px]"
                  style={{ color: progress >= 1 ? 'var(--color-fresh)' : 'var(--color-muted-foreground)' }}
                >
                  <Truck className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {progress >= 1
                      ? (t('freeShippingReached') || 'You qualify for free shipping!')
                      : (t('freeShippingRemaining', { amount: formatPrice(remaining, currency) }) || `Add ${formatPrice(remaining, currency)} more for free shipping`)}
                  </span>
                </p>
              </div>
            );
          })()}

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('total')}
              </p>
              <p className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                {formatPrice(subtotal, currency)}
              </p>
            </div>

            <Link
              href="/checkout"
              className="checkout-btn inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold text-white transition-all duration-fast active:scale-[0.98]"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {t('checkout')}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
