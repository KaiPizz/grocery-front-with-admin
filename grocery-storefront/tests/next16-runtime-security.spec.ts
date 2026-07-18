import { expect, test, type APIResponse } from '@playwright/test';

// Regression: Next 16 migration must preserve runtime headers, proxy redirects,
// and async catch-all route params instead of only satisfying source contracts.
// Found by /qa on 2026-07-18

function redirectLocation(response: APIResponse): URL {
  expect(response.status()).toBe(307);

  const location = response.headers().location;
  expect(location).toBeTruthy();

  return new URL(location, 'http://127.0.0.1:3018');
}

test.describe('Next 16 runtime security contracts', () => {
  test('serves browser security headers without exposing the Next.js signature', async ({ request }) => {
    const response = await request.get('/en');

    expect(response.status()).toBe(200);

    const headers = response.headers();
    const contentSecurityPolicy = headers['content-security-policy'];

    expect(contentSecurityPolicy).toContain("default-src 'self'");
    expect(contentSecurityPolicy).toContain("object-src 'none'");
    expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
    expect(contentSecurityPolicy).toContain("script-src-attr 'none'");
    expect(headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
    expect(headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
    expect(headers['permissions-policy']).toContain('camera=()');
    expect(headers['permissions-policy']).toContain('payment=(self)');
    expect(headers['x-powered-by']).toBeUndefined();
    expect(headers['x-xss-protection']).toBeUndefined();
  });

  test('redirects legacy locales while preserving the requested path and query', async ({ request }) => {
    const response = await request.get('/vi/products?search=kimchi', { maxRedirects: 0 });
    const location = redirectLocation(response);

    expect(location.pathname).toBe('/en/products');
    expect(location.searchParams.get('search')).toBe('kimchi');
  });

  test('redirects guest account routes to localized login with an exact return path', async ({ request }) => {
    const returnTo = '/en/account/orders/order-123?tab=details';
    const response = await request.get(returnTo, { maxRedirects: 0 });
    const location = redirectLocation(response);

    expect(location.pathname).toBe('/en/login');
    expect(location.searchParams.get('returnTo')).toBe(returnTo);
  });

  test('moves reset and verification tokens from the query into a fragment', async ({ request }) => {
    for (const route of ['reset-password', 'verify-email']) {
      const response = await request.get(
        `/en/${route}?token=runtime-secret&returnTo=%2Fen%2Faccount`,
        { maxRedirects: 0 },
      );
      const location = redirectLocation(response);

      expect(location.pathname).toBe(`/en/${route}`);
      expect(location.searchParams.has('token')).toBe(false);
      expect(location.searchParams.get('returnTo')).toBe('/en/account');
      expect(location.hash).toBe('#token=runtime-secret');
    }
  });

  test('forwards only the configured public salon path through the async catch-all route', async ({ request }) => {
    const allowed = await request.get('/api/proxy/public/salon/test');

    expect(allowed.status()).toBe(200);
    expect(await allowed.json()).toEqual({
      source: 'playwright-config-server',
      slug: 'test',
      path: '/api/v1/public/salon/test',
    });
    expect(allowed.headers()['cache-control']).toBe('no-store, max-age=0');
    expect(allowed.headers()['x-content-type-options']).toBe('nosniff');

    for (const rejectedPath of [
      '/api/proxy/public/salon/other',
      '/api/proxy/public/salon/test/extra',
      '/api/proxy/private/salon/test',
    ]) {
      const rejected = await request.get(rejectedPath);
      expect(rejected.status(), rejectedPath).toBe(404);
      expect(await rejected.json(), rejectedPath).toEqual({ error: 'Not found' });
    }
  });
});
