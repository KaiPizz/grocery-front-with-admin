'use client';

import { useMemo } from 'react';
import { useLocale } from 'next-intl';
import { useQuery } from 'urql';
import { BlockRenderer } from '@/components/blocks/BlockRenderer';
import { isEnglishLocale } from '@/lib/catalog-display-localization';
import { CATEGORIES_QUERY, PRODUCT_COUNTRY_ORIGINS_QUERY } from '@/lib/graphql/operations/grocery';
import { buildCategoryTree, type PublicTaxonomyRawCategory } from '@/lib/public-taxonomy';
import type { HomepageShowcaseConfig, StorefrontConfig } from '@/types/storefront-config';
import { ProductRail } from './ProductRail';
import { ShowcaseHero } from './ShowcaseHero';
import {
  AboutCollapsible,
  BrandChips,
  CategoryRow,
  CuisineCards,
  PickupSteps,
  StoreInfo,
  UspStrip,
  type ShowcaseCategoryTile,
} from './ShowcaseSections';

interface CategoriesResponse {
  categories: { edges: Array<{ node: PublicTaxonomyRawCategory }> } | null;
}

interface CountryOriginsResponse {
  productCountryOrigins: Array<{ value: string; count: number }> | null;
}

/**
 * The curated landing (homepage.showcase): hero with HTML copy, one-line
 * promises, the tree groups, rails, cuisines, how pickup works, the shop.
 */
export function ShowcaseHome({
  config,
  showcase,
  channel,
}: {
  config: StorefrontConfig;
  showcase: HomepageShowcaseConfig;
  channel: string;
}) {
  const locale = useLocale();
  const english = isEnglishLocale(locale);

  const [categoriesResult] = useQuery<CategoriesResponse>({ query: CATEGORIES_QUERY, variables: { channel } });
  const tree = useMemo(() => buildCategoryTree(
    categoriesResult.data?.categories?.edges.map((edge) => edge.node) ?? [],
    locale,
    { requireProductCount: false, includeEmpty: true },
  ), [categoriesResult.data, locale]);
  const treeReady = Boolean(categoriesResult.data) || Boolean(categoriesResult.error);

  // Cuisine cards show a live product count; a backend without the field only loses the count.
  const [originsResult] = useQuery<CountryOriginsResponse>({
    query: PRODUCT_COUNTRY_ORIGINS_QUERY,
    pause: showcase.cuisines.length === 0,
    variables: { channel, first: 50 },
  });
  const countryCounts = useMemo(
    () => new Map((originsResult.data?.productCountryOrigins ?? []).map((row) => [row.value, Number(row.count) || 0])),
    [originsResult.data],
  );

  // Category tiles: the hub items (slug + art) in hub order, named by the live tree.
  const tiles = useMemo<ShowcaseCategoryTile[]>(() => {
    const groups = new Map(tree.map((group) => [group.slug, group]));
    return (config.commercial?.categoryHub?.items ?? [])
      .filter((item) => item.enabled)
      .sort((a, b) => a.order - b.order)
      .flatMap((item) => {
        const group = groups.get(item.categorySlug);
        return group ? [{ slug: group.slug, name: group.name, imageUrl: item.imageUrl }] : [];
      });
  }, [config.commercial?.categoryHub?.items, tree]);

  const heroHeadline = config.homepage.hero?.headline?.trim();
  const rails = showcase.rails.filter((rail) => rail.enabled);
  const [firstRail, secondRail, ...moreRails] = rails;
  const promoBlock = config.homepage.blocks
    .filter((block) => block.enabled && block.type === 'horizontal')
    .sort((a, b) => a.order - b.order)[0];
  const general = config.general;
  const address = general.address?.trim()
    || [general.fulfillment?.pickupAddress?.streetAddress1, general.fulfillment?.pickupAddress?.postalCode, general.fulfillment?.pickupAddress?.city]
      .filter(Boolean)
      .join(', ')
    || null;
  const railProps = { tree, treeReady, channel, english };

  return (
    <div className="pb-24 md:pb-8" data-testid="showcase-home">
      {heroHeadline ? <h1 className="sr-only">{heroHeadline}</h1> : null}
      <ShowcaseHero slides={showcase.heroSlides} english={english} />
      <UspStrip items={config.commercial?.trustRow?.items ?? []} english={english} />
      <CategoryRow tiles={tiles} />
      {firstRail ? <ProductRail rail={firstRail} {...railProps} /> : null}
      <CuisineCards cuisines={showcase.cuisines} counts={countryCounts} />
      <PickupSteps />
      {secondRail ? <ProductRail rail={secondRail} {...railProps} /> : null}
      {promoBlock ? (
        <div className="container-grocery py-2 md:py-4" data-testid="home-configured-promo">
          <BlockRenderer block={promoBlock} />
        </div>
      ) : null}
      {moreRails.map((rail, index) => (
        <ProductRail key={rail.id} rail={rail} cream={index % 2 === 0} {...railProps} />
      ))}
      <BrandChips brands={showcase.brands} />
      <StoreInfo
        store={showcase.store}
        address={address}
        openingHours={general.openingHours ?? []}
        socialLinks={general.socialLinks ?? []}
        storeName={config.branding.storeName}
      />
      <AboutCollapsible seoText={config.homepage.seoText} english={english} />
    </div>
  );
}
