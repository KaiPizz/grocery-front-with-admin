import type { MetadataRoute } from 'next';
import { getStorefrontOriginForSeo, getStorefrontUrl } from '@/lib/seo-discovery';

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await getStorefrontOriginForSeo();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/api/',
    },
    sitemap: origin ? getStorefrontUrl(origin, '/sitemap.xml') : undefined,
    host: origin ?? undefined,
  };
}
