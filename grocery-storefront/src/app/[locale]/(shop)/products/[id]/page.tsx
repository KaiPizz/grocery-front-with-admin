'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from 'urql';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Info, Package, Check, Minus, Plus, Truck, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { PRODUCT_BY_SLUG_QUERY, PRODUCT_RECIPES_QUERY } from '@/lib/graphql/operations/grocery';
import { FreshnessBadge } from '@/components/grocery/FreshnessBadge';
import { NutritionModal } from '@/components/grocery/NutritionModal';
import { RecipeCard } from '@/components/grocery/RecipeCard';
import { Breadcrumb } from '@/components/grocery/Breadcrumb';
import { UnitPrice } from '@/components/grocery/UnitPrice';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { formatPrice, getImageSrc, isImageProxySrc } from '@/lib/utils';
import { useChannel } from '@/hooks/use-channel';

function DetailSkeleton() {
  return (
    <div className="container-grocery py-8">
      <div className="h-4 skeleton rounded w-20 mb-6" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-square skeleton rounded-xl" />
        <div className="space-y-4">
          <div className="h-6 skeleton rounded w-2/3" />
          <div className="h-4 skeleton rounded w-1/3" />
          <div className="h-8 skeleton rounded w-24 mt-4" />
          <div className="h-12 skeleton rounded-lg w-full mt-8" />
        </div>
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const t = useTranslations();
  const addItem = useCartStore((s) => s.addItem);
  const wishlistItems = useWishlistStore((state) => state.items);
  const addWishlistItem = useWishlistStore((state) => state.addItem);
  const removeWishlistItem = useWishlistStore((state) => state.removeItem);
  const [nutritionOpen, setNutritionOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [showStickyAdd, setShowStickyAdd] = useState(false);
  const [shipPromise, setShipPromise] = useState<'today' | 'tomorrow'>('tomorrow');
  const [inlineActionsNode, setInlineActionsNode] = useState<HTMLDivElement | null>(null);
  const channel = useChannel();

  // Resolve same-day-shipping cutoff on client only to avoid SSR/CSR
  // hydration mismatch on Date(). Cutoff hour hardcoded to 12 for now;
  // backlog item B21 lifts this into StorefrontConfig.general.
  useEffect(() => {
    setShipPromise(new Date().getHours() < 12 ? 'today' : 'tomorrow');
  }, []);

  // Show the mobile sticky add-to-cart bar exactly when the inline CTA row
  // has scrolled out of view. rootMargin compensates for the sticky header.
  // Using a state-backed ref ensures the observer re-attaches when the inline
  // actions div mounts — guarding against the DetailSkeleton → full-UI swap
  // not triggering a useEffect keyed on a stable param like `slug`.
  useEffect(() => {
    if (!inlineActionsNode) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyAdd(!entry.isIntersecting),
      { rootMargin: '-80px 0px 0px 0px' },
    );
    observer.observe(inlineActionsNode);
    return () => observer.disconnect();
  }, [inlineActionsNode]);

  const [productResult] = useQuery({
    query: PRODUCT_BY_SLUG_QUERY,
    variables: { channel, slug },
  });

  const product = productResult.data?.product;

  const [recipesResult] = useQuery({
    query: PRODUCT_RECIPES_QUERY,
    variables: { channel, productId: product?.id || '', first: 4 },
    pause: !product?.id,
  });

  const recipes = recipesResult.data?.productRecipes?.edges?.map((e: any) => e.node) || [];

  if (productResult.fetching) {
    return <DetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="container-grocery py-16 text-center">
        <Package className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
        <p className="text-sm mb-2" style={{ color: 'var(--color-muted-foreground)' }}>Product not found</p>
        <Link href="/products" className="text-sm font-medium inline-block transition-opacity hover:opacity-80" style={{ color: 'var(--color-primary)' }}>
          Back to products
        </Link>
      </div>
    );
  }

  const variant = product.variants?.[0];
  const price = variant?.pricing?.price?.gross?.amount ?? 0;
  const currency = variant?.pricing?.price?.gross?.currency ?? 'PLN';
  const inStock = (variant?.quantityAvailable ?? 0) > 0;
  const imageUrl = getImageSrc(product?.thumbnail?.url);
  const isWishlisted = wishlistItems.some((item) => item.productId === product.id);

  function handleAddToCart() {
    if (!variant || !inStock) return;
    void (async () => {
      const success = await addItem({
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        thumbnail: product.thumbnail?.url,
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
    })();
  }

  function handleWishlistToggle() {
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
    <div className="container-grocery py-8 pb-28 md:py-12">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: t('nav.home'), href: '/' },
        { label: t('nav.products'), href: '/products' },
        ...(product.category ? [{ label: product.category.name, href: `/products?zone=` }] : []),
        { label: product.name },
      ]} />

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        {/* Image */}
        <div className="relative aspect-square rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--color-muted)' }}>
          {imageUrl ? (
            <Image src={imageUrl} alt={product.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" priority unoptimized={isImageProxySrc(imageUrl)} />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="w-16 h-16 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
            </div>
          )}

          {/* Freshness badge overlay */}
          {product.freshness && (
            <div className="absolute top-4 left-4">
              <FreshnessBadge freshness={product.freshness} nearestExpiry={product.nearestExpiry} />
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          {product.category && (
            <p className="text-sm mb-2" style={{ color: 'var(--color-muted-foreground)' }}>
              {product.category.name}
            </p>
          )}

          <h1
            className="heading-display text-2xl md:text-3xl mb-4"
            style={{ color: 'var(--color-foreground)' }}
          >
            {product.name}
          </h1>

          {/* Price */}
          <div className="mb-4">
            <span className="text-3xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--color-foreground)' }}>
              {formatPrice(price, currency)}
            </span>
            <UnitPrice
              pricePerUnit={product.pricePerUnit}
              unitOfMeasure={product.unitOfMeasure}
              currency={currency}
              className="block text-sm mt-1"
            />
          </div>

          {/* Stock + delivery promise */}
          {inStock && variant && (
            <div className="mb-5 flex items-center gap-2 text-sm" data-testid="pd-stock-promise">
              <Truck className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <span style={{ color: 'var(--color-foreground)' }}>
                {(() => {
                  const qty = variant.quantityAvailable ?? 0;
                  const lowStock = qty <= 10;
                  const stockText = lowStock
                    ? (t('product.lowStockCount', { count: qty }) || `Only ${qty} left`)
                    : (t('product.inStock') || 'In stock');
                  const shipText = shipPromise === 'today'
                    ? (t('product.shipsToday') || 'ships today')
                    : (t('product.shipsTomorrow') || 'ships tomorrow');
                  return `${stockText} — ${shipText}`;
                })()}
              </span>
            </div>
          )}

          {/* Allergen chips */}
          {product.allergens?.length > 0 && (
            <div className="mb-4" role="list" aria-label={t('product.allergens')}>
              <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-allergen)' }}>
                {t('product.allergens')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.allergens.map((a: string) => (
                  <span key={a} className="allergen-chip" role="listitem">{t(`allergens.${a}` as any)}</span>
                ))}
              </div>
            </div>
          )}

          {/* Dietary tags */}
          {product.dietaryTags?.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold mb-1.5" style={{ color: 'var(--color-foreground)' }}>
                {t('product.dietary')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {product.dietaryTags.map((tag: string) => (
                  <span key={tag} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nutrition button */}
          {product.nutritionFacts && (
            <button
              type="button"
              onClick={() => setNutritionOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium mb-6 transition-colors duration-fast hover-surface"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-foreground)' }}
              aria-label={`${t('product.nutrition')} — ${product.name}`}
            >
              <Info className="w-4 h-4" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              {t('product.nutrition')}
              {product.nutritionFacts.calories && (
                <span className="text-xs tabular-nums" style={{ color: 'var(--color-muted-foreground)' }}>
                  {product.nutritionFacts.calories} kcal
                </span>
              )}
            </button>
          )}

          {/* Add to cart */}
          <div ref={setInlineActionsNode} className="flex items-center gap-2 sm:gap-3" data-testid="product-detail-actions">
            <div className="flex items-center border rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 flex items-center justify-center text-lg font-medium transition-colors duration-fast hover-surface"
                style={{ color: 'var(--color-foreground)' }}
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="px-3 py-2 text-sm font-medium tabular-nums min-w-[40px] text-center" style={{ color: 'var(--color-foreground)' }} aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-11 h-11 flex items-center justify-center text-lg font-medium transition-colors duration-fast hover-surface"
                style={{ color: 'var(--color-foreground)' }}
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              onClick={handleWishlistToggle}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all duration-fast hover:scale-[1.02] active:scale-[0.98] sm:h-10 sm:w-10"
              style={{
                borderColor: isWishlisted ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: 'var(--color-card)',
                color: isWishlisted ? 'var(--color-primary)' : 'var(--color-foreground)',
              }}
              aria-label={isWishlisted ? t('wishlist.remove') : t('wishlist.add')}
              data-testid="product-detail-wishlist"
            >
              <Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isWishlisted ? 'fill-current' : ''}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock}
              className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white transition-all duration-fast disabled:opacity-50 active:scale-[0.98] hover:brightness-90 hover:shadow-md sm:h-10 sm:gap-2 sm:px-4 sm:text-base"
              style={{
                backgroundColor: justAdded ? 'var(--color-fresh)' : 'var(--color-primary)',
              }}
              data-testid="product-detail-add"
              aria-label={inStock ? `${t('common.addToCart')} — ${product.name}` : t('product.outOfStock')}
            >
              {justAdded ? (
                <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              )}
              {inStock ? t('common.addToCart') : t('product.outOfStock')}
            </button>
          </div>

          {/* Description */}
          {product.description && (
            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                {product.description}
              </p>
            </div>
          )}

          {/* Ingredients */}
          {product.ingredients && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--color-foreground)' }}>
                {t('product.ingredients')}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                {product.ingredients}
              </p>
            </div>
          )}

          {/* Country of origin */}
          {product.countryOfOrigin && (
            <div className="mt-4">
              <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('product.origin')}: {product.countryOfOrigin}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Related recipes */}
      {recipes.length > 0 && (
        <section className="mt-16 pt-8 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <h2
            className="heading-section text-xl md:text-2xl mb-6"
            style={{ color: 'var(--color-foreground)' }}
          >
            {t('product.relatedRecipes')}
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {recipes.map((recipe: any) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile sticky add-to-cart bar — appears when inline CTA scrolls out of view.
          Sits above the MobileBottomNav (3.5rem + safe-area). */}
      {inStock && (
        <div
          className={`fixed inset-x-0 z-40 border-t backdrop-blur transition-all duration-normal ease-out md:hidden ${
            showStickyAdd ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
          }`}
          style={{
            bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
            borderColor: 'var(--color-border)',
            backgroundColor: 'color-mix(in srgb, var(--color-card) 96%, transparent)',
          }}
          aria-hidden={!showStickyAdd}
          data-testid="mobile-pd-sticky-bar"
        >
          <div className="container-grocery flex items-center gap-2 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                {formatPrice(price * quantity, currency)}
              </p>
              <UnitPrice
                pricePerUnit={product.pricePerUnit}
                unitOfMeasure={product.unitOfMeasure}
                currency={currency}
                className="block truncate text-[10px] tabular-nums"
              />
            </div>

            <div className="flex items-center rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-11 w-11 items-center justify-center transition-colors duration-fast hover-surface"
                style={{ color: 'var(--color-foreground)' }}
                aria-label="Decrease quantity"
                tabIndex={showStickyAdd ? 0 : -1}
              >
                <Minus className="h-4 w-4" aria-hidden="true" />
              </button>
              <span
                className="min-w-[24px] px-1 text-center text-sm font-medium tabular-nums"
                style={{ color: 'var(--color-foreground)' }}
              >
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-11 w-11 items-center justify-center transition-colors duration-fast hover-surface"
                style={{ color: 'var(--color-foreground)' }}
                aria-label="Increase quantity"
                tabIndex={showStickyAdd ? 0 : -1}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock}
              className="checkout-btn inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor: justAdded ? 'var(--color-fresh)' : 'var(--color-primary)',
              }}
              aria-label={t('common.addToCart')}
              tabIndex={showStickyAdd ? 0 : -1}
              data-testid="mobile-pd-sticky-add"
            >
              {justAdded ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4" aria-hidden="true" />}
              <span>{t('common.addToCart')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Nutrition modal */}
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
    </div>
  );
}
