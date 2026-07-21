const createNextIntlPlugin = require('next-intl/plugin');
const { getStorefrontSecurityHeaders } = require('./security-headers');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const productSlugRedirects = [
  {
    oldSlug: 'chipsy-z-alg-morskich-z-sezamem-50g-sempio',
    newSlug: 'sempio-seasoned-laver-gim-jaban-70g',
  },
  {
    oldSlug: 'papryka-gochugaru-do-kimchi-1kg-panasia',
    newSlug: 'papryka-gochugaru-red-pepper-powder-500g-ourhome',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // Preserve next-intl's as-needed locale rewrites in standalone production.
  skipProxyUrlNormalize: true,
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return productSlugRedirects.flatMap(({ oldSlug, newSlug }) => [
      {
        source: `/products/${oldSlug}`,
        destination: `/products/${newSlug}`,
        statusCode: 301,
      },
      {
        source: `/pl/products/${oldSlug}`,
        destination: `/products/${newSlug}`,
        statusCode: 301,
      },
      {
        source: `/en/products/${oldSlug}`,
        destination: `/en/products/${newSlug}`,
        statusCode: 301,
      },
    ]);
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    remotePatterns: [
      { protocol: 'https', hostname: '**.enail.pro' },
      { protocol: 'https', hostname: '**.zira-ai.com' },
      { protocol: 'https', hostname: 'img.zira.pl' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: getStorefrontSecurityHeaders(),
      },
      {
        source: '/api/image',
        headers: [
          { key: 'Content-Security-Policy', value: "default-src 'none'; sandbox" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
