import type { Metadata, Viewport } from 'next';
import { getLocale } from 'next-intl/server';
import { GraphQLProvider } from '@/lib/graphql/provider';
import { CartBootstrap } from '@/components/CartBootstrap';
import { SalonLoader } from '@/components/SalonLoader';
import { SessionBootstrap } from '@/components/SessionBootstrap';
import { AppToaster } from '@/components/layout/AppToaster';
import { ConfigProvider } from '@/components/ConfigProvider';
import { TrackingScripts } from '@/components/TrackingScripts';
import { SensitiveRouteBoundary } from '@/components/SensitiveRouteBoundary';
import { localizeConfiguredStorefront } from '@/lib/configured-content-localization';
import {
  buildPublicPageMetadata,
  buildWebsiteJsonLd,
  fetchSeoStorefrontConfig,
  serializeJsonLd,
} from '@/lib/seo-metadata';
import { getConfigString } from '@/lib/storefront-config';
import './globals.css';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const FALLBACK_TITLE = process.env.NEXT_PUBLIC_STORE_NAME || 'Grocery Store';
const FALLBACK_DESCRIPTION = process.env.NEXT_PUBLIC_STORE_DESCRIPTION || 'Fresh groceries with full nutritional transparency';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const [locale, rawConfig] = await Promise.all([
    getLocale(),
    fetchSeoStorefrontConfig(),
  ]);
  const siteConfig = localizeConfiguredStorefront(rawConfig, locale);
  const title = getConfigString(siteConfig?.seo?.defaultTitle) ?? FALLBACK_TITLE;
  const description = getConfigString(siteConfig?.seo?.defaultDescription) ?? FALLBACK_DESCRIPTION;
  const faviconUrl = getConfigString(siteConfig?.branding?.faviconUrl);
  const metadata = buildPublicPageMetadata({
    locale,
    pathname: '/',
    title,
    description,
    siteConfig: rawConfig,
    appendStoreName: false,
  });

  return {
    ...metadata,
    icons: {
      icon: faviconUrl ?? '/favicon.ico',
      shortcut: faviconUrl ?? '/favicon.ico',
      apple: faviconUrl ?? '/favicon.ico',
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, initialConfig] = await Promise.all([
    getLocale(),
    fetchSeoStorefrontConfig(),
  ]);
  const websiteJsonLd = buildWebsiteJsonLd({ siteConfig: initialConfig });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {websiteJsonLd && (
          <script
            id="website-json-ld"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(websiteJsonLd) }}
          />
        )}
        <ConfigProvider initialConfig={initialConfig}>
          <SensitiveRouteBoundary>
            <GraphQLProvider>
              {!process.env.NEXT_PUBLIC_CHANNEL && <SalonLoader />}
              <SessionBootstrap />
              <CartBootstrap />
              {children}
            </GraphQLProvider>
            <TrackingScripts />
            <AppToaster />
          </SensitiveRouteBoundary>
        </ConfigProvider>
      </body>
    </html>
  );
}
