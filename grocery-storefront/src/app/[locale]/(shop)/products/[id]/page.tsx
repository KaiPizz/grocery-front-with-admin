'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from 'urql';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ShoppingCart, Package, Check, Minus, Plus, Truck, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { PRODUCT_BY_SLUG_QUERY, PRODUCT_LISTING_QUERY, PRODUCT_RECIPES_QUERY } from '@/lib/graphql/operations/grocery';
import { FreshnessBadge } from '@/components/grocery/FreshnessBadge';
import { RecipeCard } from '@/components/grocery/RecipeCard';
import { Breadcrumb } from '@/components/grocery/Breadcrumb';
import { UnitPrice } from '@/components/grocery/UnitPrice';
import { ProductCard } from '@/components/product/ProductCard';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import { getLocalizedProductDescription, getLocalizedProductName } from '@/lib/localization';
import { buildPublicCategories } from '@/lib/public-taxonomy';
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
  mayContainAllergens?: string[] | null;
  dietaryTags?: string[] | null;
  nutritionFacts?: NutritionFacts | null;
  countryOfOrigin?: string | null;
  pricePerUnit?: number | null;
  unitOfMeasure?: string | null;
  storageZone?: StorageZone | null;
  certifications?: string[] | null;
  nearestExpiry?: string | null;
  spiceLevel?: number | null;
  isAlcohol?: boolean | null;
}

interface ProductInformationSectionsProps {
  product: ProductInformationSource;
  sku: string | null;
  currency: string;
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
  isMissing?: boolean;
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
  const t = useTranslations('product');
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

  function handleGalleryImageStep(delta: number) {
    if (images.length < 2) return;

    const nextIndex = (activeIndex + delta + images.length) % images.length;
    handleGalleryImageSelect(nextIndex);
  }

  return (
    <section
      className="min-w-0 space-y-2.5 md:sticky md:top-24 md:space-y-3"
      aria-label={t('galleryLabel', { name: product.name })}
      data-testid="product-gallery"
    >
      <div
        className="relative aspect-[4/3] max-h-[58vh] overflow-hidden rounded-2xl sm:aspect-square md:rounded-xl"
        style={{ backgroundColor: 'var(--color-muted)' }}
        data-testid="product-gallery-main"
      >
        {activeImage ? (
          <Image
            src={activeImage.src}
            alt={activeImage.alt}
            fill
            className="object-contain p-3 sm:p-6"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
            unoptimized={isImageProxySrc(activeImage.src)}
          />
        ) : (
          <div
            className="flex h-full items-center justify-center"
            aria-label={t('noImageAvailable')}
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

        {images.length > 1 && (
          <>
            <span
              className="absolute right-4 top-4 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-card) 88%, transparent)',
                color: 'var(--color-foreground)',
              }}
              aria-live="polite"
              data-testid="product-gallery-counter"
            >
              {activeIndex + 1}/{images.length}
            </span>
            <button
              type="button"
              onClick={() => handleGalleryImageStep(-1)}
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border transition-transform duration-fast active:scale-[0.98] sm:left-3 sm:h-11 sm:w-11"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-card) 88%, transparent)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-foreground)',
              }}
              aria-label={t('previousImage')}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => handleGalleryImageStep(1)}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border transition-transform duration-fast active:scale-[0.98] sm:right-3 sm:h-11 sm:w-11"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-card) 88%, transparent)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-foreground)',
              }}
              aria-label={t('nextImage')}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="flex snap-x gap-2 overflow-x-auto pb-1" role="list" aria-label={t('thumbnailList')}>
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
                className="relative h-14 w-14 shrink-0 snap-start overflow-hidden rounded-lg border-2 transition-transform duration-fast hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 sm:h-20 sm:w-20"
                style={{
                  borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
                  backgroundColor: 'var(--color-card)',
                  outlineColor: 'var(--color-ring)',
                }}
                aria-label={t('viewImage', { current: index + 1, total: images.length, alt: image.alt })}
                aria-pressed={selected}
                data-testid="product-gallery-thumbnail"
              >
                <Image
                  src={image.src}
                  alt=""
                  fill
                  className="object-contain p-1.5"
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

function formatDisplayUnit(unit: string): string {
  const labels: Record<string, string> = {
    KG: 'kg',
    GRAM: 'g',
    G: 'g',
    LITER: 'l',
    L: 'l',
    ML: 'ml',
    PIECE: 'szt.',
    PCS: 'szt.',
  };
  const key = unit.trim().toUpperCase();
  return labels[key] ?? unit.toLowerCase();
}

function formatProductDate(value: string | null | undefined, locale: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function ProductInformationSections({ product, sku, currency }: ProductInformationSectionsProps) {
  const t = useTranslations();
  const locale = useLocale();
  const nutrition = product.nutritionFacts ?? null;
  const allergens = Array.isArray(product.allergens) ? product.allergens : [];
  const mayContainAllergens = Array.isArray(product.mayContainAllergens) ? product.mayContainAllergens : [];
  const dietaryTags = Array.isArray(product.dietaryTags) ? product.dietaryTags : [];
  const localizedDietaryTags = dietaryTags.map((tag) => (
    t.has(`products.${tag}` as any) ? t(`products.${tag}` as any) : tag
  ));
  const certifications = Array.isArray(product.certifications) ? product.certifications : [];
  const nutritionRows: NutritionRow[] = [];
  const detailFacts: DetailFact[] = [];
  const hasIngredients = Boolean(product.ingredients?.trim());
  const hasNutrition = Object.values(nutrition ?? {}).some((value) => value != null && value !== '');
  const unitPrice = product.pricePerUnit ?? null;
  const unitOfMeasure = product.unitOfMeasure?.trim() || null;
  const hasUnitPrice = unitPrice != null && Boolean(unitOfMeasure);
  const missingCatalogLabels: string[] = [];
  const attributeChips: string[] = [];

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

  detailFacts.push({ label: t('product.sku'), value: sku ?? t('product.catalogMissing'), isMissing: !sku });

  detailFacts.push({
    label: t('product.unitPrice'),
    value:
      hasUnitPrice
        ? `${formatPrice(unitPrice, currency)} / ${formatDisplayUnit(unitOfMeasure ?? '')}`
        : t('product.catalogMissing'),
    isMissing: !hasUnitPrice,
  });

  detailFacts.push({ label: t('product.netWeight'), value: t('product.checkPackageLabel') });
  detailFacts.push({ label: t('product.origin'), value: product.countryOfOrigin ?? t('product.catalogMissing'), isMissing: !product.countryOfOrigin });

  detailFacts.push({
    label: t('product.storage'),
    value: product.storageZone ? t(`cart.zoneNote.${product.storageZone}` as any) : t('product.catalogMissing'),
    isMissing: !product.storageZone,
  });

  detailFacts.push({
    label: t('product.bestBefore'),
    value: formatProductDate(product.nearestExpiry, locale) ?? t('product.bestBeforeOnPackage'),
  });

  if (localizedDietaryTags.length > 0) {
    detailFacts.push({ label: t('product.dietary'), value: localizedDietaryTags.join(', ') });
    attributeChips.push(...localizedDietaryTags);
  }

  if (product.spiceLevel != null) {
    detailFacts.push({ label: t('product.spiceLevel'), value: t('product.spiceLevelValue', { level: product.spiceLevel }) });
    attributeChips.push(t('product.spiceLevelValue', { level: product.spiceLevel }));
  }

  if (product.isAlcohol) {
    detailFacts.push({ label: t('product.warnings'), value: t('product.containsAlcohol') });
    attributeChips.push(t('product.containsAlcohol'));
  }

  if (certifications.length > 0) {
    detailFacts.push({ label: t('product.certifications'), value: certifications.join(', ') });
    attributeChips.push(...certifications);
  }

  if (!hasIngredients) missingCatalogLabels.push(t('product.ingredients'));
  if (allergens.length === 0 && mayContainAllergens.length === 0) missingCatalogLabels.push(t('product.allergens'));
  if (!hasNutrition) missingCatalogLabels.push(t('product.nutrition'));
  if (!product.countryOfOrigin) missingCatalogLabels.push(t('product.origin'));
  if (!hasUnitPrice) missingCatalogLabels.push(t('product.unitPrice'));

  return (
    <section className="mt-12 border-t pt-8" style={{ borderColor: 'var(--color-border)' }} data-testid="pdp-food-label-sections">
      <div
        className="mb-6 rounded-2xl border p-4 sm:p-5"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, var(--color-card))',
        }}
        data-testid="pdp-food-compliance-notice"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--color-muted-foreground)' }}>
              {t('product.legalFoodInfo')}
            </p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-foreground)' }}>
              {t('product.packageLabelNotice')}
            </p>
          </div>

          {attributeChips.length > 0 && (
            <div className="flex shrink-0 flex-wrap gap-1.5 sm:max-w-[40%]" role="list" aria-label={t('product.foodAttributes')}>
              {attributeChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: 'var(--color-card)', color: 'var(--color-foreground)' }}
                  role="listitem"
                >
                  {chip}
                </span>
              ))}
            </div>
          )}
        </div>

        {missingCatalogLabels.length > 0 && (
          <p
            className="mt-3 rounded-xl border px-3 py-2 text-xs leading-relaxed"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-warning, #f59e0b) 38%, var(--color-border))',
              backgroundColor: 'color-mix(in srgb, #f59e0b 9%, var(--color-card))',
              color: 'var(--color-foreground)',
            }}
            data-testid="pdp-missing-catalog-data"
          >
            {t('product.missingCatalogFields', { fields: missingCatalogLabels.join(', ') })}
          </p>
        )}
      </div>

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

          <details
            className="group rounded-lg border p-4"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
            open={hasIngredients}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <span className="heading-section text-xl" style={{ color: 'var(--color-foreground)' }}>
                {t('product.ingredients')}
              </span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-lg font-semibold leading-none transition-transform duration-fast group-open:rotate-45"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <p className="mt-4 text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
              {hasIngredients ? product.ingredients : t('product.ingredientsMissing')}
            </p>
          </details>

          <section>
            <h2 className="heading-section mb-3 text-xl" style={{ color: 'var(--color-foreground)' }}>
              {t('product.allergens')}
            </h2>
            {allergens.length > 0 || mayContainAllergens.length > 0 ? (
              <div className="space-y-3">
                {allergens.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('product.containsAllergens')}
                    </p>
                    <div className="flex flex-wrap gap-1.5" role="list" aria-label={t('product.containsAllergens')}>
                      {allergens.map((allergen) => (
                        <span key={allergen} className="allergen-chip" role="listitem">{t(`allergens.${allergen}` as any)}</span>
                      ))}
                    </div>
                  </div>
                )}

                {mayContainAllergens.length > 0 && (
                  <div
                    className="rounded-lg border p-3"
                    style={{
                      borderColor: 'color-mix(in srgb, var(--color-border) 80%, var(--color-primary))',
                      backgroundColor: 'color-mix(in srgb, var(--color-primary) 4%, var(--color-card))',
                    }}
                  >
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--color-muted-foreground)' }}>
                      {t('product.mayContainAllergens')}
                    </p>
                    <div className="flex flex-wrap gap-1.5" role="list" aria-label={t('product.mayContainAllergens')}>
                      {mayContainAllergens.map((allergen) => (
                        <span
                          key={allergen}
                          className="rounded-full border px-2.5 py-1 text-xs font-semibold"
                          style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
                          role="listitem"
                        >
                          {t(`allergens.${allergen}` as any)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="rounded-lg border p-4 text-sm leading-relaxed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                {t('product.allergensMissing')}
              </p>
            )}
          </section>

          <section>
            <div className="mb-3">
              <h2 className="heading-section text-xl" style={{ color: 'var(--color-foreground)' }}>
                {t('product.nutrition')}
              </h2>
              <p className="mt-1 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('product.nutritionPer100')}
              </p>
            </div>
            {nutritionRows.length > 0 ? (
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
            ) : (
              <p className="rounded-lg border p-4 text-sm leading-relaxed" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
                {t('product.nutritionMissing')}
              </p>
            )}
          </section>
        </div>

        <aside
          className="rounded-xl border p-4"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'color-mix(in srgb, var(--color-primary) 5%, var(--color-card))',
          }}
          data-testid="pdp-compliance-summary"
        >
          <h2 className="heading-section mb-4 text-lg" style={{ color: 'var(--color-foreground)' }}>
            {t('product.productInformation')}
          </h2>
          <div className="space-y-3">
            {detailFacts.map((fact) => (
              <div key={fact.label} className="border-b pb-3 last:border-b-0" style={{ borderColor: 'var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase" style={{ color: 'var(--color-muted-foreground)' }}>
                  {fact.label}
                </p>
                <p
                  className="mt-1 text-sm font-medium"
                  style={{ color: fact.isMissing ? 'var(--color-muted-foreground)' : 'var(--color-foreground)' }}
                >
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        </aside>
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
    <div className="container-grocery py-5 md:py-8">
      <div className="h-4 skeleton rounded w-20 mb-6" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-[4/3] skeleton rounded-2xl sm:aspect-square md:rounded-xl" />
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
  const locale = useLocale();
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

    const updateStickyAdd = () => {
      const actionsRect = inlineActionsNode.getBoundingClientRect();
      setShowStickyAdd(actionsRect.bottom <= 80);
    };
    const observer = new IntersectionObserver(updateStickyAdd, {
      rootMargin: '-80px 0px 0px 0px',
    });

    observer.observe(inlineActionsNode);
    window.addEventListener('scroll', updateStickyAdd, { passive: true });
    window.addEventListener('resize', updateStickyAdd);
    updateStickyAdd();

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', updateStickyAdd);
      window.removeEventListener('resize', updateStickyAdd);
    };
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
    query: PRODUCT_LISTING_QUERY,
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
        <p className="text-sm mb-2" style={{ color: 'var(--color-muted-foreground)' }}>{t('product.notFound')}</p>
        <Link href="/products" className="text-sm font-medium inline-block transition-opacity hover:opacity-80" style={{ color: 'var(--color-primary)' }}>
          {t('product.backToProducts')}
        </Link>
      </div>
    );
  }

  const variant = product.variants?.[0];
  const variantPrice = variant?.pricing?.price?.gross;
  const productPrice = product.pricing?.priceRange?.start?.gross;
  const price = variantPrice?.amount ?? productPrice?.amount ?? 0;
  const currency = variantPrice?.currency ?? productPrice?.currency ?? 'PLN';
  const productName = getLocalizedProductName(product, locale);
  const productDescription = getLocalizedProductDescription(product, locale);
  const displayProduct = {
    ...product,
    name: productName,
    description: productDescription,
  };
  const publicProductCategory = product.category
    ? buildPublicCategories([product.category], locale, { requireProductCount: false })[0] ?? null
    : null;
  const displayCategory = publicProductCategory ?? product.category ?? null;
  const inStock = (variant?.quantityAvailable ?? 0) > 0;
  const imageUrl = getImageSrc(product?.thumbnail?.url);
  const isWishlisted = wishlistItems.some((item) => item.productId === product.id);
  const purchaseFacts: PurchaseFact[] = [];
  const sku = typeof variant?.sku === 'string' && variant.sku.trim() ? variant.sku.trim() : null;
  const relatedProducts = (relatedProductsResult.data?.products?.edges ?? [])
    .map((edge: any) => edge.node as GroceryProduct)
    .filter((relatedProduct: GroceryProduct) => relatedProduct.id !== product.id)
    .slice(0, 8);

  if (displayCategory?.name) {
    purchaseFacts.push({ label: t('product.category'), value: displayCategory.name });
  }

  if (product.countryOfOrigin) {
    purchaseFacts.push({ label: t('product.origin'), value: product.countryOfOrigin });
  }

  if (product.storageZone) {
    purchaseFacts.push({ label: t('product.storage'), value: t(`cart.zoneGroup.${product.storageZone}` as any) });
  }

  if (Array.isArray(product.dietaryTags) && product.dietaryTags.length > 0) {
    const localizedDietaryTags = product.dietaryTags.map((tag: string) => (
      t.has(`products.${tag}` as any) ? t(`products.${tag}` as any) : tag
    ));
    purchaseFacts.push({ label: t('product.dietary'), value: localizedDietaryTags.join(', ') });
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
        name: productName,
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
        name: productName,
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
    <div className="container-grocery py-4 pb-44 md:py-12 md:pb-28">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: t('nav.home'), href: '/' },
        { label: t('nav.products'), href: '/products' },
        ...(displayCategory ? [{ label: displayCategory.name, href: `/categories/${displayCategory.slug}` }] : []),
        { label: productName },
      ]} />

      <div className="grid min-w-0 gap-5 md:grid-cols-2 md:gap-8 lg:gap-12">
        <ProductGallery product={displayProduct} />

        {/* Details */}
        <div className="min-w-0 space-y-5 md:space-y-6">
          <section
            className="rounded-2xl border p-4 sm:p-5 md:rounded-xl"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
              color: 'var(--color-card-foreground)',
            }}
            data-testid="pdp-purchase-panel"
          >
          {displayCategory && (
            <p className="mb-2 text-xs font-medium sm:text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              {displayCategory.name}
            </p>
          )}

          <h1
            className="heading-display mb-3 text-xl leading-tight sm:text-2xl md:mb-4 md:text-3xl"
            style={{ color: 'var(--color-foreground)' }}
          >
            {productName}
          </h1>

          {/* Price */}
          <div className="mb-3 md:mb-4">
            <span className="text-2xl font-bold tabular-nums tracking-tight sm:text-3xl" style={{ color: 'var(--color-foreground)' }}>
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
            <div className="mb-4 flex items-center gap-2 text-sm md:mb-5" data-testid="pd-stock-promise">
              <Truck className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary)' }} aria-hidden="true" />
              <span style={{ color: 'var(--color-foreground)' }}>
                {(() => {
                  if (!inStock) return t('product.outOfStock');
                  const qty = variant.quantityAvailable ?? 0;
                  const lowStock = qty <= lowStockThreshold;
                  const stockText = availabilityOnlyStock
                    ? t('product.inStock')
                    : lowStock
                    ? t('product.lowStockCount', { count: qty })
                    : t('product.inStock');
                  if (availabilityOnlyStock) return stockText;
                  const shipText = shipPromise === 'today'
                    ? t('product.shipsToday')
                    : t('product.shipsTomorrow');
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
          <div
            ref={setInlineActionsNode}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_44px] items-center gap-2 sm:flex sm:gap-3"
            data-testid="product-detail-actions"
          >
            <div
              className="flex h-11 min-w-0 items-center justify-between rounded-lg border sm:justify-start"
              style={{ borderColor: 'var(--color-border)' }}
              data-testid="product-detail-stepper"
            >
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-lg font-medium transition-colors duration-fast hover-surface"
                style={{ color: 'var(--color-foreground)' }}
                aria-label={t('product.decreaseQuantity', { name: productName })}
              >
                <Minus className="w-4 h-4" aria-hidden="true" />
              </button>
              <span className="min-w-[40px] px-3 py-2 text-center text-sm font-medium tabular-nums" style={{ color: 'var(--color-foreground)' }} aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-lg font-medium transition-colors duration-fast hover-surface"
                style={{ color: 'var(--color-foreground)' }}
                aria-label={t('product.increaseQuantity', { name: productName })}
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
              className="col-span-2 flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-white transition-all duration-fast disabled:opacity-50 active:scale-[0.98] hover:brightness-90 hover:shadow-md sm:h-10 sm:gap-2 sm:px-4 sm:text-base"
              style={{
                backgroundColor: justAdded ? 'var(--color-fresh)' : 'var(--color-primary)',
              }}
              data-testid="product-detail-add"
              aria-label={inStock ? `${t('common.addToCart')} — ${productName}` : t('product.outOfStock')}
            >
              {justAdded ? (
                <Check className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
              ) : (
                <ShoppingCart className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
              )}
              <span className="truncate">{inStock ? t('common.addToCart') : t('product.outOfStock')}</span>
            </button>
          </div>

          {purchaseFacts.length > 0 && (
            <dl className="mt-4 grid grid-cols-2 gap-2 md:mt-5" data-testid="pdp-purchase-facts">
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
                  <dd className="mt-1 break-words text-xs font-medium" style={{ color: 'var(--color-foreground)' }}>
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          </section>

        </div>
      </div>

      <ProductInformationSections product={displayProduct} sku={sku} currency={currency} />

      <RelatedProductsSection
        products={relatedProducts}
        categoryName={displayCategory?.name ?? null}
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

      {/* Mobile sticky add-to-cart bar appears when inline CTA scrolls out of view. */}
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
          <div className="container-grocery grid grid-cols-[minmax(0,1fr)_minmax(8.75rem,auto)] items-center gap-2 py-3">
            <div className="min-w-0" data-testid="mobile-pd-sticky-price">
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

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock}
              className="checkout-btn inline-flex h-11 min-w-[8.75rem] max-w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-sm font-semibold text-white transition-all duration-fast active:scale-[0.98] disabled:opacity-50"
              style={{
                backgroundColor: justAdded ? 'var(--color-fresh)' : 'var(--color-primary)',
              }}
              aria-label={t('common.addToCart')}
              tabIndex={showStickyAdd ? 0 : -1}
              data-testid="mobile-pd-sticky-add"
            >
              {justAdded ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden="true" />}
              <span className="truncate">{t('common.addToCart')}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
