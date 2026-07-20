import type { MetadataRoute } from 'next';
import { resolveChannel } from '@/lib/channel';
import { serverGraphqlRequest } from '@/lib/graphql/server-request';
import { PUBLIC_CATEGORY_DEFINITIONS } from '@/lib/public-taxonomy';
import { getStorefrontOriginForSeo, getStorefrontUrl } from '@/lib/seo-discovery';

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await getStorefrontOriginForSeo();
  if (!origin) return [];

  const productSlugs = await getProductSlugs();
  const entries: MetadataRoute.Sitemap = [];

  for (const localePrefix of ['', '/en'] as const) {
    entries.push(
      sitemapEntry(origin, localizedPath(localePrefix, ''), 'daily', 1),
      sitemapEntry(origin, localizedPath(localePrefix, '/products'), 'daily', 0.9),
      sitemapEntry(origin, localizedPath(localePrefix, '/categories'), 'weekly', 0.8),
      sitemapEntry(origin, localizedPath(localePrefix, '/privacy'), 'yearly', 0.3),
      sitemapEntry(origin, localizedPath(localePrefix, '/terms'), 'yearly', 0.3),
    );

    for (const category of PUBLIC_CATEGORY_DEFINITIONS) {
      entries.push(sitemapEntry(
        origin,
        localizedPath(localePrefix, `/categories/${encodeURIComponent(category.slug)}`),
        'weekly',
        0.8,
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
