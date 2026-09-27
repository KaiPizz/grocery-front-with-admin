import type { MetadataRoute } from 'next';
import { CATEGORY_MIN_PRODUCTS_FOR_INDEX } from '@/lib/category-seo';
import { collectCategorySitemapPaths, type CategorySitemapPath } from '@/lib/category-sitemap';
import { resolveChannel } from '@/lib/channel';
import { getEnabledCommercialCollections } from '@/lib/commercial-config';
import { PUBLIC_CATEGORIES_QUERY } from '@/lib/graphql/operations/grocery';
import { serverGraphqlRequest } from '@/lib/graphql/server-request';
import { buildCategoryTree, type PublicTaxonomyRawCategory } from '@/lib/public-taxonomy';
import { getStorefrontOriginForSeo, getStorefrontUrl } from '@/lib/seo-discovery';
import { fetchServerConfig } from '@/lib/storefront-config';

export const revalidate = 3600;

const PRODUCT_PAGE_SIZE = 100;
const MAX_PRODUCT_PAGES = 240;

// This deliberately uses the established listing operation name while asking
// only for sitemap fields. It keeps this read compatible with storefront
// GraphQL allowlists without transferring full product-card payloads.
const SITEMAP_PRODUCTS_QUERY = `
  query GroceryProductListingSitemap($channel: String!, $first: Int!, $after: String) {
    products(channel: $channel, first: $first, after: $after) {
      edges {
        node { slug }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface SitemapProductsData {
  products?: {
    edges?: Array<{
      node?: {
        slug?: string | null;
      } | null;
    } | null> | null;
    pageInfo?: {
      hasNextPage?: boolean | null;
      endCursor?: string | null;
    } | null;
  } | null;
}

interface SitemapProductsResult {
  data: SitemapProductsData | null;
  errorMessage: string | null;
}

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>;

function localizedPath(localePrefix: '' | '/en', pathname: string): string {
  if (!localePrefix) return pathname || '/';
  return pathname ? `${localePrefix}${pathname}` : localePrefix;
}

function sitemapEntry(
  origin: string,
  pathname: string,
  changeFrequency: ChangeFrequency,
  priority: number,
): MetadataRoute.Sitemap[number] {
  return {
    url: getStorefrontUrl(origin, pathname),
    changeFrequency,
    priority,
  };
}

async function getProductSlugs(): Promise<string[]> {
  const channel = resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG);
  const slugs = new Set<string>();
  let after: string | null = null;

  for (let page = 0; page < MAX_PRODUCT_PAGES; page += 1) {
    const result: SitemapProductsResult = await serverGraphqlRequest<SitemapProductsData>(
      SITEMAP_PRODUCTS_QUERY,
      {
        channel,
        first: PRODUCT_PAGE_SIZE,
        after,
      },
      { next: { revalidate: 3600 } },
    );
    const connection: SitemapProductsData['products'] = result.data?.products;

    if (result.errorMessage || !connection) return [];

    for (const edge of connection.edges ?? []) {
      const slug = edge?.node?.slug?.trim();
      if (slug) slugs.add(slug);
    }

    if (!connection.pageInfo?.hasNextPage) break;

    const nextCursor: string | undefined = connection.pageInfo.endCursor?.trim();
    if (!nextCursor || nextCursor === after) return [];
    after = nextCursor;
  }

  return [...slugs];
}

interface SitemapCategoriesData {
  categories?: {
    edges?: Array<{
      node?: PublicTaxonomyRawCategory | null;
    } | null> | null;
  } | null;
}

// The category tree decides what is listed: every group, and the leaves that
// hold enough products to be indexable (the category layout mirrors this rule).
async function getCategorySitemapPaths(): Promise<CategorySitemapPath[]> {
  const channel = resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG);
  const result = await serverGraphqlRequest<SitemapCategoriesData>(
    PUBLIC_CATEGORIES_QUERY,
    { channel },
    { next: { revalidate: 3600 } },
  );
  if (result.errorMessage) return [];

  const nodes = (result.data?.categories?.edges ?? [])
    .map((edge) => edge?.node)
    .filter((node): node is PublicTaxonomyRawCategory => Boolean(node?.id && node?.slug && node?.name));
  const groups = buildCategoryTree(nodes, 'pl', { requireProductCount: false, includeEmpty: true });
  return collectCategorySitemapPaths(groups, CATEGORY_MIN_PRODUCTS_FOR_INDEX);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [origin, siteConfig, productSlugs, categoryPaths] = await Promise.all([
    getStorefrontOriginForSeo(),
    fetchServerConfig({ next: { revalidate } }),
    getProductSlugs(),
    getCategorySitemapPaths(),
  ]);
  if (!origin) return [];

  const collectionSlugs = new Set(
    getEnabledCommercialCollections(siteConfig)
      .map((collection) => collection.slug.trim())
      .filter(Boolean),
  );
  const entries: MetadataRoute.Sitemap = [];

  for (const localePrefix of ['', '/en'] as const) {
    entries.push(
      sitemapEntry(origin, localizedPath(localePrefix, ''), 'daily', 1),
      sitemapEntry(origin, localizedPath(localePrefix, '/products'), 'daily', 0.9),
      sitemapEntry(origin, localizedPath(localePrefix, '/categories'), 'weekly', 0.8),
      sitemapEntry(origin, localizedPath(localePrefix, '/privacy'), 'yearly', 0.3),
      sitemapEntry(origin, localizedPath(localePrefix, '/terms'), 'yearly', 0.3),
    );

    for (const entry of categoryPaths) {
      entries.push(sitemapEntry(origin, localizedPath(localePrefix, entry.path), 'weekly', entry.priority));
    }

    for (const slug of collectionSlugs) {
      entries.push(sitemapEntry(
        origin,
        localizedPath(localePrefix, `/collections/${encodeURIComponent(slug)}`),
        'weekly',
        0.7,
      ));
    }

    for (const slug of productSlugs) {
      entries.push(sitemapEntry(
        origin,
        localizedPath(localePrefix, `/products/${encodeURIComponent(slug)}`),
        'weekly',
        0.7,
      ));
    }
  }

  return entries;
}
