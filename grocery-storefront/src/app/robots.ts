import type { MetadataRoute } from 'next';
import { getStorefrontOriginForSeo, getStorefrontUrl } from '@/lib/seo-discovery';

export const revalidate = 3600;

const PRIVATE_ROUTE_SEGMENTS = [
  'account',
  'cart',
  'checkout',
  'forgot-password',
  'login',
  'register',
  'reset-password',
  'verify-email',
  'wishlist',
];

const DISALLOWED_PATHS = [
  '/api/',
  ...['', '/en', '/pl'].flatMap((localePrefix) => (
    PRIVATE_ROUTE_SEGMENTS.map((segment) => `${localePrefix}/${segment}`)
  )),
];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getStorefrontOriginForSeo();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: DISALLOWED_PATHS,
    },
    sitemap: origin ? getStorefrontUrl(origin, '/sitemap.xml') : undefined,
    host: origin ?? undefined,
  };
}
