'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useStorefrontConfig } from '@/components/ConfigProvider';
import { isTrackingAllowedRoute } from '@/lib/tracking-policy';
import {
  buildFacebookPixelScript,
  buildGoogleAnalyticsScript,
  buildGoogleAnalyticsUrl,
  buildGoogleTagManagerScript,
  buildHotjarScript,
} from '@/lib/tracking-scripts';

/**
 * Conditionally injects tracking scripts (FB Pixel, GA4, GTM, Hotjar)
 * based on published config. Scripts use afterInteractive strategy
 * to avoid blocking page render.
 */
export function TrackingScripts() {
  const siteConfig = useStorefrontConfig();
  const pathname = usePathname();
  const tracking = siteConfig?.tracking;

  if (!tracking || !isTrackingAllowedRoute(pathname)) return null;

  return (
    <>
      {tracking.facebookPixel?.enabled && tracking.facebookPixel.pixelId && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {buildFacebookPixelScript(tracking.facebookPixel.pixelId)}
        </Script>
      )}

      {tracking.googleAnalytics?.enabled && tracking.googleAnalytics.measurementId && (
        <>
          <Script
            src={buildGoogleAnalyticsUrl(tracking.googleAnalytics.measurementId)}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {buildGoogleAnalyticsScript(tracking.googleAnalytics.measurementId)}
          </Script>
        </>
      )}

      {tracking.googleTagManager?.enabled && tracking.googleTagManager.containerId && (
        <Script id="gtm-init" strategy="afterInteractive">
          {buildGoogleTagManagerScript(tracking.googleTagManager.containerId)}
        </Script>
      )}

      {tracking.hotjar?.enabled && tracking.hotjar.siteId && (
        <Script id="hotjar-init" strategy="afterInteractive">
          {buildHotjarScript(tracking.hotjar.siteId)}
        </Script>
      )}
    </>
  );
}
