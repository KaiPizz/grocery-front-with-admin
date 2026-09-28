'use client';

import { useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useQuery } from 'urql';
import { MobileProductCard } from '@/components/product/MobileProductCard';
import { ProductCard } from '@/components/product/ProductCard';
import { buildCuisineHref } from '@/lib/cuisines';
import { PRODUCT_LISTING_QUERY } from '@/lib/graphql/operations/grocery';
import { interleaveFeaturedProducts, resolveFeaturedLeaves } from '@/lib/home-featured';
import { pickDiverseProducts } from '@/lib/home-showcase';
import type { PublicCategory } from '@/lib/public-taxonomy';
import type { GroceryProduct } from '@/types';
import type { ShowcaseRail } from '@/types/storefront-config';
import { SectionHeading, ShowcaseSection, showcaseText } from './showcase-ui';

// Over-fetch so one product line (sizes, multipacks) cannot fill the shelf.
const FETCH_FACTOR = 4;
const MAX_FETCH = 48;
const NO_SLUGS: string[] = [];

interface ProductRailProps {
  rail: ShowcaseRail;
  tree: PublicCategory[];
  treeReady: boolean;
  channel: string;
  english: boolean;
  cream?: boolean;
}

export function ProductRail({ rail, tree, treeReady, channel, english, cream = false }: ProductRailProps) {
  const t = useTranslations('home.showcase');
  const scroller = useRef<HTMLUListElement>(null);
  const slugs = rail.source === 'categories' ? rail.values : rail.categories ?? NO_SLUGS;
  const selection = useMemo(() => resolveFeaturedLeaves(tree, slugs, false), [tree, slugs]);
  const filter = rail.source === 'country'
    ? { countryOfOrigin: rail.values, ...(selection.ids.length ? { categories: selection.ids } : {}) }
    : { categories: selection.ids };
  const waitingForTree = slugs.length > 0 && !treeReady;
  // A category rail whose slugs left the tree has nothing honest to show; a country rail falls back to the country alone.
  const orphaned = rail.source === 'categories' && treeReady && selection.ids.length === 0;
  const [result] = useQuery<{ products?: { edges: Array<{ node: GroceryProduct }> } }>({
    query: PRODUCT_LISTING_QUERY,
    pause: waitingForTree || orphaned,
    variables: { channel, first: Math.min(MAX_FETCH, rail.limit * FETCH_FACTOR), filter },
  });

  const products = useMemo(() => {
    const rows = result.data?.products?.edges.map((edge) => edge.node) ?? [];
    const spread = selection.ids.length ? interleaveFeaturedProducts(rows, selection.ids, rows.length) : rows;
    return pickDiverseProducts(spread, rail.limit);
  }, [result.data, selection.ids, rail.limit]);

  if (orphaned) return null;
  const loading = waitingForTree || result.fetching || (!result.data && !result.error);
  if (!loading && products.length < 3) return null;

  const href = rail.href?.trim()
    || (rail.source === 'country' ? buildCuisineHref(rail.values[0] ?? '') : `/categories/${selection.slugs[0] ?? ''}`);
  const scrollBy = (direction: number) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  return (
    <ShowcaseSection cream={cream} testId="showcase-rail" labelledBy={`rail-${rail.id}`}>
      <SectionHeading
        id={`rail-${rail.id}`}
        eyebrow={showcaseText(rail.eyebrow, rail.eyebrowEn, english)}
        title={showcaseText(rail.title, rail.titleEn, english)}
        link={{ href, label: t('seeAll') }}
      />
      <div className="relative">
        <ul
          ref={scroller}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:gap-4 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          data-testid="showcase-rail-list"
        >
          {loading
            ? Array.from({ length: 5 }).map((_, index) => (
              <li key={index} className="w-[44%] min-w-[156px] shrink-0 md:w-[calc((100%-4rem)/5)]">
                <div className="aspect-square rounded-2xl skeleton" />
                <div className="mt-3 h-4 w-3/4 rounded skeleton" />
              </li>
            ))
            : products.map((product, index) => (
              <li key={product.id} className="w-[44%] min-w-[156px] shrink-0 snap-start md:w-[calc((100%-4rem)/5)]" data-testid="showcase-rail-item">
                <div className="md:hidden">
                  <MobileProductCard product={product} imagePriority={false} testId="showcase-rail-card" />
                </div>
                <div className="hidden h-full md:block">
                  <ProductCard product={product} imagePriority={index < 2} showCatalogFacts actionVisibility="always" />
                </div>
              </li>
            ))}
        </ul>
        {!loading && products.length > 5 ? (
          <>
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label={t('scrollBack')}
              className="absolute -left-5 top-[38%] hidden h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm md:flex"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label={t('scrollForward')}
              className="absolute -right-5 top-[38%] hidden h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm md:flex"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
    </ShowcaseSection>
  );
}
