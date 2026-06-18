'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Heart, Package, ShoppingCart, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { useHydrated } from '@/hooks/use-hydrated';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { formatPrice, getImageSrc, isImageProxySrc } from '@/lib/utils';

export default function WishlistPage() {
  const t = useTranslations('wishlist');
  const tCommon = useTranslations('common');
  const isHydrated = useHydrated();
  const addCartItem = useCartStore((state) => state.addItem);
  const items = useWishlistStore((state) => state.items);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const isLoading = useWishlistStore((state) => state.isLoading);
  const displayItems = isHydrated ? items : [];

  function handleAddToCart(productId: string) {
    const item = items.find((entry) => entry.productId === productId);
    if (!item) return;

    void (async () => {
      const success = await addCartItem({
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

      await removeItem(item.productId);
      toast.success(t('movedToCart'));
    })();
  }

  if (!isHydrated || (isLoading && displayItems.length === 0)) {
    return (
      <div className="container-grocery py-16 text-center">
        <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <h1 className="heading-display text-xl mb-2" style={{ color: 'var(--color-foreground)' }}>
          {tCommon('loading')}
        </h1>
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="container-grocery py-16 text-center">
        <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <h1 className="heading-display text-xl mb-2" style={{ color: 'var(--color-foreground)' }}>
          {t('empty')}
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-muted-foreground)' }}>
          {t('emptyDesc')}
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-semibold text-white transition-all duration-fast active:scale-95"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {t('shopNow')}
        </Link>
      </div>
    );
  }

  return (
    <div className="container-grocery py-8 pb-24 md:py-12 md:pb-12">
      <div className="flex items-end justify-between gap-3 mb-6 flex-wrap">
        <h1 className="heading-display text-2xl md:text-3xl" style={{ color: 'var(--color-foreground)' }}>
          {t('title')}
          <span className="text-base font-normal ml-2 tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
            ({displayItems.length})
          </span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          {t('subtitle')}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {displayItems.map((item) => {
          const imageUrl = getImageSrc(item.thumbnail);

          return (
            <div
              key={item.productId}
              className="flex overflow-hidden rounded-2xl border p-3 sm:block sm:p-0"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
            >
              {item.slug ? (
                <Link href={`/products/${item.slug}`} className="block shrink-0" aria-hidden="true" tabIndex={-1}>
                  <div className="relative h-28 w-28 overflow-hidden rounded-xl sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none" style={{ backgroundColor: 'var(--color-muted)' }}>
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-contain sm:object-cover"
                        sizes="(max-width: 640px) 112px, (max-width: 768px) 50vw, 33vw"
                        unoptimized={isImageProxySrc(imageUrl)}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="w-10 h-10 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                      </div>
                    )}
                  </div>
                </Link>
              ) : (
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none" style={{ backgroundColor: 'var(--color-muted)' }}>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      className="object-contain sm:object-cover"
                      sizes="(max-width: 640px) 112px, (max-width: 768px) 50vw, 33vw"
                      unoptimized={isImageProxySrc(imageUrl)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-10 h-10 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex min-w-0 flex-1 flex-col pl-3 sm:block sm:p-4">
                {item.slug ? (
                  <Link href={`/products/${item.slug}`} className="block">
                    <h2 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base" style={{ color: 'var(--color-foreground)' }}>
                      {item.name}
                    </h2>
                  </Link>
                ) : (
                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug sm:text-base" style={{ color: 'var(--color-foreground)' }}>
                    {item.name}
                  </h2>
                )}

                <div className="mt-2 flex items-center justify-between gap-3 sm:mt-3">
                  <span className="text-base font-bold tabular-nums sm:text-lg" style={{ color: 'var(--color-foreground)' }}>
                    {formatPrice(item.price, item.currency)}
                  </span>
                  <span
                    className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
                  >
                    {item.quantity}x
                  </span>
                </div>

                <div className="mt-auto grid grid-cols-[minmax(0,1fr),40px] gap-2 pt-3 sm:mt-4 sm:grid-cols-[minmax(0,1fr),44px] sm:pt-0">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item.productId)}
                    className="checkout-btn flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-all duration-fast active:scale-[0.98] sm:h-11 sm:px-4 sm:text-base"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                    aria-label={t('addToCartItem', { name: item.name })}
                  >
                    <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                    <span className="truncate">{tCommon('addToCart')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void removeItem(item.productId)}
                    className="flex h-10 items-center justify-center rounded-xl border transition-colors duration-fast hover-surface sm:h-11"
                    style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
                    aria-label={`${t('remove')} ${item.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
