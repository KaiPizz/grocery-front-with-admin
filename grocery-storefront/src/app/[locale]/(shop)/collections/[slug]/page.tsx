import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CommercialLanding } from '@/components/commercial/CommercialLanding';
import { defaultLocale } from '@/i18n/config';
import { findCommercialCollection } from '@/lib/commercial-config';
import { localizeConfiguredStorefront } from '@/lib/configured-content-localization';
import { getStorefrontOriginForSeo } from '@/lib/seo-discovery';
import { fetchServerConfig, getConfigString } from '@/lib/storefront-config';
import { normalizeImageUrl } from '@/lib/utils';
import type { CommercialCollection } from '@/types/storefront-config';

interface CollectionPageProps {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}

function getCollectionUrl(origin: string | null, locale: string, slug: string): string | undefined {
  if (!origin) return undefined;

  const localeSegment = locale.toLowerCase() === defaultLocale
    ? ''
    : `/${encodeURIComponent(locale.toLowerCase())}`;

  return `${origin}${localeSegment}/collections/${encodeURIComponent(slug)}`;
}

function getCollectionTitle(collection: CommercialCollection, storeName: string | undefined): string {
  const title = collection.title.trim();
  if (!storeName || title.toLocaleLowerCase().includes(storeName.toLocaleLowerCase())) {
    return title;
  }

  return `${title} | ${storeName}`;
}

function getAbsoluteImageUrl(
  imageUrl: string | null | undefined,
  origin: string | null,
): string | undefined {
  const normalized = normalizeImageUrl(imageUrl);
  if (!normalized) return undefined;

  try {
    return new URL(normalized, origin ? `${origin}/` : undefined).toString();
  } catch {
    return undefined;
  }
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const [rawConfig, origin] = await Promise.all([
    fetchServerConfig(),
    getStorefrontOriginForSeo(),
  ]);
  const siteConfig = localizeConfiguredStorefront(rawConfig, locale);
  const collection = findCommercialCollection(siteConfig, slug);

  if (!collection) {
    return {
      robots: { index: false, follow: false },
    };
  }

  const canonical = getCollectionUrl(origin, locale, collection.slug);
  const title = getCollectionTitle(
    collection,
    getConfigString(siteConfig?.branding.storeName),
  );
  const description = getConfigString(collection.subtitle)
    ?? getConfigString(siteConfig?.seo.defaultDescription);
  const imageUrl = getAbsoluteImageUrl(
    collection.heroImageUrl ?? siteConfig?.seo.ogImageUrl,
    origin,
  );

  return {
    title,
    description,
    alternates: canonical
      ? {
        canonical,
        languages: {
          pl: getCollectionUrl(origin, 'pl', collection.slug)!,
          en: getCollectionUrl(origin, 'en', collection.slug)!,
        },
      }
      : undefined,
    openGraph: {
      type: 'website',
      title,
      description,
      url: canonical,
      images: imageUrl ? [{ url: imageUrl, alt: collection.title }] : undefined,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const [{ slug, locale }, rawConfig] = await Promise.all([
    params,
    fetchServerConfig(),
  ]);
  const siteConfig = localizeConfiguredStorefront(rawConfig, locale);
  const collection = findCommercialCollection(siteConfig, slug);

  if (!collection) {
    notFound();
  }

  return <CommercialLanding collection={collection} />;
}
