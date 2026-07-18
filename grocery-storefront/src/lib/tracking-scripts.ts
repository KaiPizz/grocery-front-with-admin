const INLINE_SCRIPT_ESCAPE_PATTERN = /[<>&\u2028\u2029]/g;

const INLINE_SCRIPT_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

/**
 * Serializes untrusted config as a JavaScript string literal that is also safe
 * inside an inline script element. Escaping `<` prevents an HTML parser from
 * treating a config value such as `</script>` as the end of the script block.
 */
export function serializeInlineScriptValue(value: unknown): string {
  return JSON.stringify(String(value)).replace(
    INLINE_SCRIPT_ESCAPE_PATTERN,
    (character) => INLINE_SCRIPT_ESCAPES[character],
  );
}

export function buildFacebookPixelScript(pixelId: unknown): string {
  const serializedPixelId = serializeInlineScriptValue(pixelId);

  return `!function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window,document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', ${serializedPixelId});
  fbq('track', 'PageView');`;
}

export function buildGoogleAnalyticsUrl(measurementId: unknown): string {
  const url = new URL('https://www.googletagmanager.com/gtag/js');
  url.searchParams.set('id', String(measurementId));
  return url.toString();
}

export function buildGoogleAnalyticsScript(measurementId: unknown): string {
  const serializedMeasurementId = serializeInlineScriptValue(measurementId);

  return `window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', ${serializedMeasurementId});`;
}

export function buildGoogleTagManagerScript(containerId: unknown): string {
  const serializedContainerId = serializeInlineScriptValue(containerId);

  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+encodeURIComponent(l):'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(i)+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer',${serializedContainerId});`;
}

export function buildHotjarScript(siteId: unknown): string {
  const normalizedSiteId = String(siteId);
  const numericSiteId = Number(normalizedSiteId);
  const serializedSiteId = /^\d+$/.test(normalizedSiteId) && Number.isSafeInteger(numericSiteId)
    ? JSON.stringify(numericSiteId)
    : serializeInlineScriptValue(normalizedSiteId);

  return `(function(h,o,t,j,a,r){
  h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
  h._hjSettings={hjid:${serializedSiteId},hjsv:6};
  a=o.getElementsByTagName('head')[0];
  r=o.createElement('script');r.async=1;
  r.src=t+encodeURIComponent(h._hjSettings.hjid)+j+encodeURIComponent(h._hjSettings.hjsv);
  a.appendChild(r);
  })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`;
}
