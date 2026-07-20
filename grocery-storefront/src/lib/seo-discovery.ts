import { fetchServerConfig, getConfigString } from '@/lib/storefront-config';

const SEO_CONFIG_REVALIDATE_SECONDS = 3600;

function parseHttpOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

export async function getStorefrontOriginForSeo(): Promise<string | null> {
  const siteConfig = await fetchServerConfig({
    next: { revalidate: SEO_CONFIG_REVALIDATE_SECONDS },
  });

  const candidates = [
    getConfigString(siteConfig?.seo?.canonical),
    getConfigString(process.env.NEXT_PUBLIC_SITE_URL),
  ];

  for (const candidate of candidates) {
    const origin = parseHttpOrigin(candidate);
    if (origin) return origin;
  }

  return null;
}

export function getStorefrontUrl(origin: string, pathname: string): string {
  return new URL(pathname, `${origin}/`).toString();
}
