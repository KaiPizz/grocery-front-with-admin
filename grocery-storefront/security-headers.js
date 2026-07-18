const CONNECT_SOURCE_ENV_KEYS = [
  'NEXT_PUBLIC_CONFIG_API_URL',
  'NEXT_PUBLIC_STATIC_CONFIG_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_GRAPHQL_URL',
];

function getConfiguredHttpOrigins(env) {
  const origins = new Set();

  for (const key of CONNECT_SOURCE_ENV_KEYS) {
    const configuredUrl = env[key]?.trim();
    if (!configuredUrl) continue;

    try {
      const url = new URL(configuredUrl);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        origins.add(url.origin);
      }
    } catch {
      // Invalid application URLs are handled by their owning config loaders.
      // They must never be copied verbatim into an HTTP response header.
    }
  }

  return [...origins];
}

function serializeContentSecurityPolicy(directives) {
  return Object.entries(directives)
    .map(([directive, sources]) => (
      sources.length > 0 ? `${directive} ${sources.join(' ')}` : directive
    ))
    .join('; ');
}

function buildContentSecurityPolicy({ env = process.env, nodeEnv = process.env.NODE_ENV } = {}) {
  const isProduction = nodeEnv === 'production';
  const configuredConnectSources = getConfiguredHttpOrigins(env);

  const directives = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'object-src': ["'none'"],
    'script-src': [
      "'self'",
      // Next.js emits inline bootstrap data and the supported analytics integrations
      // currently use inline initializers. Remove this after adopting per-request nonces.
      "'unsafe-inline'",
      ...(!isProduction ? ["'unsafe-eval'"] : []),
      'https://accounts.google.com',
      'https://connect.facebook.net',
      'https://www.googletagmanager.com',
      'https://static.hotjar.com',
      'https://script.hotjar.com',
    ],
    // React uses event listeners rather than inline HTML event attributes, so
    // those attributes can stay blocked while Next.js still needs the
    // transitional script-src unsafe-inline allowance above.
    'script-src-attr': ["'none'"],
    'style-src': [
      "'self'",
      // React components and published branding set vetted inline style values.
      "'unsafe-inline'",
      'https://fonts.googleapis.com',
      'https://accounts.google.com',
    ],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    // Product and campaign media are admin-configurable HTTPS resources. The
    // application validates/proxies them separately, so CSP keeps HTTPS images usable.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'media-src': ["'self'", 'blob:', 'https:'],
    'connect-src': [
      "'self'",
      ...configuredConnectSources,
      'https://accounts.google.com',
      'https://www.facebook.com',
      'https://graph.facebook.com',
      'https://www.googletagmanager.com',
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://*.hotjar.com',
      'https://*.hotjar.io',
      'wss://*.hotjar.com',
    ],
    'frame-src': [
      "'self'",
      'https://accounts.google.com',
      'https://www.facebook.com',
      'https://*.hotjar.com',
    ],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };

  if (isProduction) {
    directives['upgrade-insecure-requests'] = [];
  }

  return serializeContentSecurityPolicy(directives);
}

function getStorefrontSecurityHeaders(options) {
  return [
    {
      key: 'Content-Security-Policy',
      value: buildContentSecurityPolicy(options),
    },
    {
      key: 'Strict-Transport-Security',
      value: 'max-age=31536000; includeSubDomains',
    },
    // SAMEORIGIN matches the current reverse-proxy policy; frame-ancestors 'none'
    // above is the stricter control used by modern browsers.
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    // Preserve Google/Facebook sign-in popups without giving unrelated openers
    // access to this browsing context group.
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
    {
      key: 'Permissions-Policy',
      value: [
        'camera=()',
        'display-capture=()',
        'geolocation=()',
        'microphone=()',
        'payment=(self)',
        'publickey-credentials-get=(self)',
        'usb=()',
      ].join(', '),
    },
  ];
}

module.exports = {
  buildContentSecurityPolicy,
  getConfiguredHttpOrigins,
  getStorefrontSecurityHeaders,
};
