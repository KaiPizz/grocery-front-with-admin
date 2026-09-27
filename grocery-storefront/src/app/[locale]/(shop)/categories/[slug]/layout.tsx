import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { permanentRedirect } from 'next/navigation';

import {
  boundCategoryMetaDescription,
  categorySeoFromTree,
  decodeCategorySlug,
  getCategoryPathForLocale,
  isDbCategoryIndexable,
  resolveCategoryRedirect,
  type CategorySeoCopy,
} from '@/lib/category-seo';
import { resolveChannel } from '@/lib/channel';
import { PUBLIC_CATEGORIES_QUERY } from '@/lib/graphql/operations/grocery';
import { serverGraphqlRequest } from '@/lib/graphql/server-request';
import {
  PUBLIC_CATEGORY_DEFINITIONS,
  findPublicCategory,
  type PublicTaxonomyRawCategory,
} from '@/lib/public-taxonomy';
import {
  buildCollectionPageJsonLd,
  buildPublicPageMetadata,
  fetchSeoStorefrontConfig,
  normalizeSeoLocale,
  serializeJsonLd,
} from '@/lib/seo-metadata';

const CATEGORY_METADATA_REVALIDATE_SECONDS = 300;
// Same tree options as the category page: empty groups and leaves keep their URL.
const TREE_OPTIONS = { requireProductCount: false, includeEmpty: true } as const;

interface CategoryRouteParams {
  locale: string;
  slug: string;
}

interface PublicCategoriesData {
  categories: {
    edges: Array<{ node: PublicTaxonomyRawCategory }>;
  } | null;
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

/** The public category list (cached per channel), or null when the catalog is unreachable. */
async function fetchRawCategories(): Promise<PublicTaxonomyRawCategory[] | null> {
  const channel = resolveChannel(process.env.NEXT_PUBLIC_SALON_SLUG);
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
  if (result.errorMessage || !result.data?.categories) return null;
  return result.data.categories.edges.map((edge) => edge.node);
}

// A renamed or merged slug redirects only once the catalog no longer serves
// it; while the old slug is live (tree not applied yet) the page renders as is.
function redirectIfRetiredCategory(locale: string, slug: string, raw: PublicTaxonomyRawCategory[] | null) {
  const target = resolveCategoryRedirect(slug, raw ? new Set(raw.map((node) => node.slug)) : null);
  if (target) permanentRedirect(getCategoryPathForLocale(locale, target));
}

function resolveCategorySeo(locale: string, slug: string, raw: PublicTaxonomyRawCategory[] | null): CategorySeoCopy {
  const decodedSlug = decodeCategorySlug(slug);
  if (raw) {
    // Tree node: localized name/description, tree-derived count for groups.
    const publicCategory = findPublicCategory(raw, decodedSlug, locale, TREE_OPTIONS);
    if (publicCategory) return categorySeoFromTree(publicCategory);

    // Hidden / out-of-tree category: the catalog row itself.
    const dbCategory = raw.find((node) => node.slug === decodedSlug);
    if (dbCategory) {
      return {
        title: dbCategory.name,
        description: boundCategoryMetaDescription(dbCategory.description ?? null, dbCategory.name),
        robots: isDbCategoryIndexable(dbCategory.products?.totalCount ?? null)
          ? undefined
          : { index: false, follow: true },
      };
    }
  } else {
    // Catalog unreachable: the static group copy still gives the 10 groups a real title.
    const copy = getCategoryCopy(locale, decodedSlug);
    if (copy) return { title: copy.title, description: copy.description, robots: undefined };
  }

  const fallbackTitle = decodedSlug.replace(/[-_]+/g, ' ');
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
  const [siteConfig, raw] = await Promise.all([fetchSeoStorefrontConfig(), fetchRawCategories()]);
  redirectIfRetiredCategory(locale, slug, raw);
  const seoCopy = resolveCategorySeo(locale, slug, raw);

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
  const [siteConfig, raw] = await Promise.all([fetchSeoStorefrontConfig(), fetchRawCategories()]);
  redirectIfRetiredCategory(locale, slug, raw);
  const seoCopy = resolveCategorySeo(locale, slug, raw);
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
