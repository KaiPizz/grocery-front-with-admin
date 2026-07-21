import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { findCommercialCollection } from '@/lib/commercial-config';
import { localizeConfiguredStorefront } from '@/lib/configured-content-localization';
import {
  buildCollectionPageJsonLd,
  buildPublicPageMetadata,
  fetchSeoStorefrontConfig,
  normalizeSeoLocale,
  serializeJsonLd,
} from '@/lib/seo-metadata';

interface CollectionRouteParams {
  locale: string;
  slug: string;
}

function getCollectionPath(slug: string) {
  return `/collections/${encodeURIComponent(slug)}`;
}

function getCollectionFallbackDescription(locale: string, title: string) {
  return normalizeSeoLocale(locale) === 'pl'
    ? `Przeglądaj kolekcję ${title} w Asia Deli Go.`
    : `Browse the ${title} collection at Asia Deli Go.`;
}

async function getCollectionSeoData(locale: string, slug: string) {
  const siteConfig = await fetchSeoStorefrontConfig();
  const localizedConfig = localizeConfiguredStorefront(siteConfig, locale);
  const collection = findCommercialCollection(localizedConfig, slug);

  return { siteConfig, collection };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<CollectionRouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const { siteConfig, collection } = await getCollectionSeoData(locale, slug);

  if (!collection) {
    return { robots: { index: false, follow: false } };
  }

  return buildPublicPageMetadata({
    locale,
    pathname: getCollectionPath(slug),
    title: collection.title,
    description: collection.subtitle ?? getCollectionFallbackDescription(locale, collection.title),
    imageUrl: collection.heroImageUrl,
    siteConfig,
  });
}

export default async function CollectionDetailLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<CollectionRouteParams>;
}) {
  const { locale, slug } = await params;
  const { siteConfig, collection } = await getCollectionSeoData(locale, slug);
  const jsonLd = collection
    ? buildCollectionPageJsonLd({
      locale,
      pathname: getCollectionPath(slug),
      title: collection.title,
      description: collection.subtitle ?? getCollectionFallbackDescription(locale, collection.title),
      siteConfig,
    })
    : null;

  return (
    <>
      {jsonLd && (
        <script
          id="collection-json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
