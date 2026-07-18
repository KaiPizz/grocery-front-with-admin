import { expect, test } from '@playwright/test';

function trackingConfigEnvelope() {
  return {
    config: {
      branding: {
        logoUrl: null,
        faviconUrl: null,
        storeName: 'Tracking Test Grocery',
        colors: {
          primary: '#16a34a',
          primaryHover: '#15803d',
          background: '#ffffff',
          foreground: '#0a0a0a',
          accent: '#f59e0b',
          accentForeground: '#ffffff',
          muted: '#f5f5f5',
          mutedForeground: '#525252',
          border: '#e5e5e5',
          card: '#ffffff',
          cardForeground: '#0a0a0a',
          destructive: '#dc2626',
          ring: '#16a34a',
        },
      },
      homepage: {
        hero: {
          enabled: false,
          headline: '',
          subtitle: '',
          ctaText: '',
          ctaLink: '',
          backgroundImageUrl: null,
        },
        promoBanners: [],
        blocks: [],
        sections: [],
      },
      layout: {
        header: {
          navItems: [],
          showSearch: true,
          showWishlist: true,
          showLanguageSwitcher: true,
        },
        footer: { tagline: '', columns: [], copyrightText: '' },
        bannerPosition: 'below-hero',
      },
      tracking: {
        facebookPixel: { enabled: true, pixelId: '1234567890' },
        googleAnalytics: { enabled: true, measurementId: 'G-ADMINSEO1' },
        googleTagManager: { enabled: true, containerId: 'GTM-ADMINSEO' },
        hotjar: { enabled: false, siteId: '999999' },
      },
      seo: {
        defaultTitle: 'Tracking Test',
        defaultDescription: 'Tracking test description.',
        ogImageUrl: null,
        canonical: '',
      },
      general: {
        phone: '',
        email: '',
        address: '',
        socialLinks: [],
        policyLinks: { privacy: '/privacy', terms: '/terms', about: '#' },
        freeShippingThreshold: 150,
        sameDayShippingCutoff: '12:00',
        lowStockThreshold: 10,
      },
    },
    version: 1,
    updatedAt: '2026-05-12T00:00:00.000Z',
  };
}

test.describe('admin-configured SEO and tracking', () => {
  test('uses published admin SEO defaults for document metadata', async ({ page }) => {
    // Protects PRD 3.2 Store Owner flow and 4.1 SEO config: publishing SEO
    // defaults must change the customer-facing document metadata without code.
    await page.goto('/en');

    await expect(page).toHaveTitle('Configured SEO Title');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Configured SEO description from the admin panel.',
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Configured SEO Title');
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      'content',
      'Configured SEO description from the admin panel.',
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://cdn.example.test/og-image.jpg',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://store.example.test/en');
  });

  test('injects only enabled published tracking providers after config refresh', async ({ page }) => {
    // Protects PRD 4.1 Tracking integrations: configured providers should
    // reach the storefront, while disabled providers must not leak scripts.
    await page.route('**/api/config/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(trackingConfigEnvelope()),
      });
    });
    await page.route('https://connect.facebook.net/**', async (route) => route.abort());
    await page.route('https://www.googletagmanager.com/**', async (route) => route.abort());
    await page.route('https://static.hotjar.com/**', async (route) => route.abort());

    await page.goto('/en');

    const facebookPixel = page.locator('script#fb-pixel');
    const googleAnalyticsInit = page.locator('script#ga4-init');
    const googleTagManager = page.locator('script#gtm-init');

    await expect(facebookPixel).toHaveCount(1);
    await expect.poll(async () => facebookPixel.evaluate((script) => script.textContent ?? '')).toContain('fbq(\'init\', "1234567890")');
    await expect(page.locator('script[src*="googletagmanager.com/gtag/js?id=G-ADMINSEO1"]')).toHaveCount(1);
    await expect.poll(async () => googleAnalyticsInit.evaluate((script) => script.textContent ?? '')).toContain('gtag(\'config\', "G-ADMINSEO1")');
    await expect.poll(async () => googleTagManager.evaluate((script) => script.textContent ?? '')).toContain('"GTM-ADMINSEO"');
    await expect(page.locator('script#hotjar-init')).toHaveCount(0);
  });
});
