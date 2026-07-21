import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { PUBLIC_CATEGORY_DEFINITIONS } from '@/lib/public-taxonomy';
import {
  buildCollectionPageJsonLd,
  buildPublicPageMetadata,
  fetchSeoStorefrontConfig,
  normalizeSeoLocale,
  serializeJsonLd,
} from '@/lib/seo-metadata';

interface CategoryRouteParams {
  locale: string;
  slug: string;
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

export async function generateMetadata({
  params,
}: {
  params: Promise<CategoryRouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const siteConfig = await fetchSeoStorefrontConfig();
  const copy = getCategoryCopy(locale, slug);

  if (!copy) {
    let fallbackTitle = slug;
    try {
      fallbackTitle = decodeURIComponent(slug);
    } catch {
      // Keep the route value; malformed escapes must not break metadata rendering.
    }
    fallbackTitle = fallbackTitle.replace(/[-_]+/g, ' ');
    return buildPublicPageMetadata({
      locale,
      pathname: getCategoryPath(slug),
      title: fallbackTitle,
      description: fallbackTitle,
      siteConfig,
      robots: { index: false, follow: false },
    });
  }

  return buildPublicPageMetadata({
    locale,
    pathname: getCategoryPath(slug),
    title: copy.title,
    description: copy.description,
    siteConfig,
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
  const siteConfig = await fetchSeoStorefrontConfig();
  const copy = getCategoryCopy(locale, slug);
  const jsonLd = copy
    ? buildCollectionPageJsonLd({
      locale,
      pathname: getCategoryPath(slug),
      title: copy.title,
      description: copy.description,
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
