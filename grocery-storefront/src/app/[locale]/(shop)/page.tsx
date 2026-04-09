'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from 'urql';
import {
  ArrowUpRight,
  ChevronRight,
  Leaf,
  Percent,
  Snowflake,
  Sun,
  Thermometer,
} from 'lucide-react';
import { PRODUCTS_QUERY, RECIPES_QUERY } from '@/lib/graphql/operations/grocery';
import { ProductCard } from '@/components/product/ProductCard';
import { MobileProductCard } from '@/components/product/MobileProductCard';
import { PromoBanner } from '@/components/grocery/PromoBanner';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { RecipeCard } from '@/components/grocery/RecipeCard';
import { Link } from '@/i18n/navigation';
import { useChannel } from '@/hooks/use-channel';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import type { HomepageSectionId } from '@/types/storefront-config';

interface HomeProduct {
  id: string;
  name: string;
  slug: string;
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

export default function HomePage() {
  const t = useTranslations('home');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const channel = useChannel();
  const siteConfig = useStorefrontConfig();

  const configSections = siteConfig?.homepage?.sections;
  const orderedSections: HomepageSectionId[] = configSections
    ? configSections
        .filter(s => s.enabled)
        .sort((a, b) => a.order - b.order)
        .map(s => s.id)
    : ['shopByZone', 'deals', 'freshPicks', 'recipes'];

  const [productsResult] = useQuery({
    query: PRODUCTS_QUERY,
    variables: { channel, first: 8 },
  });

  const [recipesResult] = useQuery({
    query: RECIPES_QUERY,
    variables: { channel, first: 4 },
  });

  const products = (productsResult.data?.products?.edges?.map((edge: { node: HomeProduct }) => edge.node) ?? []) as HomeProduct[];
  const recipes = (recipesResult.data?.recipes?.edges?.map((edge: { node: HomeRecipe }) => edge.node) ?? []) as HomeRecipe[];

  const saleProducts = products
    .filter((product) => {
      const discounted = product.pricing?.priceRangeUndiscounted?.start?.gross?.amount;
      const currentPrice = product.pricing?.priceRange?.start?.gross?.amount;
      return Boolean(product.pricing?.onSale) || Boolean(discounted && currentPrice && discounted > currentPrice);
    })
    .slice(0, 4);
  const productsForDeals = [
    ...saleProducts,
    ...products.filter((product) => !saleProducts.some((saleProduct) => saleProduct.id === product.id)),
  ].slice(0, 4);
  const highlightedProductIds = new Set(productsForDeals.map((product) => product.id));
  const freshPicks = products
    .filter((product) => !highlightedProductIds.has(product.id))
    .slice(0, 4);
  const productsForFreshPicks = freshPicks.length > 0 ? freshPicks : products.slice(0, 4);

  const heroHighlights = [t('onSale'), t('shopByZone')];
  return (
    <div className="pb-12">
      <div className="md:hidden">
        {siteConfig?.homepage?.hero?.enabled !== false && (
        <section className="container-grocery pb-4 pt-6 sm:pt-8">
          <div
            className="relative overflow-hidden rounded-[34px] border px-5 py-6 shadow-[0_35px_90px_-50px_rgba(22,163,74,0.35)] sm:px-8 sm:py-7"
            style={{
              borderColor: 'color-mix(in srgb, var(--color-primary) 12%, var(--color-border))',
              background:
                'radial-gradient(circle at top left, rgba(22, 163, 74, 0.18), transparent 26%), radial-gradient(circle at top right, rgba(187, 247, 208, 0.95), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,250,245,0.98) 100%)',
            }}
            data-testid="mobile-home-hero"
          >
            <div
              className="absolute -left-12 bottom-0 h-28 w-28 rounded-full blur-2xl"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 20%, transparent)' }}
              aria-hidden="true"
            />
            <div
              className="absolute -right-10 top-6 h-24 w-24 rounded-full blur-2xl"
              style={{ backgroundColor: 'rgba(250, 204, 21, 0.18)' }}
              aria-hidden="true"
            />

            <div className="relative mx-auto max-w-[30rem] text-center">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 14%, white)',
                  color: 'var(--color-primary)',
                }}
              >
                <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                {t('promoTitle')}
              </span>

              <h1
                className="mt-4 text-[1.85rem] font-semibold leading-[0.98] tracking-[-0.05em] sm:text-[2.75rem]"
                style={{ color: 'var(--color-foreground)', fontFamily: 'var(--font-display)' }}
              >
                {t('hero')}
              </h1>
              <p className="mx-auto mt-3 max-w-[24rem] text-sm leading-[1.45] sm:text-[15px]" style={{ color: 'var(--color-muted-foreground)' }}>
                {t('heroSub')}
              </p>

              <div className="mt-5 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                <Link
                  href="/products"
                  className="inline-flex h-11 min-w-[168px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-[0_18px_32px_-18px_rgba(22,163,74,0.75)] transition-all duration-fast active:scale-[0.98]"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {tNav('products')}
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#home-deals"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors duration-fast"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--color-primary) 16%, var(--color-border))',
                    color: 'var(--color-foreground)',
                    backgroundColor: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {t('seeAllDeals')}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </a>
              </div>

              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {heroHighlights.map((label) => (
                  <span
                    key={label}
                    className="rounded-full px-3 py-1.5 text-xs font-medium"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.75)',
                      color: 'var(--color-muted-foreground)',
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
        )}

        {(() => {
          const blocks = siteConfig?.homepage?.blocks ?? [];
          const enabledBlocks = blocks.filter((b) => b.enabled).sort((a, b) => a.order - b.order);
          if (enabledBlocks.length > 0) {
            return (
              <div className="container-grocery space-y-4 py-4">
                {enabledBlocks.map((block) => (
                  <BlockRenderer key={block.id} block={block} />
                ))}
              </div>
            );
          }
          return null;
        })()}

        {orderedSections.map((sectionId) => {
          switch (sectionId) {
            case 'shopByZone':
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
                  {productsResult.fetching ? (
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
                      {productsForFreshPicks.map((product, index) => (
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
      </div>

      <div className="hidden md:block">
        {siteConfig?.homepage?.hero?.enabled !== false && (
        <section className="py-20 md:py-32" style={{ backgroundColor: 'var(--color-accent)' }} data-testid="desktop-home-hero">
          <div className="container-grocery text-center">
            <div className="mb-6 flex items-center justify-center gap-2">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <Leaf className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
            </div>
            <h1
              className="heading-display mb-5 text-4xl md:text-5xl lg:text-6xl"
              style={{ color: 'var(--color-foreground)' }}
            >
              {t('hero')}
            </h1>
            <p
              className="mx-auto mb-10 max-w-xl text-lg leading-relaxed md:text-xl"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              {t('heroSub')}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl px-8 py-3.5 font-semibold text-white transition-all duration-fast active:scale-95 hover:opacity-90"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {tNav('products')}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
        )}

        {(() => {
          const blocks = siteConfig?.homepage?.blocks ?? [];
          const enabledBlocks = blocks.filter((b) => b.enabled).sort((a, b) => a.order - b.order);
          if (enabledBlocks.length > 0) {
            return (
              <div className="container-grocery space-y-8 py-8 md:py-12">
                {enabledBlocks.map((block) => (
                  <BlockRenderer key={block.id} block={block} />
                ))}
              </div>
            );
          }
          return (
            <section className="container-grocery py-8 md:py-12">
              <PromoBanner />
            </section>
          );
        })()}

        {orderedSections.map((sectionId) => {
          switch (sectionId) {
            case 'shopByZone':
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
                  {productsResult.fetching ? (
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <HomeShelfSkeleton key={index} />
                      ))}
                    </div>
                  ) : productsForDeals.length > 0 ? (
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4" data-testid="desktop-home-deals">
                      {productsForDeals.map((product, index) => (
                        <ProductCard key={product.id} product={product as never} imagePriority={index < 2} />
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
                <section key="freshPicks" className="container-grocery py-16 md:py-20">
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
                  ) : products.length > 0 ? (
                    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                      {products.map((product, index) => (
                        <ProductCard key={product.id} product={product as never} imagePriority={index < 4} />
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
      </div>
    </div>
  );
}
