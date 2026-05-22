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
          showThemeToggle: true,
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

async function mockHomepageHeroConfig(page: Page) {
  const envelope = configEnvelope();
  envelope.config.homepage.hero = {
    enabled: true,
    headline: 'Kamito market essentials',
    subtitle: 'Korean, Japanese, and Asian pantry picks ready for local delivery.',
    ctaText: 'Shop Kamito',
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

    await expect(hero.getByRole('heading', { name: 'Kamito market essentials' })).toBeVisible();
    await expect(hero.getByText('Korean, Japanese, and Asian pantry picks ready for local delivery.')).toBeVisible();
    await expect(hero.getByRole('link', { name: 'Shop Kamito' })).toBeVisible();
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
    await expect(page.getByTestId('mobile-home-deal-card')).toHaveCount(4);
    const firstDealCard = page.getByTestId('mobile-home-deal-card').first();
    const firstFreshCard = freshPicks.getByTestId('mobile-home-product-card').first();

    await expect(firstDealCard.getByTestId('mobile-product-card-media')).toBeVisible();
    await expect(firstDealCard.getByTestId('mobile-product-card-stepper')).toBeVisible();
    await expect(firstDealCard.getByTestId('mobile-product-card-wishlist')).toBeVisible();
    await expect(firstFreshCard.getByTestId('mobile-product-card-media')).toBeVisible();
    await expect(firstFreshCard.getByTestId('mobile-product-card-stepper')).toBeVisible();
    await expect(hero.getByRole('link', { name: /shop now|products/i })).toBeVisible();
  });

  test('keeps the Stitch-inspired redesign scoped to mobile and preserves the desktop homepage layout', async ({ page }) => {
    // Protects: PRD section 5.1 responsive enhancement. Desktop keeps its
    // existing hero + three-zone grid while the compact card layout is mobile-only.
    await mockHomepageConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en');

    await expect(page.getByTestId('mobile-home-hero')).toBeHidden();
    await expect(page.getByTestId('desktop-home-hero')).toBeVisible();
    await expect(page.getByTestId('desktop-home-zone-grid')).toBeVisible();

    const columnCount = await page.getByTestId('desktop-home-zone-grid').evaluate((element) => {
      return getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length;
    });

    expect(columnCount).toBe(3);
  });

  test('serves a favicon instead of returning 404', async ({ page }) => {
    const response = await page.request.get('/favicon.ico');

    expect(response.ok()).toBeTruthy();
  });
});
