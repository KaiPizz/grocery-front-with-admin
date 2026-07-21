'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from 'urql';
import {
  Banknote,
  CheckCircle2,
  ChevronRight,
  Heart,
  MapPin,
  Package,
  Percent,
  ShoppingCart,
  Snowflake,
  Sun,
  Thermometer,
} from 'lucide-react';
import { CATEGORIES_QUERY, PRODUCT_LISTING_QUERY, RECIPES_QUERY } from '@/lib/graphql/operations/grocery';
import { ProductCard } from '@/components/product/ProductCard';
import { MobileProductCard } from '@/components/product/MobileProductCard';
import { PromoBanner } from '@/components/grocery/PromoBanner';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { ConfiguredCategoryGrid } from '@/components/blocks/ConfiguredCategoryGrid';
import { RecipeCard } from '@/components/grocery/RecipeCard';
import { Link } from '@/i18n/navigation';
import { useChannel } from '@/hooks/use-channel';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import { getEnabledCommercialQuickLinks } from '@/lib/commercial-config';
import {
  isPickupFulfillment,
  usesAvailabilityOnlyStock,
  usesBankTransferPromise,
} from '@/lib/fulfillment';
import { getLocalizedProductName } from '@/lib/localization';
import {
  buildPublicCategories,
  type PublicCategory,
  type PublicTaxonomyRawCategory,
} from '@/lib/public-taxonomy';
import { getImageSrc } from '@/lib/utils';
import type { ProductTranslation } from '@/types';
import type {
  CommercialQuickLink,
  GridBannerBlock,
  HomepageSectionId,
  RoundGridBannerBlock,
} from '@/types/storefront-config';

interface HomeProduct {
  id: string;
  name: string;
  slug: string;
  translation?: ProductTranslation | null;
  thumbnail?: { url?: string | null } | null;
  unitOfMeasure?: string | null;
  sellByWeight?: boolean | null;
  storageZone?: 'FROZEN' | 'CHILLED' | 'AMBIENT' | null;
  freshness?: 'FRESH' | 'EXPIRING_SOON' | 'LAST_CHANCE' | null;
  pricing?: {
    onSale?: boolean | null;
    priceRange?: {
      start?: {
        gross?: {
          amount: number;
          currency: string;
        } | null;
      } | null;
    } | null;
    priceRangeUndiscounted?: {
      start?: {
        gross?: {
          amount: number;
          currency: string;
        } | null;
      } | null;
    } | null;
  } | null;
  variants?: Array<{
    id: string;
    quantityAvailable?: number | null;
    pricing?: {
      price?: {
        gross?: {
          amount: number;
          currency: string;
        } | null;
      } | null;
    } | null;
  }> | null;
}

interface HomeRecipe {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  thumbnail?: { url?: string | null } | null;
  servings?: number | null;
  totalTime?: number | null;
  difficulty?: string | null;
}

interface HomeCategory extends PublicTaxonomyRawCategory {
  backgroundImage?: {
    url?: string | null;
    alt?: string | null;
  } | null;
  products: {
    totalCount: number;
  } | null;
}

interface HomeCategoriesResponse {
  categories: {
    edges: Array<{ node: HomeCategory }>;
  } | null;
}

const DESKTOP_ZONE_CARDS = [
  { zone: 'FROZEN', icon: Snowflake, colorVar: 'var(--color-frozen)' },
  { zone: 'CHILLED', icon: Thermometer, colorVar: 'var(--color-chilled)' },
  { zone: 'AMBIENT', icon: Sun, colorVar: 'var(--color-ambient)' },
] as const;

function HomeShelfSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-[1.45rem] border shadow-[0_18px_36px_-30px_rgba(66,109,72,0.35)]"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'color-mix(in srgb, var(--color-card) 96%, white)' }}
    >
      <div className="aspect-square skeleton" />
      <div className="space-y-2 px-2.5 pb-2 pt-2.5">
        <div className="h-4 w-4/5 skeleton rounded-full" />
        <div className="h-4 w-1/3 skeleton rounded-full" />
        <div className="mt-3 h-11 w-full skeleton rounded-full" />
      </div>
    </div>
  );
}

function HomeCatalogHero({
  headline,
  subtitle,
  ctaText,
  ctaLink,
  products,
  pickup,
  loading,
}: {
  headline: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  products: HomeProduct[];
  pickup: boolean;
  loading: boolean;
}) {
  const t = useTranslations('home');
  const tFulfillment = useTranslations('fulfillment');
  const locale = useLocale();
  const visualProducts = products
    .map((product) => ({
      id: product.id,
      name: getLocalizedProductName(product, locale),
      imageUrl: getImageSrc(product.thumbnail?.url, { maxWidth: 480 }),
    }))
    .filter((product): product is { id: string; name: string; imageUrl: string } => Boolean(product.imageUrl))
    .slice(0, 4);
  const visualPanelClassName = loading && visualProducts.length === 0
    ? 'hidden min-h-[104px] grid-cols-4 gap-1.5 p-2 sm:min-h-[128px] sm:gap-2 sm:p-3 md:grid md:min-h-full md:grid-cols-2 md:grid-rows-2 md:gap-3 md:p-4'
    : 'grid min-h-[104px] grid-cols-4 gap-1.5 p-2 sm:min-h-[128px] sm:gap-2 sm:p-3 md:min-h-full md:grid-cols-2 md:grid-rows-2 md:gap-3 md:p-4';

  return (
    <div
      className="relative overflow-hidden rounded-[30px] border shadow-[0_28px_80px_-54px_rgba(25,78,48,0.5)] md:rounded-[38px]"
      style={{
        borderColor: 'color-mix(in srgb, var(--color-primary) 14%, var(--color-border))',
        backgroundColor: 'color-mix(in srgb, var(--color-accent) 62%, var(--color-card))',
      }}
    >
      <div className="grid items-stretch md:grid-cols-[1.08fr_0.92fr]">
        <div className="flex flex-col justify-center px-5 py-6 sm:px-8 sm:py-8 md:px-10 md:py-12 lg:px-14 lg:py-16">
          <span
            className="mb-4 inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-primary) 22%, var(--color-border))',
              backgroundColor: 'color-mix(in srgb, var(--color-card) 78%, transparent)',
              color: 'var(--color-primary)',
            }}
          >
            {pickup ? tFulfillment('pickupService') : t('categoryShortcuts')}
          </span>
          <h1
            className="max-w-[14ch] text-[2rem] font-semibold leading-none tracking-normal sm:text-[3rem] md:text-[3.5rem] lg:text-[4.35rem]"
            style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-display)' }}
          >
            {headline}
          </h1>
          <p
            className="mt-4 max-w-[34rem] text-sm leading-6 sm:text-base md:text-lg md:leading-7"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            {subtitle}
          </p>
          <Link
            href={ctaLink}
            className="mt-6 inline-flex h-11 w-fit items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-[0_16px_34px_-20px_rgba(22,101,62,0.9)] transition-transform duration-fast hover:-translate-y-0.5 active:translate-y-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {ctaText}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div
          className={visualPanelClassName}
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 7%, transparent)' }}
          aria-label={t('catalogPreview')}
        >
          {visualProducts.length > 0 ? (
            visualProducts.map((product, index) => (
              <div
                key={product.id}
                className={`relative min-h-[92px] overflow-hidden rounded-[14px] border sm:min-h-[108px] md:min-h-[118px] md:rounded-[20px] ${
                  visualProducts.length < 3 && index === 0 ? 'col-span-2 md:col-span-2' : ''
                }`}
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-card) 72%, transparent)',
                  backgroundColor: 'var(--color-muted)',
                }}
              >
                {/* Runtime catalog hosts are tenant-configurable, so this intentionally remains a plain image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="absolute inset-0 h-full w-full object-contain p-3 sm:p-4"
                  loading={index < 2 ? 'eager' : 'lazy'}
                  data-testid="home-hero-product-image"
                />
                <div
                  className="absolute inset-x-0 bottom-0 hidden px-3 pb-2 pt-7 md:block"
                  style={{ background: 'linear-gradient(180deg, transparent, rgba(15, 35, 23, 0.72))' }}
                >
                  <span className="line-clamp-1 text-xs font-semibold text-white">{product.name}</span>
                </div>
              </div>
            ))
          ) : loading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="min-h-[92px] rounded-[14px] skeleton sm:min-h-[108px] md:min-h-[118px] md:rounded-[20px]"
                aria-hidden="true"
              />
            ))
          ) : (
            <div
              className="col-span-2 flex min-h-[210px] items-center justify-center rounded-[22px] border p-8 text-center"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-primary) 18%, var(--color-border))',
                backgroundColor: 'color-mix(in srgb, var(--color-card) 78%, transparent)',
                color: 'var(--color-muted-foreground)',
              }}
            >
              <span className="max-w-[18rem] text-sm leading-6">{t('catalogPreviewFallback')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HomeCampaignBand({
  products,
  quickLinks,
  loading,
}: {
  products: HomeProduct[];
  quickLinks: CommercialQuickLink[];
  loading: boolean;
}) {
  const t = useTranslations('home');
  const locale = useLocale();
  const primaryLink = quickLinks[0];
  const visualProducts = products
    .map((product) => ({
      id: product.id,
      name: getLocalizedProductName(product, locale),
      href: `/products/${product.slug}`,
      imageUrl: getImageSrc(product.thumbnail?.url, { maxWidth: 480 }),
    }))
    .filter((product): product is { id: string; name: string; href: string; imageUrl: string } => Boolean(product.imageUrl))
    .slice(0, 3);

  if (!loading && visualProducts.length === 0 && !primaryLink) {
    return null;
  }

  return (
    <section className="container-grocery py-3 md:py-5" data-testid="home-campaign-band">
      <div
        className="grid overflow-hidden rounded-[24px] border md:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)]"
        style={{
          borderColor: 'color-mix(in srgb, var(--color-primary) 16%, var(--color-border))',
          backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-card))',
        }}
      >
        <div className="flex flex-col justify-center px-5 py-5 sm:px-6 md:px-8 md:py-7">
          <span
            className="mb-2 inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
              color: 'var(--color-primary)',
            }}
          >
            {t('campaignEyebrow')}
          </span>
          <h2
            className="max-w-[17ch] text-2xl font-semibold leading-tight tracking-normal md:text-3xl"
            style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-display)' }}
          >
            {primaryLink?.label ?? t('campaignTitle')}
          </h2>
          <p className="mt-2 max-w-[40rem] text-sm leading-6 md:text-base" style={{ color: 'var(--color-muted-foreground)' }}>
            {primaryLink?.description ?? t('campaignSubtitle')}
          </p>
          <Link
            href={primaryLink?.href ?? '/products'}
            className="mt-4 inline-flex h-10 w-fit items-center gap-2 rounded-full px-4 text-sm font-semibold text-white transition-transform duration-fast hover:-translate-y-0.5 active:translate-y-0"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {t('campaignCta')}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div
          className="flex gap-2 overflow-x-auto px-4 pb-4 [scrollbar-width:none] md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:p-4 [&::-webkit-scrollbar]:hidden"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 8%, transparent)' }}
        >
          {loading && visualProducts.length === 0
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-32 min-w-[116px] rounded-[18px] skeleton md:h-auto md:min-h-[152px] md:min-w-0" aria-hidden="true" />
              ))
            : visualProducts.map((product, index) => (
                <Link
                  key={product.id}
                  href={product.href}
                  className="group relative h-32 min-w-[116px] overflow-hidden rounded-[18px] border md:h-auto md:min-h-[152px] md:min-w-0"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-card) 72%, transparent)',
                    backgroundColor: 'var(--color-card)',
                  }}
                  data-testid="home-campaign-product"
                >
                  {/* Runtime catalog hosts are tenant-configurable, so this intentionally remains a plain image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-normal group-hover:scale-[1.04]"
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />
                  <span
                    className="absolute inset-x-0 bottom-0 hidden px-2.5 pb-2 pt-8 md:block"
                    style={{ background: 'linear-gradient(180deg, transparent, rgba(15, 35, 23, 0.72))' }}
                  >
                    <span className="line-clamp-2 text-xs font-semibold leading-snug text-white">{product.name}</span>
                  </span>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}

function HomeCategoryShortcuts({
  categories,
  quickLinks,
}: {
  categories: HomeCategory[];
  quickLinks: CommercialQuickLink[];
}) {
  const t = useTranslations('home');
  const locale = useLocale();
  const visibleCategories = buildPublicCategories(categories, locale)
    .sort((left, right) => (right.products?.totalCount ?? 0) - (left.products?.totalCount ?? 0))
    .slice(0, 6);
  const visibleQuickLinks = quickLinks.slice(0, 3);
  const shortcutItems = [
    ...visibleQuickLinks.map((link) => ({
      id: `quick-${link.id}`,
      label: link.label,
      href: link.href,
      count: null,
    })),
    ...visibleCategories.slice(0, 6).map((category) => ({
      id: `category-${category.id}`,
      label: category.name,
      href: `/categories/${category.slug}`,
      count: category.products?.totalCount ?? 0,
    })),
  ].slice(0, 8);
  const richCategoryCards = visibleCategories
    .map((category) => ({
      category,
      sourceCategory: categories.find((candidate) => (
        category.rawCategoryIds.includes(candidate.id) && candidate.backgroundImage?.url
      )) ?? null,
    }))
    .map(({ category, sourceCategory }) => ({
      category,
      imageUrl: getImageSrc(sourceCategory?.backgroundImage?.url, { maxWidth: 720 }),
      imageAlt: sourceCategory?.backgroundImage?.alt ?? category.name,
    }))
    .filter((item): item is { category: PublicCategory; imageUrl: string; imageAlt: string } => Boolean(item.imageUrl))
    .slice(0, 4);
  const richQuickLinks = visibleQuickLinks
    .map((link) => ({
      link,
      imageUrl: getImageSrc(link.imageUrl, { maxWidth: 720 }),
    }))
    .filter((item): item is { link: CommercialQuickLink; imageUrl: string } => Boolean(item.imageUrl))
    .slice(0, 3);
  const hasRichCards = richCategoryCards.length + richQuickLinks.length >= 2;

  if (visibleCategories.length === 0 && visibleQuickLinks.length === 0) {
    return null;
  }

  return (
    <section className="container-grocery py-5 md:py-8" data-testid="home-category-shortcuts">
      <div className="mb-3 flex items-end justify-between gap-4 md:mb-4">
        <h2
          className="heading-section text-xl md:text-2xl"
          style={{ color: 'var(--color-foreground)' }}
        >
          {t('categoryShortcuts')}
        </h2>
        <Link
          href="/categories"
          className="inline-flex min-h-10 items-center gap-1 rounded-full border px-3 text-sm font-semibold transition-colors duration-fast hover:opacity-80"
          style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
        >
          {t('seeAllCategories')}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {shortcutItems.length > 0 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
          {shortcutItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition-[border-color,transform,background-color] duration-fast hover:-translate-y-0.5"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-primary) 18%, var(--color-border))',
                backgroundColor: 'color-mix(in srgb, var(--color-card) 92%, var(--color-accent))',
                color: 'var(--color-foreground)',
              }}
              data-testid="home-category-chip"
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-[11px]"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                  color: 'var(--color-primary)',
                }}
                aria-hidden="true"
              >
                {item.label.slice(0, 1).toUpperCase()}
              </span>
              <span className="max-w-[9rem] truncate">{item.label}</span>
              {item.count !== null && (
                <span style={{ color: 'var(--color-muted-foreground)' }}>{item.count}</span>
              )}
            </Link>
          ))}
        </div>
      )}

      {hasRichCards && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" data-testid="home-category-card-grid">
          {richCategoryCards.map(({ category, imageUrl, imageAlt }, index) => {
          const count = category.products?.totalCount ?? 0;
          const countLabel = t('productCount', { count });
          const featured = index === 0 && richCategoryCards.length > 3;

          return (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              aria-label={`${category.name}, ${countLabel}`}
              className={`group overflow-hidden rounded-[20px] border shadow-[0_18px_36px_-32px_rgba(15,35,23,0.32)] transition-[border-color,transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:shadow-[0_20px_46px_-30px_rgba(15,35,23,0.42)] ${
                featured ? 'col-span-2 sm:col-span-1 lg:col-span-2' : ''
              }`}
              style={{
                borderColor: 'color-mix(in srgb, var(--color-border) 86%, white)',
                backgroundColor: 'var(--color-card)',
              }}
              data-testid="home-category-card"
            >
              <span
                className={`relative flex items-center justify-center overflow-hidden ${
                  featured ? 'aspect-[2/1] sm:aspect-[4/3] lg:aspect-[2/1]' : 'aspect-[4/3]'
                }`}
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 7%, var(--color-muted))' }}
              >
                {/* Runtime catalog hosts are tenant-configurable, so this intentionally remains a plain image. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={imageAlt}
                  className="h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.03]"
                  loading="lazy"
                  data-testid="home-category-card-image"
                />
                <span
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, transparent 42%, rgba(15, 35, 23, 0.45))' }}
                  aria-hidden="true"
                />
                <span
                  className="absolute left-2.5 top-2.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-card) 92%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--color-border) 72%, transparent)',
                    color: 'var(--color-foreground)',
                  }}
                >
                  {countLabel}
                </span>
              </span>
              <span className="flex min-h-[72px] items-center justify-between gap-3 p-3">
                <span className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: 'var(--color-foreground)' }}>
                  {category.name}
                </span>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-fast group-hover:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                  aria-hidden="true"
                >
                  <ChevronRight className="h-4 w-4" />
                </span>
              </span>
            </Link>
          );
          })}

          {richQuickLinks.map(({ link, imageUrl }) => {
          return (
            <Link
              key={link.id}
              href={link.href}
              className="group overflow-hidden rounded-[20px] border shadow-[0_18px_36px_-32px_rgba(15,35,23,0.32)] transition-[border-color,transform,box-shadow] duration-fast hover:-translate-y-0.5 hover:shadow-[0_20px_46px_-30px_rgba(15,35,23,0.42)]"
              style={{
                borderColor: 'color-mix(in srgb, var(--color-primary) 18%, var(--color-border))',
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-card))',
              }}
              data-testid="home-commercial-card"
            >
              <span
                className="relative flex aspect-[4/3] items-center justify-center overflow-hidden"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 13%, var(--color-muted))' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt=""
                  className="h-full w-full object-cover transition-transform duration-normal group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <span
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(180deg, transparent 48%, rgba(15, 35, 23, 0.42))' }}
                  aria-hidden="true"
                />
              </span>
              <span className="flex min-h-[72px] items-center justify-between gap-3 p-3">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                    {link.label}
                  </span>
                  {link.description && (
                    <span className="mt-1 line-clamp-2 block text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {link.description}
                    </span>
                  )}
                </span>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-fast group-hover:border-[var(--color-primary)]"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-primary)' }}
                  aria-hidden="true"
                >
                  <ChevronRight className="h-4 w-4" />
                </span>
              </span>
            </Link>
          );
          })}
        </div>
      )}
    </section>
  );
}

function HomeFulfillmentTrust({
  pickup,
  bankTransfer,
  manualConfirmation,
  guidedPickup = false,
}: {
  pickup: boolean;
  bankTransfer: boolean;
  manualConfirmation: boolean;
  guidedPickup?: boolean;
}) {
  const t = useTranslations('fulfillment');

  if (pickup && guidedPickup) {
    const steps = [
      {
        title: t('pickupGuideStep1Title'),
        description: t('pickupGuideStep1Description'),
        icon: ShoppingCart,
      },
      {
        title: t('pickupGuideStep2Title'),
        description: t('pickupGuideStep2Description'),
        icon: CheckCircle2,
      },
      {
        title: t('pickupGuideStep3Title'),
        description: t('pickupGuideStep3Description'),
        icon: MapPin,
      },
    ];

    return (
      <section
        className="container-grocery py-4 md:py-6"
        data-testid="home-fulfillment-trust"
      >
        <div data-testid="home-pickup-guide">
          <h2
            className="heading-section mb-3 text-lg md:mb-4 md:text-xl"
            style={{ color: 'var(--color-foreground)' }}
          >
            {t('pickupGuideTitle')}
          </h2>
          <ol className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:grid-cols-3 md:gap-3 md:px-0 [&::-webkit-scrollbar]:hidden">
            {steps.map(({ title, description, icon: Icon }, index) => (
              <li
                key={title}
                className="flex min-w-[250px] snap-start items-start gap-3 rounded-[18px] border p-4 md:min-w-0"
                style={{
                  borderColor: 'color-mix(in srgb, var(--color-primary) 14%, var(--color-border))',
                  backgroundColor: 'color-mix(in srgb, var(--color-card) 94%, var(--color-accent))',
                }}
              >
                <span
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                    color: 'var(--color-primary)',
                  }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    style={{ backgroundColor: 'var(--color-primary)' }}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                    {title}
                  </span>
                  <span className="mt-1 block text-xs leading-5" style={{ color: 'var(--color-muted-foreground)' }}>
                    {description}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    );
  }

  const items: Array<{ label: string; icon: typeof MapPin }> = [
    pickup ? { label: t('pickupService'), icon: MapPin } : null,
    bankTransfer ? { label: t('bankTransferService'), icon: Banknote } : null,
    manualConfirmation ? { label: t('manualConfirmationShort'), icon: CheckCircle2 } : null,
    { label: t('liveCatalogService'), icon: Package },
    { label: t('wishlistService'), icon: Heart },
    { label: t('cartService'), icon: ShoppingCart },
  ].filter((item): item is { label: string; icon: typeof MapPin } => item !== null).slice(0, 5);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="container-grocery py-4 md:py-6" data-testid="home-fulfillment-trust">
      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:grid md:gap-px md:overflow-hidden md:rounded-[22px] md:border md:px-0 md:pb-0 [&::-webkit-scrollbar]:hidden"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-border)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        }}
      >
        {items.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex min-h-16 min-w-[212px] items-center gap-3 rounded-[18px] border px-4 py-3 md:min-w-0 md:rounded-none md:border-0"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'color-mix(in srgb, var(--color-card) 94%, var(--color-accent))',
            }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                color: 'var(--color-primary)',
              }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold leading-5" style={{ color: 'var(--color-foreground)' }}>
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const t = useTranslations('home');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const channel = useChannel();
  const siteConfig = useStorefrontConfig();
  const availabilityOnlyStock = usesAvailabilityOnlyStock(siteConfig);
  const pickupFulfillment = isPickupFulfillment(siteConfig);
  const bankTransferPromise = usesBankTransferPromise(siteConfig);
  const commercialQuickLinks = getEnabledCommercialQuickLinks(siteConfig);
  const isAsiaDeliGo = siteConfig?.branding?.storeName.trim().toLowerCase() === 'asia deli go';

  const homepageHero = siteConfig?.homepage?.hero;
  const homepageBlocks = siteConfig?.homepage?.blocks ?? [];
  const enabledBlocks = homepageBlocks.filter((block) => block.enabled).sort((a, b) => a.order - b.order);
  const heroBlock = enabledBlocks.find((block) => block.type === 'hero');
  const secondaryBlocks = heroBlock
    ? enabledBlocks.filter((block) => block.id !== heroBlock.id)
    : enabledBlocks;
  const configuredCategoryBlocks = secondaryBlocks.filter((block): block is GridBannerBlock | RoundGridBannerBlock => (
    isAsiaDeliGo && (block.type === 'grid' || block.type === 'round_grid')
  ));
  const hasConfiguredCategoryNavigation = configuredCategoryBlocks.length > 0;
  const configuredPromotionBlocks = secondaryBlocks
    .filter((block) => block.type !== 'grid' && block.type !== 'round_grid')
    .slice(0, 1);
  const showLegacyHero = !heroBlock && homepageHero?.enabled !== false;
  const heroHeadline = homepageHero?.headline?.trim() || t('hero');
  const heroSubtitle = homepageHero?.subtitle?.trim() || t('heroSub');
  const heroCtaText = homepageHero?.ctaText?.trim() || tNav('products');
  const heroCtaLink = homepageHero?.ctaLink?.trim() || '/products';

  const configSections = siteConfig?.homepage?.sections;
  const orderedSections: HomepageSectionId[] = configSections
    ? configSections
        .filter(s => s.enabled)
        .sort((a, b) => a.order - b.order)
        .map(s => s.id)
    : ['shopByZone', 'deals', 'freshPicks', 'recipes'];

  const [productsResult] = useQuery({
    query: PRODUCT_LISTING_QUERY,
    variables: {
      channel,
      first: 8,
      sortBy: { field: 'DATE', direction: 'DESC' },
    },
  });

  const dealsEnabled = orderedSections.includes('deals');
  const [dealsResult] = useQuery({
    query: PRODUCT_LISTING_QUERY,
    pause: !dealsEnabled,
    variables: { channel, first: 8 },
  });

  const [recipesResult] = useQuery({
    query: RECIPES_QUERY,
    variables: { channel, first: 4 },
  });

  const [categoriesResult] = useQuery<HomeCategoriesResponse>({
    query: CATEGORIES_QUERY,
    variables: { channel },
  });

  const products = (productsResult.data?.products?.edges?.map((edge: { node: HomeProduct }) => edge.node) ?? []) as HomeProduct[];
  const dealCandidates = (dealsResult.data?.products?.edges?.map((edge: { node: HomeProduct }) => edge.node) ?? []) as HomeProduct[];
  const recipes = (recipesResult.data?.recipes?.edges?.map((edge: { node: HomeRecipe }) => edge.node) ?? []) as HomeRecipe[];
  const categories = categoriesResult.data?.categories?.edges.map((edge) => edge.node) ?? [];

  const saleProducts = dealCandidates
    .filter((product) => {
      const discounted = product.pricing?.priceRangeUndiscounted?.start?.gross?.amount;
      const currentPrice = product.pricing?.priceRange?.start?.gross?.amount;
      return Boolean(product.pricing?.onSale) || Boolean(discounted && currentPrice && discounted > currentPrice);
    })
    .slice(0, 4);
  const productsForDeals = saleProducts;
  const highlightedProductIds = new Set(productsForDeals.map((product) => product.id));
  const freshPicks = products.filter((product) => !highlightedProductIds.has(product.id));
  const productsForFreshPicks = freshPicks.length > 0 ? freshPicks : products;
  return (
    <div className="pb-24 md:pb-12">
      {heroBlock ? <h1 className="sr-only">{heroHeadline}</h1> : null}

      <div className="md:hidden">
        {heroBlock ? (
          <section className="container-grocery pb-3 pt-5 sm:pt-7" data-testid="mobile-home-hero">
            <BlockRenderer block={heroBlock} heroHeading={heroHeadline} />
          </section>
        ) : null}

        {showLegacyHero && (
          <section className="container-grocery pb-2 pt-4 sm:pt-6" data-testid="mobile-home-hero">
            <HomeCatalogHero
              headline={heroHeadline}
              subtitle={heroSubtitle}
              ctaText={heroCtaText}
              ctaLink={heroCtaLink}
              products={products}
              pickup={pickupFulfillment}
              loading={productsResult.fetching}
            />
          </section>
        )}

        {(() => {
          if (!hasConfiguredCategoryNavigation && secondaryBlocks.length > 0) {
            return (
              <div className="container-grocery space-y-4 py-4">
                {secondaryBlocks.map((block) => (
                  <BlockRenderer key={block.id} block={block} />
                ))}
              </div>
            );
          }
          return null;
        })()}

        <HomeFulfillmentTrust
          pickup={pickupFulfillment}
          bankTransfer={bankTransferPromise}
          manualConfirmation={availabilityOnlyStock}
          guidedPickup={hasConfiguredCategoryNavigation}
        />

        {hasConfiguredCategoryNavigation ? (
          <ConfiguredCategoryGrid blocks={configuredCategoryBlocks} />
        ) : (
          <HomeCampaignBand
            products={products}
            quickLinks={commercialQuickLinks}
            loading={productsResult.fetching}
          />
        )}

        {orderedSections.map((sectionId) => {
          switch (sectionId) {
            case 'shopByZone':
              if (availabilityOnlyStock) {
                if (hasConfiguredCategoryNavigation) return null;

                return (
                  <HomeCategoryShortcuts
                    key="categoryShortcuts"
                    categories={categories}
                    quickLinks={commercialQuickLinks}
                  />
                );
              }

              return (
                <section key="shopByZone" className="container-grocery py-5">
                  <h2
                    className="mb-4 text-2xl font-semibold tracking-tight"
                    style={{ color: 'var(--color-foreground)' }}
                  >
                    {t('shopByZone')}
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    {DESKTOP_ZONE_CARDS.map(({ zone, icon: Icon, colorVar }) => (
                      <Link
                        key={zone}
                        href={`/products?zone=${zone}`}
                        className="flex flex-col items-center gap-2 rounded-xl border p-4"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                        aria-label={t('shopZoneAria', { zone: t(zone.toLowerCase() as 'frozen' | 'chilled' | 'ambient') })}
                      >
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 15%, transparent)` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: colorVar }} aria-hidden="true" />
                        </div>
                        <span className="text-xs font-semibold" style={{ color: 'var(--color-foreground)' }}>
                          {t(zone.toLowerCase() as 'frozen' | 'chilled' | 'ambient')}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              );

            case 'deals':
              if (!dealsResult.fetching && productsForDeals.length === 0) return null;

              return (
                <section key="deals" id="home-deals" className="container-grocery py-5" data-testid="mobile-home-deals">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" style={{ color: 'var(--color-last-chance)' }} aria-hidden="true" />
                      <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                        {t('onSale')}
                      </h2>
                    </div>
                    <Link href="/products?sort=price_asc" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                      {t('seeAllDeals')}
                    </Link>
                  </div>
                  {dealsResult.fetching ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <HomeShelfSkeleton key={index} />
                      ))}
                    </div>
                  ) : productsForDeals.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {productsForDeals.map((product, index) => (
                        <MobileProductCard
                          key={product.id}
                          product={product as never}
                          imagePriority={index < 2}
                          testId="mobile-home-deal-card"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border px-5 py-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        {t('productsEmpty')}
                      </p>
                    </div>
                  )}
                </section>
              );

            case 'freshPicks':
              return (
                <section key="freshPicks" id="home-fresh-picks" className="container-grocery py-5" data-testid="mobile-home-fresh-picks">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                      {t('newArrivals')}
                    </h2>
                    <Link href="/products" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                      {t('seeAllProducts')}
                    </Link>
                  </div>
                  {productsResult.fetching ? (
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <HomeShelfSkeleton key={index} />
                      ))}
                    </div>
                  ) : productsForFreshPicks.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {productsForFreshPicks.slice(0, 4).map((product, index) => (
                        <MobileProductCard
                          key={product.id}
                          product={product as never}
                          imagePriority={index < 2}
                          testId="mobile-home-product-card"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border px-5 py-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        {t('productsEmpty')}
                      </p>
                    </div>
                  )}
                </section>
              );

            case 'recipes':
              if (!recipesResult.fetching && recipes.length === 0) return null;
              return (
                <section key="recipes" className="container-grocery py-5">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <h2 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--color-foreground)' }}>
                      {t('featuredRecipes')}
                    </h2>
                    <Link href="/recipes" className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                      {t('seeAllRecipes')}
                    </Link>
                  </div>
                  {recipesResult.fetching ? (
                    <div className="grid grid-cols-2 gap-4">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <div key={index} className="overflow-hidden rounded-[28px] border p-3" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                          <div className="aspect-[4/3] rounded-[22px] skeleton" />
                          <div className="space-y-2 px-1 pt-3">
                            <div className="h-4 w-2/3 skeleton rounded-full" />
                            <div className="h-3 w-1/2 skeleton rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {recipes.map((recipe) => (
                        <div key={recipe.id} className="min-w-[260px] snap-start">
                          <RecipeCard recipe={recipe as never} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );

            default:
              return null;
          }
        })}

        {hasConfiguredCategoryNavigation && configuredPromotionBlocks.length > 0 && (
          <div className="container-grocery space-y-4 py-5" data-testid="home-configured-promo">
            {configuredPromotionBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:block">
        {heroBlock ? (
          <section className="container-grocery pb-6 pt-8 md:pt-10" data-testid="desktop-home-hero">
            <BlockRenderer block={heroBlock} heroHeading={heroHeadline} />
          </section>
        ) : null}

        {showLegacyHero && (
          <section className="container-grocery pb-6 pt-8 lg:pt-10" data-testid="desktop-home-hero">
            <HomeCatalogHero
              headline={heroHeadline}
              subtitle={heroSubtitle}
              ctaText={heroCtaText}
              ctaLink={heroCtaLink}
              products={products}
              pickup={pickupFulfillment}
              loading={productsResult.fetching}
            />
          </section>
        )}

        {(() => {
          if (!hasConfiguredCategoryNavigation && secondaryBlocks.length > 0) {
            return (
              <div className="container-grocery space-y-8 py-8 md:py-12">
                {secondaryBlocks.map((block) => (
                  <BlockRenderer key={block.id} block={block} />
                ))}
              </div>
            );
          }
          if (!hasConfiguredCategoryNavigation) return (
            <section className="container-grocery py-6 md:py-8">
              <PromoBanner />
            </section>
          );
          return null;
        })()}

        <HomeFulfillmentTrust
          pickup={pickupFulfillment}
          bankTransfer={bankTransferPromise}
          manualConfirmation={availabilityOnlyStock}
          guidedPickup={hasConfiguredCategoryNavigation}
        />

        {hasConfiguredCategoryNavigation ? (
          <ConfiguredCategoryGrid blocks={configuredCategoryBlocks} />
        ) : (
          <HomeCampaignBand
            products={products}
            quickLinks={commercialQuickLinks}
            loading={productsResult.fetching}
          />
        )}

        {orderedSections.map((sectionId) => {
          switch (sectionId) {
            case 'shopByZone':
              if (availabilityOnlyStock) {
                if (hasConfiguredCategoryNavigation) return null;

                return (
                  <HomeCategoryShortcuts
                    key="categoryShortcuts"
                    categories={categories}
                    quickLinks={commercialQuickLinks}
                  />
                );
              }

              return (
                <section key="shopByZone" className="container-grocery py-16 md:py-20">
                  <h2
                    className="heading-section mb-8 text-xl md:text-2xl"
                    style={{ color: 'var(--color-foreground)' }}
                  >
                    {t('shopByZone')}
                  </h2>
                  <div className="grid grid-cols-3 gap-4 md:gap-6" data-testid="desktop-home-zone-grid">
                    {DESKTOP_ZONE_CARDS.map(({ zone, icon: Icon, colorVar }) => (
                      <Link
                        key={zone}
                        href={`/products?zone=${zone}`}
                        className="flex flex-col items-center gap-3 rounded-xl border p-6 md:p-8"
                        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                        aria-label={t('shopZoneAria', { zone: t(zone.toLowerCase() as 'frozen' | 'chilled' | 'ambient') })}
                      >
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-2xl"
                          style={{ backgroundColor: `color-mix(in srgb, ${colorVar} 15%, transparent)` }}
                        >
                          <Icon className="h-7 w-7" style={{ color: colorVar }} aria-hidden="true" />
                        </div>
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-foreground)' }}>
                          {t(zone.toLowerCase() as 'frozen' | 'chilled' | 'ambient')}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              );

            case 'deals':
              if (!dealsResult.fetching && productsForDeals.length === 0) return null;

              return (
                <section key="deals" className="container-grocery py-16 md:py-20">
                  <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Percent className="h-5 w-5" style={{ color: 'var(--color-last-chance)' }} aria-hidden="true" />
                      <h2 className="heading-section text-xl md:text-2xl" style={{ color: 'var(--color-foreground)' }}>
                        {t('onSale')}
                      </h2>
                    </div>
                    <Link
                      href="/products?sort=price_asc"
                      className="flex items-center gap-1 text-sm font-medium transition-colors duration-fast hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {t('seeAllDeals')}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                  {dealsResult.fetching ? (
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <HomeShelfSkeleton key={index} />
                      ))}
                    </div>
                  ) : productsForDeals.length > 0 ? (
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" data-testid="desktop-home-deals">
                      {productsForDeals.map((product, index) => (
                        <ProductCard
                          key={product.id}
                          product={product as never}
                          imagePriority={index < 2}
                          showCatalogFacts
                          actionVisibility="always"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        {t('productsEmpty')}
                      </p>
                    </div>
                  )}
                </section>
              );

            case 'freshPicks':
              return (
                <section
                  key="freshPicks"
                  className="container-grocery py-12 md:py-16"
                  data-testid="desktop-home-fresh-picks"
                >
                  <div className="mb-8 flex items-center justify-between">
                    <h2 className="heading-section text-xl md:text-2xl" style={{ color: 'var(--color-foreground)' }}>
                      {t('newArrivals')}
                    </h2>
                    <Link
                      href="/products"
                      className="flex items-center gap-1 text-sm font-medium transition-colors duration-fast hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                      aria-label={tCommon('viewAllProducts')}
                    >
                      {t('seeAllProducts')}
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </div>
                  {productsResult.fetching ? (
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, index) => (
                        <HomeShelfSkeleton key={index} />
                      ))}
                    </div>
                  ) : productsForFreshPicks.length > 0 ? (
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                      {productsForFreshPicks.map((product, index) => (
                        <ProductCard
                          key={product.id}
                          product={product as never}
                          imagePriority={index < 4}
                          showCatalogFacts
                          actionVisibility="always"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-16 text-center">
                      <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                        {t('productsEmpty')}
                      </p>
                    </div>
                  )}
                </section>
              );

            case 'recipes':
              if (!recipesResult.fetching && recipes.length === 0) return null;
              return (
                <section key="recipes" className="py-16 md:py-20" style={{ backgroundColor: 'var(--color-muted)' }}>
                  <div className="container-grocery">
                    <div className="mb-8 flex items-center justify-between">
                      <h2 className="heading-section text-xl md:text-2xl" style={{ color: 'var(--color-foreground)' }}>
                        {t('featuredRecipes')}
                      </h2>
                      <Link
                        href="/recipes"
                        className="flex items-center gap-1 text-sm font-medium transition-colors duration-fast hover:opacity-80"
                        style={{ color: 'var(--color-primary)' }}
                        aria-label={tCommon('viewAllRecipes')}
                      >
                        {t('seeAllRecipes')}
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    </div>
                    {recipesResult.fetching ? (
                      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                          <div key={index} className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}>
                            <div className="aspect-[4/3] skeleton" />
                            <div className="space-y-2 p-4">
                              <div className="h-4 w-3/4 skeleton rounded" />
                              <div className="h-3 w-full skeleton rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        {recipes.map((recipe) => (
                          <RecipeCard key={recipe.id} recipe={recipe as never} />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              );

            default:
              return null;
          }
        })}

        {hasConfiguredCategoryNavigation && configuredPromotionBlocks.length > 0 && (
          <div className="container-grocery space-y-8 py-10 md:py-14" data-testid="home-configured-promo">
            {configuredPromotionBlocks.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
