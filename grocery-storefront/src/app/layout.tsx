import type { Metadata, Viewport } from 'next';
import { getLocale } from 'next-intl/server';
import Script from 'next/script';
import { GraphQLProvider } from '@/lib/graphql/provider';
import { CartBootstrap } from '@/components/CartBootstrap';
import { SalonLoader } from '@/components/SalonLoader';
import { SessionBootstrap } from '@/components/SessionBootstrap';
import { AppToaster } from '@/components/layout/AppToaster';
import { ConfigProvider } from '@/components/ConfigProvider';
import { TrackingScripts } from '@/components/TrackingScripts';
import type { StorefrontConfig } from '@/types/storefront-config';
import './globals.css';

const FALLBACK_TITLE = process.env.NEXT_PUBLIC_STORE_NAME || 'Grocery Store';
const FALLBACK_DESCRIPTION = process.env.NEXT_PUBLIC_STORE_DESCRIPTION || 'Fresh groceries with full nutritional transparency';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

async function fetchServerConfig(): Promise<StorefrontConfig | null> {
  const apiUrl = process.env.NEXT_PUBLIC_CONFIG_API_URL?.trim();
  if (!apiUrl) return null;

  const slug = process.env.NEXT_PUBLIC_SALON_SLUG || 'my-grocery-store';
  try {
    const res = await fetch(`${apiUrl}/api/config/${slug}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data?.config ?? json.config ?? null;
  } catch {
    return null;
  }
}

function getConfigString(value: string | null | undefined): string | undefined {
  const nextValue = value?.trim();
  return nextValue ? nextValue : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const siteConfig = await fetchServerConfig();
  const title = getConfigString(siteConfig?.seo?.defaultTitle) ?? FALLBACK_TITLE;
  const description = getConfigString(siteConfig?.seo?.defaultDescription) ?? FALLBACK_DESCRIPTION;
  const faviconUrl = getConfigString(siteConfig?.branding?.faviconUrl);
  const ogImageUrl = getConfigString(siteConfig?.seo?.ogImageUrl);
  const canonical = getConfigString(siteConfig?.seo?.canonical);

  return {
    title,
    description,
    icons: {
      icon: faviconUrl ?? '/favicon.ico',
    },
    openGraph: {
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
    alternates: canonical
      ? {
        canonical,
      }
      : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, initialConfig] = await Promise.all([
    getLocale(),
    fetchServerConfig(),
  ]);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Script id="theme-init" strategy="beforeInteractive">
          {`try {
            var theme = localStorage.getItem('grocery-theme') === 'dark' ? 'dark' : 'light';
            document.documentElement.dataset.theme = theme;
          } catch (error) {
            document.documentElement.dataset.theme = 'light';
          }`}
        </Script>
        <ConfigProvider initialConfig={initialConfig}>
          <GraphQLProvider>
            {!process.env.NEXT_PUBLIC_CHANNEL && <SalonLoader />}
            <SessionBootstrap />
            <CartBootstrap />
            {children}
          </GraphQLProvider>
          <TrackingScripts />
          <AppToaster />
        </ConfigProvider>
      </body>
    </html>
  );
}
