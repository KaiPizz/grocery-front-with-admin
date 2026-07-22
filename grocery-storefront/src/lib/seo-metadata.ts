import type { Metadata } from 'next';
import { cache } from 'react';

import { defaultLocale } from '@/i18n/config';
import { fetchServerConfig, getConfigString } from '@/lib/storefront-config';
import type { StorefrontConfig } from '@/types/storefront-config';

export type StorefrontSeoLocale = 'pl' | 'en';

export type PublicSeoRoute =
  | 'products'
  | 'categories'
  | 'recipes'
  | 'privacy'
  | 'terms';

const DEFAULT_STORE_NAME = 'Asia Deli Go';
const DEFAULT_OG_IMAGE_PATH = '/brand/hero/asia-deli-go-hero-01.webp';

export const fetchSeoStorefrontConfig = cache(async () => fetchServerConfig());

export const privateRouteMetadata = {
  robots: { index: false, follow: false },
  alternates: null,
  openGraph: null,
  twitter: null,
} satisfies Metadata;

const PUBLIC_ROUTE_COPY: Record<
  StorefrontSeoLocale,
  Record<PublicSeoRoute, { title: string; description: string }>
> = {
  pl: {
    products: {
      title: 'Azjatyckie produkty spożywcze',
      description: 'Przeglądaj kimchi, makarony, ryż, sosy, napoje, przekąski i dania gotowe dostępne w {storeName}.',
    },
    categories: {
      title: 'Kategorie produktów azjatyckich',
      description: 'Znajdź produkty azjatyckie według kategorii: od kimchi i makaronów po sosy, napoje, przekąski i akcesoria kuchenne.',
    },
    recipes: {
      title: 'Przepisy kuchni azjatyckiej',
      description: 'Odkryj przepisy kuchni azjatyckiej i znajdź składniki potrzebne do ich przygotowania.',
    },
    privacy: {
      title: 'Polityka prywatności',
      description: 'Dowiedz się, jak {storeName} przetwarza i chroni dane użytkowników sklepu internetowego.',
    },
    terms: {
      title: 'Regulamin sklepu',
      description: 'Zapoznaj się z zasadami korzystania ze sklepu internetowego {storeName}.',
    },
  },
  en: {
    products: {
      title: 'Asian groceries',
      description: 'Browse kimchi, noodles, rice, sauces, drinks, snacks, and ready meals available from {storeName}.',
    },
    categories: {
      title: 'Asian grocery categories',
      description: 'Find Asian groceries by category, from kimchi and noodles to sauces, drinks, snacks, and kitchen accessories.',
    },
    recipes: {
      title: 'Asian recipes',
      description: 'Discover Asian recipes and find the ingredients you need to prepare them.',
    },
    privacy: {
      title: 'Privacy policy',
      description: 'Learn how {storeName} processes and protects storefront user data.',
    },
    terms: {
      title: 'Store terms',
      description: 'Read the terms for using the {storeName} online storefront.',
    },
  },
};

function normalizePathname(pathname: string): string {
  const trimmed = pathname.trim();
  if (!trimmed || trimmed === '/') return '';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
}

function toAbsoluteUrl(value: string | undefined, origin: string | null): string | undefined {
  if (!value) return undefined;

  try {
    return new URL(value, origin ? `${origin}/` : undefined).toString();
  } catch {
    return undefined;
  }
}

export function normalizeSeoLocale(locale: string): StorefrontSeoLocale {
  return locale.toLowerCase().startsWith('en') ? 'en' : defaultLocale;
}

export function getSeoOrigin(configuredCanonical: string | null | undefined): string | null {
  const canonical = getConfigString(configuredCanonical);
  if (!canonical) return null;

  try {
    const url = new URL(canonical);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function getLocalizedSeoUrl(
  origin: string | null,
  locale: string,
  pathname: string,
): string | undefined {
  if (!origin) return undefined;

  const normalizedLocale = normalizeSeoLocale(locale);
  const localizedPath = `${normalizedLocale === defaultLocale ? '' : `/${normalizedLocale}`}${normalizePathname(pathname)}` || '/';
  return new URL(localizedPath, `${origin}/`).toString();
}

export function getLocalizedSeoAlternates(
  origin: string | null,
  locale: string,
  pathname: string,
): Metadata['alternates'] {
  const canonical = getLocalizedSeoUrl(origin, locale, pathname);
  const polish = getLocalizedSeoUrl(origin, 'pl', pathname);
  const english = getLocalizedSeoUrl(origin, 'en', pathname);

  if (!canonical || !polish || !english) return undefined;

  return {
    canonical,
    languages: {
      pl: polish,
      en: english,
      'x-default': polish,
    },
  };
}

export function getPublicRouteSeoCopy(locale: string, route: PublicSeoRoute) {
  return PUBLIC_ROUTE_COPY[normalizeSeoLocale(locale)][route];
}

export async function getConfiguredPublicRouteMetadata(
  locale: string,
  route: PublicSeoRoute,
  pathname: string,
): Promise<Metadata> {
  const siteConfig = await fetchSeoStorefrontConfig();
  const copy = getPublicRouteSeoCopy(locale, route);
  const storeName = getConfigString(siteConfig?.branding.storeName) ?? DEFAULT_STORE_NAME;

  return buildPublicPageMetadata({
    locale,
    pathname,
    title: copy.title,
    description: copy.description.replaceAll('{storeName}', storeName),
    siteConfig,
  });
}

interface PublicPageMetadataInput {
  locale: string;
  pathname: string;
  title: string;
  description: string;
  siteConfig: StorefrontConfig | null;
  appendStoreName?: boolean;
  imageUrl?: string | null;
  robots?: Metadata['robots'];
}

export function buildPublicPageMetadata({
  locale,
  pathname,
  title,
  description,
  siteConfig,
  appendStoreName = true,
  imageUrl,
  robots,
}: PublicPageMetadataInput): Metadata {
  const normalizedLocale = normalizeSeoLocale(locale);
  const origin = getSeoOrigin(siteConfig?.seo.canonical);
  const storeName = getConfigString(siteConfig?.branding.storeName) ?? DEFAULT_STORE_NAME;
  const pageTitle = appendStoreName && !title.toLocaleLowerCase().includes(storeName.toLocaleLowerCase())
    ? `${title} | ${storeName}`
    : title;
  const canonical = getLocalizedSeoUrl(origin, normalizedLocale, pathname);
  const configuredImage = getConfigString(imageUrl ?? siteConfig?.seo.ogImageUrl);
  const openGraphImage = toAbsoluteUrl(configuredImage ?? DEFAULT_OG_IMAGE_PATH, origin);
  const images = openGraphImage
    ? [{ url: openGraphImage, alt: pageTitle }]
    : undefined;

  return {
    title: pageTitle,
    description,
    alternates: getLocalizedSeoAlternates(origin, normalizedLocale, pathname),
    robots,
    openGraph: {
      type: 'website',
      title: pageTitle,
      description,
      siteName: storeName,
      locale: normalizedLocale === 'pl' ? 'pl_PL' : 'en_US',
      alternateLocale: normalizedLocale === 'pl' ? ['en_US'] : ['pl_PL'],
      url: canonical,
      images,
    },
    twitter: {
      card: openGraphImage ? 'summary_large_image' : 'summary',
      title: pageTitle,
      description,
      images: openGraphImage ? [openGraphImage] : undefined,
    },
  };
}

interface WebsiteJsonLdInput {
  siteConfig: StorefrontConfig | null;
}

export function buildWebsiteJsonLd({ siteConfig }: WebsiteJsonLdInput) {
  const origin = getSeoOrigin(siteConfig?.seo.canonical);
  if (!origin) return null;

  const storeName = getConfigString(siteConfig?.branding.storeName) ?? DEFAULT_STORE_NAME;
  const logo = toAbsoluteUrl(getConfigString(siteConfig?.branding.logoUrl), origin);
  const organizationId = `${origin}/#organization`;
  const websiteId = `${origin}/#website`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': organizationId,
        name: storeName,
        url: origin,
        logo,
      },
      {
        '@type': 'WebSite',
        '@id': websiteId,
        name: storeName,
        url: origin,
        publisher: { '@id': organizationId },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${origin}/products?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };
}

export function buildCollectionPageJsonLd({
  locale,
  pathname,
  title,
  description,
  siteConfig,
}: Omit<PublicPageMetadataInput, 'appendStoreName' | 'imageUrl' | 'robots'>) {
  const origin = getSeoOrigin(siteConfig?.seo.canonical);
  const url = getLocalizedSeoUrl(origin, locale, pathname);
  if (!url) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url,
    inLanguage: normalizeSeoLocale(locale),
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
