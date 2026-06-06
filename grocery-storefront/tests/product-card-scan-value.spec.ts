import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCES:
// - `.claude/docs/PRD.md`: shoppers need fast mobile-first product browsing,
//   clear prices, and quick add-to-cart from large grocery catalogs.
// - `.claude/docs/progress.md`: Kamito is pickup-only, bank-transfer/manual
//   ops, and availability-only stock display.
// - Kamito PDP production plan: copy the reference stores' catalog facts
//   structure without fake shipping, exact-stock, or automated notification
//   promises.

function pickupConfigEnvelope() {
  return {
    config: {
      branding: {
        logoUrl: null,
        faviconUrl: null,
        storeName: 'Kenmito',
        colors: {
          primary: '#16a34a',
          primaryHover: '#15803d',
          background: '#ffffff',
          foreground: '#0a0a0a',
          accent: '#f0fdf4',
          accentForeground: '#14532d',
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
          enabled: true,
          headline: 'Kenmito market essentials',
          subtitle: 'Asian pantry, kimchi, noodles, sauces, and snacks for pickup.',
          ctaText: 'Browse categories',
          ctaLink: '/categories',
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
        facebookPixel: { enabled: false, pixelId: '' },
        googleAnalytics: { enabled: false, measurementId: '' },
        googleTagManager: { enabled: false, containerId: '' },
        hotjar: { enabled: false, siteId: '' },
      },
      seo: {
        defaultTitle: 'Kenmito',
        defaultDescription: 'Kenmito storefront',
        ogImageUrl: null,
        canonical: 'https://kamito.example.test',
      },
      general: {
        phone: '',
        email: '',
        address: '',
        socialLinks: [],
        policyLinks: { privacy: '/privacy', terms: '/terms', about: '/privacy' },
        freeShippingThreshold: 150,
        sameDayShippingCutoff: '12:00',
        lowStockThreshold: 10,
        fulfillment: {
          mode: 'pickup',
          paymentPromise: 'bank_transfer',
          stockDisplayMode: 'availability_only',
          pickupInstructions: null,
          bankTransferInstructions: null,
        },
      },
      commercial: {
        enabled: true,
        quickLinks: [],
        collections: [],
        outlet: { enabled: false, label: 'Outlet', collectionSlug: null },
      },
    },
    version: 1,
    updatedAt: '2026-05-25T00:00:00.000Z',
  };
}

async function mockPickupConfig(page: Page) {
  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(pickupConfigEnvelope()),
    });
  });
}

test.describe('listing product card scan value', () => {
  test('desktop cards expose product facts without cropping package images or repeating operational chips', async ({ page }) => {
    await mockPickupConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const card = page.getByTestId('product-card').first();
    await expect(card.getByTestId('product-card-title')).toContainText(/organic gala apples/i);
    await expect(card.getByTestId('unit-price')).toContainText(/2,99.*\/ kg/i);
    await expect(card.getByTestId('product-card-promo')).toContainText(/promo/i);
    await expect(card.getByTestId('product-card-availability')).toContainText(/in stock/i);

    const facts = card.getByTestId('product-card-facts');
    await expect(facts).toContainText(/fruit/i);
    await expect(facts).toContainText(/poland/i);
    await expect(facts).toContainText(/shelf-stable/i);

    await expect(card.getByTestId('product-card-fulfillment')).toHaveCount(0);

    const primaryImageFit = await card.getByTestId('product-card-image-primary').evaluate((element) => {
      return getComputedStyle(element).objectFit;
    });
    expect(primaryImageFit).toBe('contain');
    await expect(card.getByTestId('product-card-image-counter')).toContainText('1/3');
    await card.hover();
    await expect(card.getByTestId('product-card-image-counter')).toContainText('2/3');

    await expect(card.getByRole('button', { name: /add to cart/i })).toBeVisible();
    await expect(card.getByRole('button', { name: /add to wishlist/i })).toBeVisible();
    await expect(card).not.toContainText(/only 20 left|ships today|ships tomorrow|same-day shipping|pickup|bank transfer|manual confirmation/i);
  });

  test('mobile cards keep compact touch actions while surfacing product essentials without pre-add steppers', async ({ page }) => {
    await mockPickupConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const card = page.getByTestId('mobile-product-card').first();
    await expect(card.getByTestId('mobile-product-card-title')).toContainText(/organic gala apples/i);
    await expect(card.getByTestId('unit-price')).toContainText(/2,99.*\/ kg/i);
    await expect(card.getByTestId('mobile-product-card-promo')).toContainText(/promo/i);
    await expect(card.getByTestId('mobile-product-card-availability')).toContainText(/in stock/i);

    const scanFacts = card.getByTestId('mobile-product-card-scan-facts');
    await expect(scanFacts).toContainText(/fruit/i);
    await expect(scanFacts).toContainText(/poland/i);
    await expect(scanFacts).toContainText(/shelf-stable/i);

    await expect(card.getByTestId('mobile-product-card-add')).toBeVisible();
    await expect(card.getByTestId('mobile-product-card-wishlist')).toBeVisible();
    await expect(card.getByTestId('mobile-product-card-stepper')).toHaveCount(0);
    await expect(card.getByTestId('mobile-product-card-image-counter')).toContainText('1/3');
    await expect(card.getByTestId('mobile-product-card-fulfillment')).toHaveCount(0);
    await expect(card).not.toContainText(/only 20 left|ships today|ships tomorrow|same-day shipping|pickup|bank transfer|manual confirmation/i);
  });
});
