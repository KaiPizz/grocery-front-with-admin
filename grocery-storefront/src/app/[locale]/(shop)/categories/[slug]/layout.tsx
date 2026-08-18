import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { permanentRedirect } from 'next/navigation';

import {
  boundCategoryMetaDescription,
  decodeCategorySlug,
  getCategoryPathForLocale,
  isDbCategoryIndexable,
  resolveMergedCategoryTarget,
} from '@/lib/category-seo';
import { resolveChannel } from '@/lib/channel';
import { PUBLIC_CATEGORIES_QUERY } from '@/lib/graphql/operations/grocery';
import { serverGraphqlRequest } from '@/lib/graphql/server-request';
import { PUBLIC_CATEGORY_DEFINITIONS } from '@/lib/public-taxonomy';
import {
  buildCollectionPageJsonLd,
  buildPublicPageMetadata,
  fetchSeoStorefrontConfig,
  normalizeSeoLocale,
  serializeJsonLd,
} from '@/lib/seo-metadata';

const CATEGORY_METADATA_REVALIDATE_SECONDS = 300;

interface CategoryRouteParams {
  locale: string;
  slug: string;
}

interface DbCategoryNode {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  products?: {
    totalCount: number;
  } | null;
}

interface PublicCategoriesData {
  categories: {
    edges: Array<{ node: DbCategoryNode }>;
  } | null;
}

interface CategorySeoCopy {
  title: string;
  description: string;
  robots: Metadata['robots'];
}

function getCategoryCopy(locale: string, slug: string) {
  const definition = PUBLIC_CATEGORY_DEFINITIONS.find((category) => category.slug === slug);
  if (!definition) return null;

  const normalizedLocale = normalizeSeoLocale(locale);
  return {
    title: definition.names[normalizedLocale],
    description: definition.descriptions[normalizedLocale],
  };
}

function getCategoryPath(slug: string) {
  return `/categories/${encodeURIComponent(slug)}`;
}

function redirectIfMergedCategory(locale: string, slug: string) {
  const target = resolveMergedCategoryTarget(slug);
  if (target) permanentRedirect(getCategoryPathForLocale(locale, target));
}

async function fetchDbCategory(slug: string): Promise<DbCategoryNode | null> {
  const channel = resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG);
  const decodedSlug = decodeCategorySlug(slug);
  const result = await serverGraphqlRequest<PublicCategoriesData>(
    PUBLIC_CATEGORIES_QUERY,
    { channel },
    {
      next: {
        revalidate: CATEGORY_METADATA_REVALIDATE_SECONDS,
        tags: [`${channel}:public-categories`],
      },
    },
  );
  const nodes = result.data?.categories?.edges.map((edge) => edge.node) ?? [];
  return nodes.find((node) => node.slug === decodedSlug) ?? null;
}

async function resolveCategorySeo(locale: string, slug: string): Promise<CategorySeoCopy> {
  const copy = getCategoryCopy(locale, slug);
  if (copy) {
    return { title: copy.title, description: copy.description, robots: undefined };
  }

  const dbCategory = await fetchDbCategory(slug);
  if (dbCategory) {
    return {
      title: dbCategory.name,
      description: boundCategoryMetaDescription(dbCategory.description, dbCategory.name),
      robots: isDbCategoryIndexable(dbCategory.products?.totalCount ?? null)
        ? undefined
        : { index: false, follow: true },
    };
  }

  const fallbackTitle = decodeCategorySlug(slug).replace(/[-_]+/g, ' ');
  return {
    title: fallbackTitle,
    description: fallbackTitle,
    robots: { index: false, follow: false },
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<CategoryRouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  redirectIfMergedCategory(locale, slug);

  const [siteConfig, seoCopy] = await Promise.all([
    fetchSeoStorefrontConfig(),
    resolveCategorySeo(locale, slug),
  ]);

  return buildPublicPageMetadata({
    locale,
    pathname: getCategoryPath(slug),
    title: seoCopy.title,
    description: seoCopy.description,
    siteConfig,
    robots: seoCopy.robots,
  });
}

export default async function CategoryDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<CategoryRouteParams>;
}) {
  const { locale, slug } = await params;
  redirectIfMergedCategory(locale, slug);

  const [siteConfig, seoCopy] = await Promise.all([
    fetchSeoStorefrontConfig(),
    resolveCategorySeo(locale, slug),
  ]);
  const jsonLd = seoCopy.robots === undefined
    ? buildCollectionPageJsonLd({
      locale,
      pathname: getCategoryPath(slug),
      title: seoCopy.title,
      description: seoCopy.description,
      siteConfig,
    })
    : null;

  return (
    <>
      {jsonLd && (
        <script
          id="category-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
