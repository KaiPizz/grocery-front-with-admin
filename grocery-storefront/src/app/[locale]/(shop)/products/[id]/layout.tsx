import type { Metadata } from 'next';
import { cache, type ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { defaultLocale } from '@/i18n/config';
import { resolveChannel } from '@/lib/channel';
import { PRODUCT_BY_SLUG_QUERY } from '@/lib/graphql/operations/grocery';
import { serverGraphqlRequest } from '@/lib/graphql/server-request';
import { fetchServerConfig, getConfigString } from '@/lib/storefront-config';
import { normalizeImageUrl } from '@/lib/utils';

interface ProductSeoTranslation {
  language?: string | null;
  name?: string | null;
  description?: string | null;
  shortDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

interface ProductSeoMoney {
  amount?: number | null;
  currency?: string | null;
}

interface ProductSeoData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  translation?: ProductSeoTranslation | null;
  thumbnail?: { url?: string | null; alt?: string | null } | null;
  media?: Array<{
    url?: string | null;
    type?: string | null;
    sortOrder?: number | null;
  }> | null;
  category?: { name?: string | null } | null;
  pricing?: {
    priceRange?: { start?: { gross?: ProductSeoMoney | null } | null } | null;
  } | null;
  variants?: Array<{
    sku?: string | null;
    quantityAvailable?: number | null;
    pricing?: { price?: { gross?: ProductSeoMoney | null } | null } | null;
  }> | null;
}

interface ProductQueryData {
  product: ProductSeoData | null;
}

interface ProductRouteParams {
  locale: string;
  id: string;
}

const getProductForSeo = cache(async (slug: string): Promise<ProductSeoData | null> => {
  const result = await serverGraphqlRequest<ProductQueryData>(
    PRODUCT_BY_SLUG_QUERY,
    { channel: resolveChannel(), slug },
  );

  return result.errorMessage ? null : result.data?.product ?? null;
});

function cleanText(value: string | null | undefined): string | undefined {
  const cleaned = value?.replace(/\s+/g, ' ').trim();
  return cleaned || undefined;
}

function getProductName(product: ProductSeoData, locale: string): string {
  const translation = product.translation;
  if (!locale.toLowerCase().startsWith('en') || translation?.language?.toLowerCase() !== 'en') {
    return product.name;
  }

  return cleanText(translation.name) ?? product.name;
}

function getProductSeoTitle(product: ProductSeoData, locale: string): string {
  const translation = product.translation;
  if (locale.toLowerCase().startsWith('en') && translation?.language?.toLowerCase() === 'en') {
    return cleanText(translation.seoTitle)
      ?? cleanText(translation.name)
      ?? cleanText(product.seoTitle)
      ?? product.name;
  }

  return cleanText(product.seoTitle) ?? product.name;
}

function getProductDescription(product: ProductSeoData, locale: string): string | undefined {
  const translation = product.translation;
  if (!locale.toLowerCase().startsWith('en') || translation?.language?.toLowerCase() !== 'en') {
    return cleanText(product.description);
  }

  return cleanText(translation.description)
    ?? cleanText(translation.shortDescription)
    ?? cleanText(product.description);
}

function getProductSeoDescription(product: ProductSeoData, locale: string): string | undefined {
  const translation = product.translation;
  if (locale.toLowerCase().startsWith('en') && translation?.language?.toLowerCase() === 'en') {
    return cleanText(translation.seoDescription)
      ?? cleanText(translation.description)
      ?? cleanText(translation.shortDescription)
      ?? cleanText(product.seoDescription)
      ?? cleanText(product.description);
  }

  return cleanText(product.seoDescription) ?? cleanText(product.description);
}

function getStoreOrigin(configuredCanonical: string | undefined): string | null {
  if (!configuredCanonical) return null;

  try {
    return new URL(configuredCanonical).origin;
  } catch {
    return null;
  }
}

function getProductUrl(origin: string | null, locale: string, slug: string): string | undefined {
  if (!origin) return undefined;

  const normalizedLocale = locale.toLowerCase();
  const localeSegment = normalizedLocale === defaultLocale
    ? ''
    : `/${encodeURIComponent(normalizedLocale)}`;
  const slugSegment = encodeURIComponent(slug);
  return `${origin}${localeSegment}/products/${slugSegment}`;
}

function getAbsoluteImageUrls(product: ProductSeoData, origin: string | null): string[] {
  const candidates = [
    ...(product.media ?? [])
      .filter((media) => !media.type || media.type.toUpperCase() === 'IMAGE')
      .sort((left, right) => (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER))
      .map((media) => media.url),
    product.thumbnail?.url,
  ];
  const images = new Set<string>();

  for (const candidate of candidates) {
    const normalized = normalizeImageUrl(candidate);
    if (!normalized) continue;

    try {
      images.add(new URL(normalized, origin ?? undefined).toString());
    } catch {
      // Structured data requires absolute image URLs.
    }
  }

  return [...images];
}

function buildProductJsonLd(
  product: ProductSeoData,
  locale: string,
  origin: string | null,
  storeName: string,
) {
  const variant = product.variants?.[0];
  const price = variant?.pricing?.price?.gross ?? product.pricing?.priceRange?.start?.gross;
  const productUrl = getProductUrl(origin, locale, product.slug);
  const images = getAbsoluteImageUrls(product, origin);
  const name = getProductName(product, locale);
  const description = getProductDescription(product, locale);
  const sku = cleanText(variant?.sku);
  const hasPrice = typeof price?.amount === 'number' && price.amount > 0;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image: images.length > 0 ? images : undefined,
    sku,
    category: cleanText(product.category?.name),
    url: productUrl,
    offers: hasPrice
      ? {
        '@type': 'Offer',
        url: productUrl,
        price: price.amount?.toFixed(2),
        priceCurrency: price.currency || 'PLN',
        availability: (variant?.quantityAvailable ?? 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: storeName,
        },
      }
      : undefined,
  };
}

function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export async function generateMetadata({ params }: { params: ProductRouteParams }): Promise<Metadata> {
  const [product, siteConfig] = await Promise.all([
    getProductForSeo(params.id),
    fetchServerConfig(),
  ]);

  if (!product) {
    return {
      robots: { index: false, follow: false },
    };
  }

  const configuredCanonical = getConfigString(siteConfig?.seo?.canonical);
  const origin = getStoreOrigin(configuredCanonical);
  const canonical = getProductUrl(origin, params.locale, product.slug);
  const name = getProductSeoTitle(product, params.locale);
  const description = getProductSeoDescription(product, params.locale)
    ?? getConfigString(siteConfig?.seo?.defaultDescription);
  const images = getAbsoluteImageUrls(product, origin);

  return {
    title: name,
    description,
    alternates: canonical
      ? {
        canonical,
        languages: {
          en: getProductUrl(origin, 'en', product.slug)!,
          pl: getProductUrl(origin, 'pl', product.slug)!,
        },
      }
      : undefined,
    openGraph: {
      type: 'website',
      title: name,
      description,
      url: canonical,
      images: images.length > 0
        ? images.map((url) => ({ url, alt: name }))
        : undefined,
    },
    twitter: {
      card: images.length > 0 ? 'summary_large_image' : 'summary',
      title: name,
      description,
      images: images.length > 0 ? images : undefined,
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: ProductRouteParams;
}) {
  const [product, siteConfig] = await Promise.all([
    getProductForSeo(params.id),
    fetchServerConfig(),
  ]);

  if (!product) notFound();

  const origin = getStoreOrigin(getConfigString(siteConfig?.seo?.canonical));
  const storeName = getConfigString(siteConfig?.branding?.storeName) ?? 'Grocery Store';
  const productJsonLd = buildProductJsonLd(product, params.locale, origin, storeName);

  return (
    <>
      <script
        id="product-json-ld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
      />
      {children}
    </>
  );
}
