import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const require = createRequire(import.meta.url);
const {
  buildContentSecurityPolicy,
  getConfiguredHttpOrigins,
  getStorefrontSecurityHeaders,
} = require('../security-headers.js');

function headerMap(headers) {
  return new Map(headers.map(({ key, value }) => [key.toLowerCase(), value]));
}

test('production security headers enforce browser hardening without exposing Next.js', () => {
  const headers = headerMap(getStorefrontSecurityHeaders({
    nodeEnv: 'production',
    env: {},
  }));
  const nextConfigSource = readFileSync(new URL('../next.config.js', import.meta.url), 'utf8');

  assert.equal(headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
  assert.equal(headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.equal(headers.get('x-content-type-options'), 'nosniff');
  assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
  assert.match(headers.get('permissions-policy'), /camera=\(\)/);
  assert.match(headers.get('permissions-policy'), /payment=\(self\)/);
  assert.equal(headers.has('x-xss-protection'), false);
  assert.match(nextConfigSource, /poweredByHeader:\s*false/);
});

test('production CSP blocks executable object/embed and cross-origin framing primitives', () => {
  const policy = buildContentSecurityPolicy({ nodeEnv: 'production', env: {} });

  assert.match(policy, /(?:^|; )default-src 'self'(?:;|$)/);
  assert.match(policy, /(?:^|; )object-src 'none'(?:;|$)/);
  assert.match(policy, /(?:^|; )frame-ancestors 'none'(?:;|$)/);
  assert.match(policy, /(?:^|; )base-uri 'self'(?:;|$)/);
  assert.match(policy, /(?:^|; )form-action 'self'(?:;|$)/);
  assert.match(policy, /(?:^|; )script-src-attr 'none'(?:;|$)/);
  assert.match(policy, /(?:^|; )upgrade-insecure-requests(?:;|$)/);
  assert.doesNotMatch(policy, /'unsafe-eval'/);
});

test('CSP retains the storefront integrations that are explicitly supported', () => {
  const policy = buildContentSecurityPolicy({
    nodeEnv: 'production',
    env: {
      NEXT_PUBLIC_CONFIG_API_URL: 'https://asiandeligo-admin.eshoper.pro/admin-path',
      NEXT_PUBLIC_STATIC_CONFIG_URL: 'https://asiandeligo.eshoper.pro/config/asiandeligo.json',
      NEXT_PUBLIC_GRAPHQL_URL: 'https://zira-ai.com/graphql/storefront',
    },
  });

  assert.match(policy, /script-src[^;]*https:\/\/accounts\.google\.com/);
  assert.match(policy, /script-src[^;]*https:\/\/connect\.facebook\.net/);
  assert.match(policy, /script-src[^;]*https:\/\/www\.googletagmanager\.com/);
  assert.match(policy, /script-src[^;]*https:\/\/static\.hotjar\.com/);
  assert.match(policy, /style-src[^;]*https:\/\/fonts\.googleapis\.com/);
  assert.match(policy, /font-src[^;]*https:\/\/fonts\.gstatic\.com/);
  assert.match(policy, /img-src 'self' data: blob: https:/);
  assert.match(policy, /connect-src[^;]*https:\/\/asiandeligo-admin\.eshoper\.pro/);
  assert.match(policy, /connect-src[^;]*https:\/\/asiandeligo\.eshoper\.pro/);
  assert.match(policy, /connect-src[^;]*https:\/\/zira-ai\.com/);
});

test('configured CSP origins are normalized, deduplicated, and never header-injected', () => {
  const origins = getConfiguredHttpOrigins({
    NEXT_PUBLIC_CONFIG_API_URL: 'https://config.example.test/api/config',
    NEXT_PUBLIC_STATIC_CONFIG_URL: 'https://config.example.test/static.json',
    NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4199/api/v1',
    NEXT_PUBLIC_GRAPHQL_URL: 'javascript:alert(1)\r\nX-Injected: yes',
  });

  assert.deepEqual(origins, [
    'https://config.example.test',
    'http://127.0.0.1:4199',
  ]);
});

test('development CSP permits Next.js eval tooling but does not force HTTPS upgrades', () => {
  const policy = buildContentSecurityPolicy({ nodeEnv: 'development', env: {} });

  assert.match(policy, /script-src[^;]*'unsafe-eval'/);
  assert.doesNotMatch(policy, /upgrade-insecure-requests/);
});
