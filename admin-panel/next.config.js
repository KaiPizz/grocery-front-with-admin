/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self' data:",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "object-src 'none'",
  `script-src 'self' 'unsafe-inline'${isProduction ? '' : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ...(isProduction
    ? [{
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      }]
    : []),
];

const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  outputFileTracingExcludes: {
    '/*': ['./data/**/*', './public/uploads/**/*'],
  },
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/login',
        headers: [{ key: 'Cache-Control', value: 'private, no-store, max-age=0' }],
      },
    ];
  },
};

module.exports = nextConfig;
