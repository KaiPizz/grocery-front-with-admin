'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Check, Heart, Minus, Package, Plus, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from '@/i18n/navigation';
import { UnitPrice } from '@/components/grocery/UnitPrice';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { formatPrice, getImageSrc, isImageProxySrc } from '@/lib/utils';
import type { GroceryProduct } from '@/types';

interface MobileProductCardProps {
  product: GroceryProduct;
  imagePriority?: boolean;
  testId?: string;
}

export function MobileProductCard({ product, imagePriority = false, testId }: MobileProductCardProps) {
  const t = useTranslations();
  const variant = product.variants?.[0] as any;
  const addItem = useCartStore((s) => s.addItem);
  const cartItem = useCartStore((s) => {
    const variantId = variant?.id;
    if (!variantId) return null;

    return s.items.find((item) => item.variantId === variantId || item.merchandiseId === variantId) ?? null;
  });
  const updateCartQuantity = useCartStore((s) => s.updateQuantity);
  const removeCartItem = useCartStore((s) => s.removeItem);
  const addWishlistItem = useWishlistStore((s) => s.addItem);
  const removeWishlistItem = useWishlistStore((s) => s.removeItem);
  const isWishlisted = useWishlistStore((s) => s.items.some((item) => item.productId === product.id));
  const [justAdded, setJustAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);

  const inStock = (variant?.quantityAvailable ?? (product as any)?.quantityAvailable ?? 0) > 0;
  const price = variant?.pricing?.price?.gross?.amount ?? (product as any).pricing?.priceRange?.start?.gross?.amount ?? 0;
  const currency = variant?.pricing?.price?.gross?.currency ?? (product as any).pricing?.priceRange?.start?.gross?.currency ?? 'PLN';
  const imageUrl = getImageSrc(product.thumbnail?.url);
  const maxQuantity = Math.max(1, variant?.quantityAvailable ?? (product as any)?.quantityAvailable ?? 99);
  const cartQuantity = cartItem?.quantity ?? 0;
  const isInCart = cartQuantity > 0;
  const displayedQuantity = isInCart ? cartQuantity : quantity;

  function updateQuantity(e: React.MouseEvent, delta: number) {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || busy) return;

    if (isInCart) {
      void handleCartQuantityChange(cartQuantity + delta);
      return;
    }

    setQuantity((current) => Math.max(1, Math.min(maxQuantity, current + delta)));
  }

  async function handleCartQuantityChange(nextQuantity: number) {
    if (!variant || busy) return;

    setBusy(true);
    try {
      const success = nextQuantity <= 0
        ? await removeCartItem(variant.id)
        : await updateCartQuantity(variant.id, Math.min(maxQuantity, nextQuantity));

      if (!success) {
        toast.error(t('common.error'));
      }
    } finally {
      setBusy(false);
    }
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!variant || !inStock || busy) return;

    void (async () => {
      if (isInCart) {
        await handleCartQuantityChange(cartQuantity + 1);
        return;
      }

      setBusy(true);
      try {
        const success = await addItem({
          productId: product.id,
          variantId: variant.id,
          slug: product.slug,
          name: product.name,
          thumbnail: imageUrl || undefined,
          price,
          currency,
          quantity,
          storageZone: product.storageZone,
          allergens: product.allergens,
        });

        if (!success) {
          toast.error(t('common.error'));
          return;
        }

        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1200);
        toast.success(t('product.addToCartSuccess'));
      } finally {
        setBusy(false);
      }
    })();
  }

  function handleWishlistToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!variant) return;

    void (async () => {
      if (isWishlisted) {
        const success = await removeWishlistItem(product.id);

        if (success) {
          toast.success(t('wishlist.removeSuccess'));
        } else {
          toast.error(t('common.error'));
        }

        return;
      }

      const success = await addWishlistItem({
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        thumbnail: imageUrl || undefined,
        price,
        currency,
        quantity,
        storageZone: product.storageZone,
      });

      if (success) {
        toast.success(t('wishlist.addSuccess'));
      } else {
        toast.error(t('common.error'));
      }
    })();
  }

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-[1.45rem] border bg-[var(--color-card)] shadow-[0_18px_36px_-30px_rgba(66,109,72,0.35)] transition-transform duration-fast active:scale-[0.99]"
      style={{ borderColor: 'color-mix(in srgb, var(--color-border) 88%, white)' }}
      aria-label={`${product.name}, ${formatPrice(price, currency)}${!inStock ? `, ${t('product.outOfStock')}` : ''}`}
      data-testid={testId ?? 'mobile-product-card'}
    >
      <div
        className="relative overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(246,249,243,0.92)_72%)]"
        data-testid="mobile-product-card-media"
      >
        <div className="relative aspect-square">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              fill
              priority={imagePriority}
              className="object-contain p-0.5 transition-transform duration-slow group-hover:scale-[1.02]"
              sizes="(max-width: 767px) 50vw, 25vw"
              unoptimized={isImageProxySrc(imageUrl)}
              data-testid="mobile-product-card-image"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package
                className="h-14 w-14 opacity-20"
                style={{ color: 'var(--color-muted-foreground)' }}
                aria-hidden="true"
              />
            </div>
          )}

          <div className="absolute right-1 top-1 z-10">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || busy || (isInCart && cartQuantity >= maxQuantity)}
              className="flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-fast disabled:opacity-40 active:scale-[0.98]"
              style={{
                backgroundColor: justAdded ? 'var(--color-fresh)' : inStock ? 'var(--color-primary)' : 'var(--color-muted)',
                borderColor: justAdded ? 'var(--color-fresh)' : inStock ? 'var(--color-primary)' : 'var(--color-border)',
                color: inStock ? 'white' : 'var(--color-muted-foreground)',
              }}
              aria-label={inStock ? t('product.addToCartWithQuantity', { quantity: displayedQuantity }) : t('product.outOfStock')}
              data-testid="mobile-product-card-add"
            >
              {justAdded ? (
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="absolute bottom-1 left-1 z-10">
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-fast active:scale-[0.98]"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-card) 94%, transparent)',
                borderColor: isWishlisted ? 'var(--color-primary)' : 'var(--color-border)',
                color: isWishlisted ? 'var(--color-primary)' : 'var(--color-foreground)',
              }}
              aria-label={isWishlisted ? t('wishlist.remove') : t('wishlist.add')}
              data-testid="mobile-product-card-wishlist"
            >
              <Heart className={`h-3.5 w-3.5 ${isWishlisted ? 'fill-current' : ''}`} aria-hidden="true" />
            </button>
          </div>

          {!inStock && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-card) 72%, transparent)' }}
            >
              <span
                className="rounded-full px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
              >
                {t('product.outOfStock')}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-2.5 pb-2 pt-2.5">
        <h2
          className="overflow-hidden text-ellipsis whitespace-nowrap text-[0.84rem] font-semibold leading-tight"
          style={{ color: 'var(--color-foreground)' }}
          data-testid="mobile-product-card-title"
        >
          {product.name}
        </h2>

        <div className="mt-2">
          <span className="text-[0.98rem] font-bold tabular-nums tracking-tight" style={{ color: 'var(--color-foreground)' }}>
            {formatPrice(price, currency)}
          </span>
          <UnitPrice
            pricePerUnit={(product as any).pricePerUnit}
            unitOfMeasure={(product as any).unitOfMeasure}
            currency={currency}
            className="block text-[10px] mt-0.5"
          />
        </div>

        <div
          className="mt-3 grid h-11 grid-cols-3 overflow-hidden rounded-full border"
          style={{
            borderColor: isInCart ? 'var(--color-primary)' : 'var(--color-border)',
            backgroundColor: isInCart ? 'var(--color-accent)' : 'var(--color-card)',
          }}
          data-testid="mobile-product-card-stepper"
          data-in-cart={isInCart ? 'true' : 'false'}
        >
          <button
            type="button"
            onClick={(e) => updateQuantity(e, -1)}
            disabled={!inStock || busy || (!isInCart && quantity <= 1)}
            className="flex items-center justify-center transition-colors duration-fast disabled:opacity-40"
            aria-label={t('product.decreaseQuantity', { name: product.name })}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </button>
          <span
            className="flex items-center justify-center text-base font-semibold tabular-nums"
            style={{ color: 'var(--color-foreground)' }}
            aria-live="polite"
            data-testid="mobile-product-card-quantity-value"
          >
            {displayedQuantity}
          </span>
          <button
            type="button"
            onClick={(e) => updateQuantity(e, 1)}
            disabled={!inStock || busy || displayedQuantity >= maxQuantity}
            className="flex items-center justify-center transition-colors duration-fast disabled:opacity-40"
            aria-label={t('product.increaseQuantity', { name: product.name })}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </Link>
  );
}
