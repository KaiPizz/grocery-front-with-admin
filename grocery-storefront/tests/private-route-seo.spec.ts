import { expect, test } from '@playwright/test';

const PRIVATE_ROUTES = [
  '/cart',
  '/en/checkout',
  '/en/checkout/confirmation?order=SEO-TEST',
  '/en/login',
  '/en/register',
  '/en/forgot-password',
  '/en/reset-password',
  '/en/verify-email',
  '/en/wishlist',
  '/en/account',
  '/en/account/orders/SEO-TEST',
] as const;

test.use({ javaScriptEnabled: false });

test.describe('private and transactional route metadata', () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: 'grocery_customer_access',
        value: 'seo-crawler-contract',
        url: 'http://127.0.0.1:3018',
      },
    ]);
  });

  for (const route of PRIVATE_ROUTES) {
    test(`${route} stays out of search and social discovery`, async ({ page }) => {
      // Protects the customer privacy boundary: personal and transactional
      // pages must not be indexed, shared, or claim the homepage canonical.
      const response = await page.goto(route);

      expect(response?.status()).toBe(200);
      expect(new URL(page.url()).pathname).toBe(
        new URL(route, 'http://127.0.0.1:3018').pathname,
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /nofollow/i);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
      await expect(page.locator('link[rel="alternate"]')).toHaveCount(0);
      await expect(page.locator('meta[property^="og:"]')).toHaveCount(0);
      await expect(page.locator('meta[name^="twitter:"]')).toHaveCount(0);
    });
  }
});
