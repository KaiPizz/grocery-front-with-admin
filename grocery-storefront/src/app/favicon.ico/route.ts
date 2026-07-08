import { fetchServerConfig, getConfigString } from '@/lib/storefront-config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const faviconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="18" fill="#e8f5e9"/>
  <path d="M20 40c0-10 7-18 18-22-1 13-8 21-18 22Z" fill="#2f9e44"/>
  <path d="M44 40c0-10-7-18-18-22 1 13 8 21 18 22Z" fill="#58b368"/>
  <path d="M32 18v28" stroke="#1f7a36" stroke-width="3" stroke-linecap="round"/>
</svg>
`.trim();

export async function GET() {
  const siteConfig = await fetchServerConfig();
  const faviconUrl = getConfigString(siteConfig?.branding?.faviconUrl);

  if (faviconUrl) {
    return new Response(null, {
      status: 307,
      headers: {
        Location: faviconUrl,
        'Cache-Control': 'no-store',
      },
    });
  }

  return new Response(faviconSvg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store',
    },
  });
}
