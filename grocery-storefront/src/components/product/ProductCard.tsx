'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { ShoppingCart, Info, Package, Check, Minus, Plus, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { FreshnessBadge } from '@/components/grocery/FreshnessBadge';
import { NutritionModal } from '@/components/grocery/NutritionModal';
import { UnitPrice } from '@/components/grocery/UnitPrice';
import { Link } from '@/i18n/navigation';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { formatPrice, getImageSrc, isImageProxySrc } from '@/lib/utils';
import type { GroceryProduct } from '@/types';

interface ProductCardProps {
  product: GroceryProduct;
  imagePriority?: boolean;
  showCatalogFacts?: boolean;
  actionVisibility?: ProductCardActionVisibility;
}

interface ProductCardImage {
  src: string;
  alt: string;
}

type ProductCardActionVisibility = 'always' | 'reveal';

interface ProductCardMedia {
  url?: string | null;
  alt?: string | null;
  type?: string | null;
  sortOrder?: number | null;
}

const PRODUCT_PREVIEW_INTERVAL_MS = 3000;
const PRODUCT_PREVIEW_MAX_IMAGES = 5;

function getProductCardImages(product: GroceryProduct): ProductCardImage[] {
  const seenSources = new Set<string>();
  const images: ProductCardImage[] = [];
  const media = Array.isArray((product as { media?: ProductCardMedia[] }).media)
    ? [...((product as { media?: ProductCardMedia[] }).media ?? [])]
        .filter((item) => {
          const mediaType = item.type?.toUpperCase();
          return !mediaType || mediaType === 'IMAGE';
        })
        .sort((a, b) => {
          const aOrder = typeof a.sortOrder === 'number' ? a.sortOrder : Number.POSITIVE_INFINITY;
          const bOrder = typeof b.sortOrder === 'number' ? b.sortOrder : Number.POSITIVE_INFINITY;
          return aOrder - bOrder;
        })
    : [];

  const sources = media.length > 0
    ? media.map((item) => ({ url: item.url, alt: item.alt }))
    : [{ url: product.thumbnail?.url, alt: product.thumbnail?.alt }];

  for (const source of sources) {
    const src = getImageSrc(source.url);
    if (!src || seenSources.has(src)) continue;

    seenSources.add(src);
    images.push({
      src,
      alt: source.alt?.trim() || product.name,
    });
  }

  return images;
}

export function ProductCard({
  product,
  imagePriority = false,
  showCatalogFacts = false,
  actionVisibility = 'always',
}: ProductCardProps) {
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
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [carouselReady, setCarouselReady] = useState(false);
  const [previewingImages, setPreviewingImages] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const previewFrameRef = useRef<number | null>(null);

  const inStock = (variant?.quantityAvailable ?? (product as any)?.quantityAvailable ?? 0) > 0;
  const price = variant?.pricing?.price?.gross?.amount ?? (product as any).pricing?.priceRange?.start?.gross?.amount ?? 0;
  const currency = variant?.pricing?.price?.gross?.currency ?? (product as any).pricing?.priceRange?.start?.gross?.currency ?? 'PLN';
  const compareAtPrice = showCatalogFacts
    ? product.compareAtPrice ?? (product as any).pricing?.priceRangeUndiscounted?.start?.gross?.amount ?? null
    : product.compareAtPrice ?? null;
  const showCompareAtPrice = typeof compareAtPrice === 'number' && compareAtPrice > price;
  const showPromo = showCatalogFacts && showCompareAtPrice;
  const cardImages = getProductCardImages(product);
  const previewImages = cardImages.slice(0, PRODUCT_PREVIEW_MAX_IMAGES);
  const primaryImage = cardImages[0] ?? null;
  const hasPreviewImages = previewImages.length > 1;
  const imageUrl = primaryImage?.src ?? '';
  const maxQuantity = Math.max(1, variant?.quantityAvailable ?? (product as any)?.quantityAvailable ?? 99);
  const cartQuantity = cartItem?.quantity ?? 0;
  const isInCart = cartQuantity > 0;
  const displayedQuantity = isInCart ? cartQuantity : quantity;
  const addToCartLabel = t('common.addToCart');
  const storageZoneSymbol = product.storageZone
    ? product.storageZone === 'FROZEN'
      ? '\u2744'
      : product.storageZone === 'CHILLED'
        ? '\u2603'
        : '\u2600'
    : null;
  const storageLabel = product.storageZone ? t(`cart.zoneGroup.${product.storageZone}` as any) : null;
  const scanFacts = [product.category?.name, product.countryOfOrigin, storageLabel].filter((value): value is string => Boolean(value));
  const revealIdleActions = actionVisibility === 'reveal';
  const hiddenActionClass = 'invisible pointer-events-none translate-y-1 opacity-0 group-hover:visible group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100';
  const wishlistActionClass = revealIdleActions && !isWishlisted ? hiddenActionClass : 'translate-y-0 opacity-100';
  const cartActionClass = revealIdleActions && !isInCart ? hiddenActionClass : 'translate-y-0 opacity-100';

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    function handleReducedMotionChange() {
      setReducedMotion(mediaQuery.matches);
    }

    handleReducedMotionChange();
    mediaQuery.addEventListener('change', handleReducedMotionChange);

    return () => mediaQuery.removeEventListener('change', handleReducedMotionChange);
  }, []);

  useEffect(() => {
    return () => {
      if (previewFrameRef.current !== null) {
        window.cancelAnimationFrame(previewFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!previewingImages || reducedMotion || !hasPreviewImages) return;

    const intervalId = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % previewImages.length);
    }, PRODUCT_PREVIEW_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [hasPreviewImages, previewImages.length, previewingImages, reducedMotion]);

  function handlePreviewStart() {
    if (!hasPreviewImages) return;

    setCarouselReady(true);
    setActiveImageIndex(reducedMotion ? 0 : 1);
    if (previewFrameRef.current !== null) {
      window.cancelAnimationFrame(previewFrameRef.current);
    }
    previewFrameRef.current = window.requestAnimationFrame(() => {
      previewFrameRef.current = null;
      setPreviewingImages(true);
    });
  }

  function handlePreviewEnd() {
    if (previewFrameRef.current !== null) {
      window.cancelAnimationFrame(previewFrameRef.current);
      previewFrameRef.current = null;
    }
    setPreviewingImages(false);
    setActiveImageIndex(0);
  }

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

  function handleNutritionClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setNutritionOpen(true);
  }

  return (
    <>
      <Link
        href={`/products/${product.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-none border-0 card-hover sm:rounded-xl sm:border"
        style={{ borderColor: 'var(--color-border)' }}
        aria-label={`${product.name}, ${formatPrice(price, currency)}${!inStock ? `, ${t('product.outOfStock')}` : ''}`}
        onMouseEnter={handlePreviewStart}
        onMouseLeave={handlePreviewEnd}
        onFocus={handlePreviewStart}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            handlePreviewEnd();
          }
        }}
        data-testid="product-card"
      >
        <div className="relative aspect-square shrink-0 overflow-hidden" style={{ backgroundColor: 'var(--color-muted)' }}>
          {primaryImage ? (
            <Image
              src={primaryImage.src}
              alt=""
              fill
              priority={imagePriority}
              className="object-contain p-3 motion-reduce:transition-none sm:p-4"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized={isImageProxySrc(primaryImage.src)}
              data-testid="product-card-image-primary"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="w-10 h-10 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
            </div>
          )}

          {hasPreviewImages && carouselReady && (
            <div
              className={`pointer-events-none absolute inset-0 z-[1] hidden transition-opacity duration-slow motion-reduce:transition-none sm:block ${previewingImages ? 'opacity-100' : 'opacity-0'}`}
              style={{ backgroundColor: 'var(--color-card)' }}
              data-testid="product-card-image-carousel"
            >
              {previewImages.map((image, index) => (
                <Image
                  key={image.src}
                  src={image.src}
                  alt=""
                  fill
                  className={`object-contain p-4 transition-opacity duration-slow motion-reduce:transition-none ${index === activeImageIndex ? 'opacity-100' : 'opacity-0'}`}
                  sizes="(max-width: 1024px) 33vw, 25vw"
                  unoptimized={isImageProxySrc(image.src)}
                  data-testid="product-card-image-slide"
                />
              ))}
            </div>
          )}

          {hasPreviewImages && (
            <span
              className="absolute bottom-2.5 left-2.5 z-10 overflow-hidden rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none tabular-nums"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-card) 92%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-border) 75%, transparent)',
                color: 'var(--color-muted-foreground)',
              }}
              aria-live="polite"
              data-testid="product-card-image-counter"
            >
              <span
                key={activeImageIndex}
                className="product-card-preview-fill absolute inset-0"
                data-active={previewingImages && !reducedMotion ? 'true' : 'false'}
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 18%, transparent)',
                  ['--product-preview-duration' as string]: `${PRODUCT_PREVIEW_INTERVAL_MS}ms`,
                }}
                data-testid="product-card-image-progress"
              />
              <span className="relative z-10">
                {activeImageIndex + 1}/{previewImages.length}
              </span>
            </span>
          )}

          {product.freshness && (
            <div className="absolute left-2.5 top-2.5 z-20 hidden sm:block">
              <FreshnessBadge freshness={product.freshness} nearestExpiry={product.nearestExpiry} compact />
            </div>
          )}

          <div className="absolute right-1.5 top-1.5 z-10 sm:hidden">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || busy || (isInCart && cartQuantity >= maxQuantity)}
              className="flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition-all duration-fast disabled:opacity-40 active:scale-[0.98]"
              style={{
                backgroundColor: justAdded ? 'var(--color-fresh)' : inStock ? 'color-mix(in srgb, var(--color-primary) 92%, transparent)' : 'var(--color-muted)',
                borderColor: justAdded ? 'var(--color-fresh)' : inStock ? 'var(--color-primary)' : 'var(--color-border)',
                color: inStock ? 'white' : 'var(--color-muted-foreground)',
              }}
              aria-label={inStock ? t('product.addToCartWithQuantity', { quantity: displayedQuantity }) : t('product.outOfStock')}
              data-testid="product-card-add"
            >
              {justAdded ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <div className="absolute bottom-1.5 left-1.5 z-10 sm:hidden">
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="flex h-11 w-11 items-center justify-center rounded-full border shadow-sm transition-all duration-fast active:scale-[0.98]"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-card) 90%, transparent)',
                borderColor: isWishlisted ? 'var(--color-primary)' : 'var(--color-border)',
                color: isWishlisted ? 'var(--color-primary)' : 'var(--color-foreground)',
              }}
              aria-label={isWishlisted ? t('wishlist.remove') : t('wishlist.add')}
              data-testid="product-card-wishlist"
            >
              <Heart className={`h-4 w-4 ${isWishlisted ? 'fill-current' : ''}`} aria-hidden="true" />
            </button>
          </div>

          <div className="absolute right-2.5 top-2.5 z-20 hidden flex-col items-end gap-2 sm:flex">
            <button
              type="button"
              onClick={handleWishlistToggle}
              className={`flex h-11 w-11 items-center justify-center rounded-lg border shadow-sm transition-[opacity,transform,box-shadow] duration-fast hover:scale-[1.03] ${wishlistActionClass}`}
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-card) 90%, transparent)',
                borderColor: isWishlisted ? 'var(--color-primary)' : 'var(--color-border)',
                color: isWishlisted ? 'var(--color-primary)' : 'var(--color-foreground)',
              }}
              aria-label={isWishlisted ? t('wishlist.remove') : t('wishlist.add')}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} aria-hidden="true" />
            </button>

            {product.storageZone && (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white zone-${product.storageZone.toLowerCase()}`}
                aria-label={t('product.storageAria', { zone: t(`cart.zoneGroup.${product.storageZone}` as any) })}
              >
                {storageZoneSymbol}
              </span>
            )}
          </div>

          {product.nutritionFacts && (
            <button
              type="button"
              onClick={handleNutritionClick}
              className="absolute bottom-2.5 right-2.5 z-20 hidden h-11 w-11 items-center justify-center rounded-lg border shadow-sm transition-[opacity,transform,box-shadow] duration-fast hover:scale-[1.03] sm:flex"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-card) 90%, transparent)', borderColor: 'var(--color-border)' }}
              aria-label={`${t('product.nutrition')} - ${product.name}`}
            >
              <Info className="w-4 h-4" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
            </button>
          )}

          {!inStock && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--color-card) 70%, transparent)' }}>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                {t('product.outOfStock')}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3.5 sm:bg-[var(--color-card)]">
          {(product.freshness || product.storageZone || product.nutritionFacts) && (
            <div className="mb-2 flex items-start justify-between gap-2 sm:hidden">
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {product.freshness && (
                  <FreshnessBadge freshness={product.freshness} nearestExpiry={product.nearestExpiry} compact />
                )}
                {product.storageZone && (
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white zone-${product.storageZone.toLowerCase()}`}
                    aria-label={t('product.storageAria', { zone: t(`cart.zoneGroup.${product.storageZone}` as any) })}
                  >
                    {storageZoneSymbol}
                  </span>
                )}
              </div>

              {product.nutritionFacts && (
                <button
                  type="button"
                  onClick={handleNutritionClick}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-fast active:scale-[0.98]"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-card) 90%, transparent)',
                    borderColor: 'var(--color-border)',
                  }}
                  aria-label={`${t('product.nutrition')} - ${product.name}`}
                >
                  <Info className="h-4 w-4" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
                </button>
              )}
            </div>
          )}

          {product.allergens && product.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2" role="list" aria-label={t('product.allergens')}>
              {product.allergens.slice(0, 3).map((a) => (
                <span key={a} className="allergen-chip text-[10px]" role="listitem">{t(`allergens.${a}` as any)}</span>
              ))}
              {product.allergens.length > 3 && (
                <span className="allergen-chip text-[10px]" role="listitem">+{product.allergens.length - 3}</span>
              )}
            </div>
          )}

          {product.dietaryTags && product.dietaryTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {product.dietaryTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <h3
            className="mb-1.5 min-h-[1.15rem] overflow-hidden text-ellipsis whitespace-nowrap text-sm font-semibold leading-snug sm:line-clamp-2 sm:min-h-[2.35rem] sm:whitespace-normal"
            style={{ color: 'var(--color-foreground)' }}
            data-testid="product-card-title"
          >
            {product.name}
          </h3>

          <div className="mt-auto pt-2.5">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                  {formatPrice(price, currency)}
                </span>
                {showPromo && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                    style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
                    data-testid="product-card-promo"
                  >
                    {t('product.promo')}
                  </span>
                )}
              </div>
              <UnitPrice
                pricePerUnit={product.pricePerUnit}
                unitOfMeasure={product.unitOfMeasure}
                currency={currency}
                className="block text-[10px] mt-0.5"
              />
              {showCompareAtPrice && (
                <span className="text-xs line-through ml-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
                  {formatPrice(compareAtPrice, currency)}
                </span>
              )}
            </div>

            {showCatalogFacts && (
              <div className="mt-2 space-y-1.5 text-[11px] leading-snug" style={{ color: 'var(--color-muted-foreground)' }}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className="rounded-full px-2 py-0.5 font-semibold"
                    style={{
                      backgroundColor: inStock ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'var(--color-muted)',
                      color: inStock ? 'var(--color-primary)' : 'var(--color-muted-foreground)',
                    }}
                    data-testid="product-card-availability"
                  >
                    {inStock ? t('product.inStock') : t('product.outOfStock')}
                  </span>
                  {scanFacts.length > 0 && (
                    <span className="min-w-0 truncate" data-testid="product-card-facts">
                      {scanFacts.join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-3 sm:grid sm:grid-cols-[92px,minmax(0,1fr)] sm:items-start sm:gap-2">
              <div className={`group/quantity transition-[opacity,transform] duration-fast ${cartActionClass}`} data-testid="product-card-quantity" data-in-cart={isInCart ? 'true' : 'false'}>
                <div
                  className="grid h-11 grid-cols-3 overflow-hidden rounded-full border"
                  style={{
                    borderColor: isInCart ? 'var(--color-primary)' : 'var(--color-border)',
                    backgroundColor: isInCart ? 'var(--color-accent)' : 'var(--color-card)',
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => updateQuantity(e, -1)}
                    disabled={!inStock || busy || (!isInCart && quantity <= 1)}
                    className="flex items-center justify-center transition-all duration-fast hover-surface disabled:opacity-40"
                    aria-label={t('product.decreaseQuantity', { name: product.name })}
                  >
                    <Minus className="w-4 h-4 opacity-80 transition-opacity duration-fast group-hover/quantity:opacity-100" aria-hidden="true" />
                  </button>
                  <span
                    className="flex items-center justify-center text-sm font-semibold tabular-nums"
                    style={{ color: 'var(--color-foreground)' }}
                    aria-live="polite"
                    data-testid="product-card-quantity-value"
                  >
                    {displayedQuantity}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => updateQuantity(e, 1)}
                    disabled={!inStock || busy || displayedQuantity >= maxQuantity}
                    className="flex items-center justify-center transition-all duration-fast hover-surface disabled:opacity-40"
                    aria-label={t('product.increaseQuantity', { name: product.name })}
                  >
                    <Plus className="w-4 h-4 opacity-80 transition-opacity duration-fast group-hover/quantity:opacity-100" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={!inStock || busy || (isInCart && cartQuantity >= maxQuantity)}
                className={`hidden h-11 w-full items-center justify-center gap-2 rounded-full px-3 font-semibold transition-[opacity,transform,box-shadow] duration-fast disabled:opacity-40 active:scale-[0.98] sm:flex checkout-btn ${cartActionClass}`}
                style={{
                  backgroundColor: justAdded ? 'var(--color-fresh)' : inStock ? 'var(--color-primary)' : 'var(--color-muted)',
                  color: inStock ? 'white' : 'var(--color-muted-foreground)',
                }}
                aria-label={inStock ? t('product.addToCartWithQuantity', { quantity: displayedQuantity }) : t('product.outOfStock')}
              >
                {justAdded ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <ShoppingCart className="w-4 h-4" aria-hidden="true" />
                )}
                <span className="text-sm">{addToCartLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </Link>

      <NutritionModal
        open={nutritionOpen}
        onOpenChange={setNutritionOpen}
        productName={product.name}
        nutritionFacts={product.nutritionFacts}
        ingredients={product.ingredients}
        allergens={product.allergens}
        dietaryTags={product.dietaryTags}
        certifications={product.certifications}
        countryOfOrigin={product.countryOfOrigin}
      />
    </>
  );
}
