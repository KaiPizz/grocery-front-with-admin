'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from 'urql';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Package, Check, Minus, Plus, Truck, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { PRODUCT_BY_SLUG_QUERY, PRODUCT_RECIPES_QUERY, PRODUCTS_QUERY } from '@/lib/graphql/operations/grocery';
import { FreshnessBadge } from '@/components/grocery/FreshnessBadge';
import { RecipeCard } from '@/components/grocery/RecipeCard';
import { Breadcrumb } from '@/components/grocery/Breadcrumb';
import { UnitPrice } from '@/components/grocery/UnitPrice';
import { ProductCard } from '@/components/product/ProductCard';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import { formatPrice, getImageSrc, isImageProxySrc } from '@/lib/utils';
import {
  getConfiguredText,
  getFulfillmentConfig,
  isPickupFulfillment,
  usesAvailabilityOnlyStock,
  usesBankTransferPromise,
} from '@/lib/fulfillment';
import { DEFAULT_SAME_DAY_SHIPPING_CUTOFF, isBeforeShippingCutoff } from '@/lib/shipping-cutoff';
import { useChannel } from '@/hooks/use-channel';
import type { Freshness, GroceryProduct, NutritionFacts, StorageZone } from '@/types';

interface ProductGalleryMedia {
  url?: string | null;
  alt?: string | null;
  type?: string | null;
  sortOrder?: number | null;
}

interface ProductGalleryThumbnail {
  url?: string | null;
  alt?: string | null;
}

interface ProductGallerySource {
  name: string;
  media?: ProductGalleryMedia[] | null;
  thumbnail?: ProductGalleryThumbnail | null;
  freshness?: Freshness | null;
  nearestExpiry?: string | null;
}

interface ProductGalleryImage {
  key: string;
  src: string;
  alt: string;
}

interface ProductGalleryProps {
  product: ProductGallerySource;
}

interface PurchaseFact {
  label: string;
  value: string;
}

interface ProductInformationSource {
  description?: string | null;
  ingredients?: string | null;
  allergens?: string[] | null;
  dietaryTags?: string[] | null;
  nutritionFacts?: NutritionFacts | null;
  countryOfOrigin?: string | null;
  storageZone?: StorageZone | null;
  certifications?: string[] | null;
}

interface ProductInformationSectionsProps {
  product: ProductInformationSource;
  sku: string | null;
}

interface RelatedProductsSectionProps {
  products: GroceryProduct[];
  categoryName: string | null;
}

interface NutritionRow {
  label: string;
  value: string;
}

interface DetailFact {
  label: string;
  value: string;
}

function appendGalleryImage(
  images: ProductGalleryImage[],
  seenSources: Set<string>,
  url: string | null | undefined,
  alt: string | null | undefined,
  productName: string,
) {
  const src = getImageSrc(url);
  if (!src || seenSources.has(src)) return;

  seenSources.add(src);
  images.push({
    key: src,
    src,
    alt: alt?.trim() || productName,
  });
}

function normalizeProductGalleryImages(product: ProductGallerySource): ProductGalleryImage[] {
  const images: ProductGalleryImage[] = [];
  const seenSources = new Set<string>();
  const orderedMedia = (product.media ?? [])
    .map((media, index) => ({ media, index }))
    .sort((a, b) => {
      const aOrder = typeof a.media.sortOrder === 'number' ? a.media.sortOrder : null;
      const bOrder = typeof b.media.sortOrder === 'number' ? b.media.sortOrder : null;

      if (aOrder !== null && bOrder !== null && aOrder !== bOrder) return aOrder - bOrder;
      if (aOrder !== null && bOrder === null) return -1;
      if (aOrder === null && bOrder !== null) return 1;
      return a.index - b.index;
    });

  for (const { media } of orderedMedia) {
    const mediaType = media.type?.toUpperCase();
    if (mediaType && mediaType !== 'IMAGE') continue;
    appendGalleryImage(images, seenSources, media.url, media.alt, product.name);
  }

  appendGalleryImage(images, seenSources, product.thumbnail?.url, product.thumbnail?.alt, product.name);

  return images;
}

function ProductGallery({ product }: ProductGalleryProps) {
  const images = normalizeProductGalleryImages(product);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const thumbnailRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeIndex = selectedIndex < images.length ? selectedIndex : 0;
  const activeImage = images[activeIndex] ?? null;

  useEffect(() => {
    setSelectedIndex(0);
  }, [product.name]);

  function handleGalleryImageSelect(index: number) {
    setSelectedIndex(index);
    thumbnailRefs.current[index]?.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  return (
    <section className="space-y-3 md:sticky md:top-24" aria-label={`${product.name} images`} data-testid="product-gallery">
      <div
        className="relative aspect-square overflow-hidden rounded-xl"
        style={{ backgroundColor: 'var(--color-muted)' }}
        data-testid="product-gallery-main"
      >
        {activeImage ? (
          <Image
            src={activeImage.src}
            alt={activeImage.alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            unoptimized={isImageProxySrc(activeImage.src)}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center"
            aria-label="No product image available"
            data-testid="product-gallery-placeholder"
          >
            <Package className="h-16 w-16 opacity-20" style={{ color: 'var(--color-muted-foreground)' }} aria-hidden="true" />
          </div>
        )}

        {product.freshness && (
          <div className="absolute left-4 top-4">
            <FreshnessBadge freshness={product.freshness} nearestExpiry={product.nearestExpiry ?? undefined} />
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex snap-x gap-2 overflow-x-auto pb-1" role="list" aria-label="Product image thumbnails">
          {images.map((image, index) => {
            const selected = index === activeIndex;

            return (
              <button
                key={image.key}
                type="button"
                ref={(node) => {
                  thumbnailRefs.current[index] = node;
                }}
                onClick={() => handleGalleryImageSelect(index)}
                className="relative h-16 w-16 shrink-0 snap-start overflow-hidden rounded-lg border-2 transition-transform duration-fast hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 sm:h-20 sm:w-20"
                style={{
                  borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-card)',
                  outlineColor: 'var(--color-ring)',
                }}
                aria-label={`View ${image.alt}`}
                aria-pressed={selected}
                data-testid="product-gallery-thumbnail"
              >
                <Image
                  src={image.src}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                  unoptimized={isImageProxySrc(image.src)}
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function formatNutritionAmount(value: number | null | undefined, unit: string): string | null {
  if (value == null) return null;
  return `${value} ${unit}`;
}

function ProductInformationSections({ product, sku }: ProductInformationSectionsProps) {
  const t = useTranslations();
  const nutrition = product.nutritionFacts ?? null;
  const allergens = Array.isArray(product.allergens) ? product.allergens : [];
  const dietaryTags = Array.isArray(product.dietaryTags) ? product.dietaryTags : [];
  const certifications = Array.isArray(product.certifications) ? product.certifications : [];
  const nutritionRows: NutritionRow[] = [];
  const detailFacts: DetailFact[] = [];

  const calories = formatNutritionAmount(nutrition?.calories, 'kcal');
  if (calories) nutritionRows.push({ label: t('product.calories'), value: calories });

  const fat = formatNutritionAmount(nutrition?.fat, 'g');
  if (fat) nutritionRows.push({ label: t('product.fat'), value: fat });

  const saturatedFat = formatNutritionAmount(nutrition?.saturatedFat, 'g');
  if (saturatedFat) nutritionRows.push({ label: t('product.saturatedFat'), value: saturatedFat });

  const carbs = formatNutritionAmount(nutrition?.carbs, 'g');
  if (carbs) nutritionRows.push({ label: t('product.carbs'), value: carbs });

  const sugar = formatNutritionAmount(nutrition?.sugar, 'g');
  if (sugar) nutritionRows.push({ label: t('product.sugar'), value: sugar });

  const fiber = formatNutritionAmount(nutrition?.fiber, 'g');
  if (fiber) nutritionRows.push({ label: t('product.fiber'), value: fiber });

  const protein = formatNutritionAmount(nutrition?.protein, 'g');
  if (protein) nutritionRows.push({ label: t('product.protein'), value: protein });

  const salt = formatNutritionAmount(nutrition?.salt, 'g');
  if (salt) nutritionRows.push({ label: t('product.salt'), value: salt });

  if (nutrition?.servingSize) {
    nutritionRows.push({ label: t('product.servingSize'), value: nutrition.servingSize });
  }

  if (product.countryOfOrigin) {
    detailFacts.push({ label: t('product.origin'), value: product.countryOfOrigin });
  }

  if (product.storageZone) {
    detailFacts.push({ label: t('product.storage'), value: t(`cart.zoneNote.${product.storageZone}` as any) });
  }

  if (dietaryTags.length > 0) {
    detailFacts.push({ label: t('product.dietary'), value: dietaryTags.join(', ') });
  }

  if (certifications.length > 0) {
    detailFacts.push({ label: t('product.certifications'), value: certifications.join(', ') });
  }

  if (sku) {
    detailFacts.push({ label: t('product.sku'), value: sku });
  }

  const hasMainSections = Boolean(product.description || product.ingredients || allergens.length > 0 || nutritionRows.length > 0);
  if (!hasMainSections && detailFacts.length === 0) return null;

  return (
    <section className="mt-12 border-t pt-8" style={{ borderColor: 'var(--color-border)' }} data-testid="pdp-food-label-sections">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <div className="space-y-8">
          {product.description && (
            <section>
              <h2 className="heading-section mb-3 text-xl" style={{ color: 'var(--color-foreground)' }}>
                {t('product.description')}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                {product.description}
              </p>
            </section>
          )}

          {product.ingredients && (
            <section>
              <h2 className="heading-section mb-3 text-xl" style={{ color: 'var(--color-foreground)' }}>
                {t('product.ingredients')}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                {product.ingredients}
              </p>
            </section>
          )}

          {allergens.length > 0 && (
            <section>
              <h2 className="heading-section mb-3 text-xl" style={{ color: 'var(--color-foreground)' }}>
                {t('product.allergens')}
              </h2>
              <div className="flex flex-wrap gap-1.5" role="list" aria-label={t('product.allergens')}>
                {allergens.map((allergen) => (
                  <span key={allergen} className="allergen-chip" role="listitem">{t(`allergens.${allergen}` as any)}</span>
                ))}
              </div>
            </section>
          )}

          {nutritionRows.length > 0 && (
            <section>
              <h2 className="heading-section mb-3 text-xl" style={{ color: 'var(--color-foreground)' }}>
                {t('product.nutrition')}
              </h2>
              <div className="overflow-hidden rounded-lg border" style={{ borderColor: 'var(--color-border)' }}>
                <table className="w-full text-sm" aria-label={t('product.nutrition')}>
                  <tbody>
                    {nutritionRows.map((row) => (
                      <tr key={row.label} className="border-b last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                        <th className="px-3 py-2 text-left font-medium" scope="row" style={{ color: 'var(--color-muted-foreground)' }}>
                          {row.label}
                        </th>
                        <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: 'var(--color-foreground)' }}>
                          {row.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {detailFacts.length > 0 && (
          <aside className="space-y-3">
            {detailFacts.map((fact) => (
              <div key={fact.label} className="border-b pb-3 last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--color-muted-foreground)' }}>
                  {fact.label}
                </p>
                <p className="mt-1 text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
                  {fact.value}
                </p>
              </div>
            ))}
          </aside>
        )}
      </div>
    </section>
  );
}

function RelatedProductsSection({ products, categoryName }: RelatedProductsSectionProps) {
  const t = useTranslations();

  if (!categoryName || products.length === 0) return null;

  return (
    <section
      className="mt-12 border-t pt-8 md:mt-16"
      style={{ borderColor: 'var(--color-border)' }}
      data-testid="pdp-related-products"
    >
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--color-muted-foreground)' }}>
          {t('product.relatedProducts')}
        </p>
        <h2 className="heading-section mt-1 text-xl md:text-2xl" style={{ color: 'var(--color-foreground)' }}>
          {t('product.relatedProductsFromCategory', { category: categoryName })}
        </h2>
      </div>

      <div className="grid auto-cols-[minmax(10rem,42vw)] grid-flow-col gap-3 overflow-x-auto pb-2 sm:auto-cols-[minmax(12rem,16rem)] md:grid-flow-row md:auto-cols-auto md:grid-cols-3 md:overflow-visible md:pb-0 lg:grid-cols-4">
        {products.map((relatedProduct, index) => (
          <ProductCard
            key={relatedProduct.id}
            product={relatedProduct}
            imagePriority={index < 2}
          />
        ))}
      </div>
    </section>
  );
}

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
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const [showStickyAdd, setShowStickyAdd] = useState(false);
  const [shipPromise, setShipPromise] = useState<'today' | 'tomorrow'>('tomorrow');
  const [inlineActionsNode, setInlineActionsNode] = useState<HTMLDivElement | null>(null);
  const channel = useChannel();
  const siteConfig = useStorefrontConfig();
  const fulfillment = getFulfillmentConfig(siteConfig);
  const pickupMode = isPickupFulfillment(siteConfig);
  const bankTransferMode = usesBankTransferPromise(siteConfig);
  const availabilityOnlyStock = usesAvailabilityOnlyStock(siteConfig);
  const cutoffStr = siteConfig?.general?.sameDayShippingCutoff ?? DEFAULT_SAME_DAY_SHIPPING_CUTOFF;
  const lowStockThreshold = siteConfig?.general?.lowStockThreshold ?? 10;
  const pickupNotice = getConfiguredText(fulfillment.pickupInstructions, t('fulfillment.productPickupNotice'));
  const bankTransferNotice = getConfiguredText(fulfillment.bankTransferInstructions, t('fulfillment.productBankTransferNotice'));

  // Resolve same-day-shipping cutoff on client only to avoid SSR/CSR
  // hydration mismatch on Date(). Cutoff comes from admin config (HH:MM).
  useEffect(() => {
    setShipPromise(isBeforeShippingCutoff(new Date(), cutoffStr) ? 'today' : 'tomorrow');
  }, [cutoffStr]);

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

  const [relatedProductsResult] = useQuery({
    query: PRODUCTS_QUERY,
    variables: {
      channel,
      first: 9,
      filter: { categories: product?.category?.id ? [product.category.id] : [] },
    },
    pause: !product?.category?.id,
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
  const variantPrice = variant?.pricing?.price?.gross;
  const productPrice = product.pricing?.priceRange?.start?.gross;
  const price = variantPrice?.amount ?? productPrice?.amount ?? 0;
  const currency = variantPrice?.currency ?? productPrice?.currency ?? 'PLN';
  const inStock = (variant?.quantityAvailable ?? 0) > 0;
  const imageUrl = getImageSrc(product?.thumbnail?.url);
  const isWishlisted = wishlistItems.some((item) => item.productId === product.id);
  const purchaseFacts: PurchaseFact[] = [];
  const sku = typeof variant?.sku === 'string' && variant.sku.trim() ? variant.sku.trim() : null;
  const relatedProducts = (relatedProductsResult.data?.products?.edges ?? [])
    .map((edge: any) => edge.node as GroceryProduct)
    .filter((relatedProduct: GroceryProduct) => relatedProduct.id !== product.id)
    .slice(0, 8);

  if (product.category?.name) {
    purchaseFacts.push({ label: t('product.category'), value: product.category.name });
  }

  if (product.countryOfOrigin) {
    purchaseFacts.push({ label: t('product.origin'), value: product.countryOfOrigin });
  }

  if (product.storageZone) {
    purchaseFacts.push({ label: t('product.storage'), value: t(`cart.zoneGroup.${product.storageZone}` as any) });
  }

  if (Array.isArray(product.dietaryTags) && product.dietaryTags.length > 0) {
    purchaseFacts.push({ label: t('product.dietary'), value: product.dietaryTags.join(', ') });
  }

  if (Array.isArray(product.allergens) && product.allergens.length > 0) {
    purchaseFacts.push({
      label: t('product.allergens'),
      value: t('product.allergenCount', { count: product.allergens.length }),
    });
  }

  if (sku) {
    purchaseFacts.push({ label: t('product.sku'), value: sku });
  }

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
        ...(product.category ? [{ label: product.category.name, href: `/categories/${product.category.slug}` }] : []),
        { label: product.name },
      ]} />

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <ProductGallery product={product} />

        {/* Details */}
        <div className="space-y-6">
          <section
            className="rounded-xl border p-4 sm:p-5"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-card-foreground)',
            }}
            data-testid="pdp-purchase-panel"
          >
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
          {variant && (
            <div className="mb-5 flex items-center gap-2 text-sm" data-testid="pd-stock-promise">
              <Truck className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <span style={{ color: 'var(--color-foreground)' }}>
                {(() => {
                  if (!inStock) return t('product.outOfStock') || 'Out of stock';
                  const qty = variant.quantityAvailable ?? 0;
                  const lowStock = qty <= lowStockThreshold;
                  const stockText = availabilityOnlyStock
                    ? (t('product.inStock') || 'In stock')
                    : lowStock
                    ? (t('product.lowStockCount', { count: qty }) || `Only ${qty} left`)
                    : (t('product.inStock') || 'In stock');
                  if (availabilityOnlyStock) return stockText;
                  const shipText = shipPromise === 'today'
                    ? (t('product.shipsToday') || 'ships today')
                    : (t('product.shipsTomorrow') || 'ships tomorrow');
                  return `${stockText} — ${shipText}`;
                })()}
              </span>
            </div>
          )}

          {(pickupMode || bankTransferMode) && (
            <div
              className="mb-5 rounded-lg border p-3 text-sm"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-card))',
                color: 'var(--color-foreground)',
              }}
            >
              {pickupMode && <p>{pickupNotice}</p>}
              {bankTransferMode && <p className={pickupMode ? 'mt-1' : undefined}>{bankTransferNotice}</p>}
              <p className="mt-2 border-t pt-2 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                {t('fulfillment.manualFulfillmentNotice')}
              </p>
            </div>
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

          {purchaseFacts.length > 0 && (
            <dl className="mt-5 grid grid-cols-2 gap-2" data-testid="pdp-purchase-facts">
              {purchaseFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-lg border p-2"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'color-mix(in srgb, var(--color-foreground) 3%, var(--color-card))',
                  }}
                >
                  <dt className="text-[10px] font-semibold uppercase" style={{ color: 'var(--color-muted-foreground)' }}>
                    {fact.label}
                  </dt>
                  <dd className="mt-1 text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          </section>

        </div>
      </div>

      <ProductInformationSections product={product} sku={sku} />

      <RelatedProductsSection
        products={relatedProducts}
        categoryName={product.category?.name ?? null}
      />

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

    </div>
  );
}
