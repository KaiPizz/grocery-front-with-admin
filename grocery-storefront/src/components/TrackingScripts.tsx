'use client';

import Script from 'next/script';
import { useStorefrontConfig } from '@/components/ConfigProvider';

/**
 * Conditionally injects tracking scripts (FB Pixel, GA4, GTM, Hotjar)
 * based on published config. Scripts use afterInteractive strategy
 * to avoid blocking page render.
 */
export function TrackingScripts() {
  const siteConfig = useStorefrontConfig();
  const tracking = siteConfig?.tracking;

  if (!tracking) return null;

  return (
    <>
      {tracking.facebookPixel?.enabled && tracking.facebookPixel.pixelId && (
        <Script id="fb-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${tracking.facebookPixel.pixelId}');
          fbq('track', 'PageView');`}
        </Script>
      )}

      {tracking.googleAnalytics?.enabled && tracking.googleAnalytics.measurementId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${tracking.googleAnalytics.measurementId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${tracking.googleAnalytics.measurementId}');`}
          </Script>
        </>
      )}

      {tracking.googleTagManager?.enabled && tracking.googleTagManager.containerId && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${tracking.googleTagManager.containerId}');`}
        </Script>
      )}

      {tracking.hotjar?.enabled && tracking.hotjar.siteId && (
        <Script id="hotjar-init" strategy="afterInteractive">
          {`(function(h,o,t,j,a,r){
          h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
          h._hjSettings={hjid:${tracking.hotjar.siteId},hjsv:6};
          a=o.getElementsByTagName('head')[0];
          r=o.createElement('script');r.async=1;
          r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
          a.appendChild(r);
          })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`}
        </Script>
      )}
    </>
  );
}
