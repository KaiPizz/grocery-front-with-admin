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
    <div className="container-grocery py-8 md:py-12">
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayItems.map((item) => {
          const imageUrl = getImageSrc(item.thumbnail);

          return (
            <div
              key={item.productId}
              className="rounded-2xl border overflow-hidden"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
            >
              {item.slug ? (
                <Link href={`/products/${item.slug}`} className="block">
                  <div className="relative aspect-[4/3]" style={{ backgroundColor: 'var(--color-muted)' }}>
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
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
                <div className="relative aspect-[4/3]" style={{ backgroundColor: 'var(--color-muted)' }}>
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                      unoptimized={isImageProxySrc(imageUrl)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="w-10 h-10 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
                    </div>
                  )}
                </div>
              )}

              <div className="p-4">
                {item.slug ? (
                  <Link href={`/products/${item.slug}`} className="block">
                    <h2 className="text-base font-semibold leading-snug" style={{ color: 'var(--color-foreground)' }}>
                      {item.name}
                    </h2>
                  </Link>
                ) : (
                  <h2 className="text-base font-semibold leading-snug" style={{ color: 'var(--color-foreground)' }}>
                    {item.name}
                  </h2>
                )}

                <div className="flex items-center justify-between gap-3 mt-3">
                  <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                    {formatPrice(item.price, item.currency)}
                  </span>
                  <span
                    className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
                  >
                    {item.quantity}x
                  </span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr),44px] gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => handleAddToCart(item.productId)}
                    className="h-11 rounded-xl px-4 flex items-center justify-center gap-2 font-semibold transition-all duration-fast active:scale-[0.98] checkout-btn"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                  >
                    <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                    <span>{tCommon('addToCart')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void removeItem(item.productId)}
                    className="h-11 rounded-xl border flex items-center justify-center transition-colors duration-fast hover-surface"
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
