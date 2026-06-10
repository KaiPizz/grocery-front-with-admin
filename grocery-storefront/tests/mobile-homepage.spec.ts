import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCES:
// - PRD section 3.2: mobile shoppers need to browse quickly on the go.
// - PRD section 5.1: mobile-first, fast, warm, branded storefront.
// - PRD section 5.3: homepage includes hero, banners/sections, deals, fresh
//   picks, recipes, and categories.
// - `.claude/docs/progress.md`: shipped homepage sections today are Hero,
//   Shop by Zone, Deals, Fresh Picks, Recipes.
// - Backlog B1/B2: real multi-level categories and `/categories` are still
//   blocked on backend data. This test must not assert the stale
//   `mobile-home-quick-categories` placeholder until that product work ships.

function configEnvelope() {
  return {
    config: {
      branding: {
        logoUrl: null,
        faviconUrl: null,
        storeName: 'Test Store',
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
          enabled: true,
          headline: '',
          subtitle: '',
          ctaText: '',
          ctaLink: '',
          backgroundImageUrl: null,
        },
        promoBanners: [],
        blocks: [],
        sections: [
          { id: 'shopByZone', enabled: true, order: 0 },
          { id: 'deals', enabled: true, order: 1 },
          { id: 'freshPicks', enabled: true, order: 2 },
          { id: 'recipes', enabled: true, order: 3 },
        ],
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
        defaultTitle: 'Test',
        defaultDescription: 'Test',
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

async function mockHomepageConfig(page: Page) {
  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(configEnvelope()),
    });
  });
}

async function mockPickupHomepageConfig(page: Page) {
  const envelope = configEnvelope();

  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...envelope,
        config: {
          ...envelope.config,
          general: {
            ...envelope.config.general,
            fulfillment: {
              mode: 'pickup',
              paymentPromise: 'bank_transfer',
              stockDisplayMode: 'availability_only',
              pickupInstructions: null,
              bankTransferInstructions: null,
            },
          },
        },
      }),
    });
  });
}

async function mockHomepageHeroConfig(page: Page) {
  const envelope = configEnvelope();
  envelope.config.homepage.hero = {
    enabled: true,
    headline: 'Kenmito market essentials',
    subtitle: 'Korean, Japanese, and Asian pantry picks ready for local delivery.',
    ctaText: 'Shop Kenmito',
    ctaLink: '/categories',
    backgroundImageUrl: null,
  };

  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope),
    });
  });
}

test.describe('mobile homepage', () => {
  test('renders admin-configured homepage hero copy and CTA', async ({ page }) => {
    // Protects the admin homepage contract: published hero copy should affect
    // the first storefront viewport, not only lower banner blocks or metadata.
    await mockHomepageHeroConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en');

    const hero = page.getByTestId('desktop-home-hero');

    await expect(hero.getByRole('heading', { name: 'Kenmito market essentials' })).toBeVisible();
    await expect(hero.getByText('Korean, Japanese, and Asian pantry picks ready for local delivery.')).toBeVisible();
    await expect(hero.getByRole('link', { name: 'Shop Kenmito' })).toBeVisible();
    await expect(hero.getByTestId('home-hero-product-image')).toHaveCount(4);
  });

  test('uses a compact Stitch-inspired landing page layout for fast shopping', async ({ page }) => {
    // Protects: PRD sections 3.2 / 5.1 / 5.3 plus the shipped homepage
    // progress row. Shop by Zone is the current fast-browse affordance;
    // real category browsing is B1/B2 and remains backend-blocked.
    await mockHomepageConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en');

    const hero = page.getByTestId('mobile-home-hero');
    const deals = page.getByTestId('mobile-home-deals');
    const freshPicks = page.getByTestId('mobile-home-fresh-picks');
    const shopByZone = page.getByRole('heading', { name: /shop by storage zone/i });

    await expect(hero).toBeVisible();
    await expect(shopByZone).toBeVisible();
    await expect(page.getByRole('link', { name: /shop frozen products/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /shop chilled products/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /shop ambient products/i })).toBeVisible();
    await expect(deals).toBeVisible();
    await expect(freshPicks).toBeVisible();
    await expect(page.getByTestId('mobile-home-deal-card')).toHaveCount(2);
    await expect(deals.getByText('Organic Gala Apples Family Value Pack')).toBeVisible();
    await expect(deals.getByText('Sourdough Sandwich Bread')).toBeVisible();
    await expect(deals.getByText('Blueberries Snack Box')).toHaveCount(0);
    await expect(deals.getByText('Spinach Ravioli Family Pack')).toHaveCount(0);
    const firstDealCard = page.getByTestId('mobile-home-deal-card').first();
    const firstFreshCard = freshPicks.getByTestId('mobile-home-product-card').first();

    await expect(firstDealCard.getByTestId('mobile-product-card-media')).toBeVisible();
    await expect(firstDealCard.getByTestId('mobile-product-card-add')).toBeVisible();
    await expect(firstDealCard.getByTestId('mobile-product-card-wishlist')).toBeVisible();
    await expect(firstDealCard.getByTestId('mobile-product-card-stepper')).toHaveCount(0);
    await expect(firstFreshCard.getByTestId('mobile-product-card-media')).toBeVisible();
    await expect(firstFreshCard.getByTestId('mobile-product-card-add')).toBeVisible();
    await expect(firstFreshCard.getByTestId('mobile-product-card-wishlist')).toBeVisible();
    await expect(firstFreshCard.getByTestId('mobile-product-card-stepper')).toHaveCount(0);
    await expect(hero.getByRole('link', { name: /shop now|products/i })).toBeVisible();
  });

  test('does not present regular products as deals when the catalog has no sale pricing', async ({ page }) => {
    await mockHomepageConfig(page);
    await mockMobileStorefront(page, { productPromotions: 'none' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en');

    await expect(page.getByTestId('mobile-home-fresh-picks')).toBeVisible();
    await expect(page.getByTestId('mobile-home-deals')).toHaveCount(0);
    await expect(page.getByTestId('mobile-home-deal-card')).toHaveCount(0);
  });

  test('uses the catalog-first visual system on desktop while preserving delivery browsing', async ({ page }) => {
    // Protects: PRD section 5.1 responsive enhancement. The hero should share
    // the catalog-first visual system across breakpoints while delivery stores
    // retain their three-zone browsing model.
    await mockHomepageConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en');

    await expect(page.getByTestId('mobile-home-hero')).toBeHidden();
    await expect(page.getByTestId('desktop-home-hero')).toBeVisible();
    await expect(page.getByTestId('desktop-home-hero').getByTestId('home-hero-product-image')).toHaveCount(4);
    await expect(page.getByTestId('desktop-home-zone-grid')).toBeVisible();
    const firstDealCard = page.getByTestId('desktop-home-deals').getByTestId('product-card').first();
    const firstDealAddButton = firstDealCard.getByRole('button', { name: /add to cart/i });
    const firstDealWishlistButton = firstDealCard.getByRole('button', { name: /add to wishlist/i });

    await expect(firstDealAddButton).toBeVisible();
    await expect(firstDealWishlistButton).toBeVisible();

    const columnCount = await page.getByTestId('desktop-home-zone-grid').evaluate((element) => {
      return getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length;
    });

    expect(columnCount).toBe(3);
  });

  test('surfaces pickup-first retail landing affordances on desktop', async ({ page }) => {
    await mockPickupHomepageConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en');

    const header = page.locator('header');
    const hero = page.getByTestId('desktop-home-hero');

    await expect(header.getByText('Test Store').first()).toBeVisible();
    await expect(header.getByRole('combobox', { name: /search products/i })).toBeVisible();
    await expect(header.getByRole('link', { name: /wishlist/i }).first()).toBeVisible();
    await expect(header.getByRole('link', { name: /cart/i }).first()).toBeVisible();
    await expect(hero.getByRole('link', { name: /shop now|products/i })).toBeVisible();
    await expect(hero.getByTestId('home-hero-product-image')).toHaveCount(4);

    const trust = page.locator('[data-testid="home-fulfillment-trust"]:visible').first();
    await expect(trust).toContainText(/pickup/i);
    await expect(trust).toContainText(/bank transfer/i);
    await expect(trust).toContainText(/manual confirmation/i);

    const shortcuts = page.locator('[data-testid="home-category-shortcuts"]:visible').first();
    await expect(shortcuts.getByTestId('home-category-chip').first()).toBeVisible();
    await expect(shortcuts.getByTestId('home-category-card-fallback').first()).toBeVisible();

    await expect(page.getByTestId('footer-service-notes')).toContainText(/pickup/i);
    await expect(page.locator('footer a[href="#"]')).toHaveCount(0);
  });

  test('serves a favicon instead of returning 404', async ({ page }) => {
    const response = await page.request.get('/favicon.ico');

    expect(response.ok()).toBeTruthy();
  });
});
