import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

// Spec-first protection for the three admin-configurable thresholds added in
// backlog items B21 (free-shipping threshold), B22 (same-day shipping cutoff),
// B23 (low-stock display threshold). The requirement these tests protect: an
// admin operator can change these values from the admin panel and the
// customer-facing storefront reflects them. Defaults preserve previous
// hard-coded behavior (150 PLN, 12:00 cutoff, 10 units) for stores that
// have not customized them.

interface ConfigOverrides {
  freeShippingThreshold?: number;
  sameDayShippingCutoff?: string;
  lowStockThreshold?: number;
}

function configEnvelope(overrides: ConfigOverrides = {}) {
  return {
    slug: 'test',
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
        freeShippingThreshold: overrides.freeShippingThreshold ?? 150,
        sameDayShippingCutoff: overrides.sameDayShippingCutoff ?? '12:00',
        lowStockThreshold: overrides.lowStockThreshold ?? 10,
      },
    },
    version: 1,
    updatedAt: '2026-05-12T00:00:00.000Z',
  };
}

async function mockStorefrontConfig(page: Page, overrides: ConfigOverrides) {
  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(configEnvelope(overrides)),
    });
  });
}

test.describe('B21 — free-shipping threshold is admin-configurable', () => {
  // Requirement: when admin sets `general.freeShippingThreshold = X`, the cart
  // free-shipping progress reflects X. Default of 150 PLN preserves the
  // hard-coded behavior that shipped before B21.

  test('cart shows the remaining-to-free-shipping amount for a custom high threshold', async ({ page }) => {
    await mockStorefrontConfig(page, { freeShippingThreshold: 300 });
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const freeShipping = page.getByTestId('mobile-cart-free-shipping');
    await expect(freeShipping).toBeVisible();
    // Subtotal 12.99 PLN against threshold 300 PLN → remaining = 287.01 PLN.
    // Poll for the eventual text because the client config refresh runs in a
    // mount effect; the first render uses the SSR config (which lacks the
    // mock in the test env) and only flips after the client fetch resolves.
    await expect(freeShipping).toContainText(/free shipping/i);
    await expect.poll(async () => (await freeShipping.textContent()) ?? '', { timeout: 5000 }).toMatch(/287/);
  });

  test('cart shows the reached state when subtotal already clears a low threshold', async ({ page }) => {
    await mockStorefrontConfig(page, { freeShippingThreshold: 10 });
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const freeShipping = page.getByTestId('mobile-cart-free-shipping');
    await expect(freeShipping).toBeVisible();
    // Subtotal 12.99 PLN >= threshold 10 PLN → reached. Poll for the same
    // reason as above (client refresh post-mount).
    await expect.poll(async () => (await freeShipping.textContent()) ?? '', { timeout: 5000 }).toMatch(/qualify/i);
  });
});

test.describe('B22 — same-day shipping cutoff is admin-configurable', () => {
  // Requirement: when admin sets `general.sameDayShippingCutoff = "HH:MM"`,
  // PD ship promise reads "ships today" before that wall-clock time and
  // "ships tomorrow" after. Default "12:00" preserves the previous cutoff.
  // The bracket values 23:59 and 00:01 keep the test independent of the
  // system clock without needing Playwright clock mocking.

  test('PD ship promise reads "ships today" when cutoff is set to 23:59', async ({ page }) => {
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '23:59' });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    // Any real wall time < 23:59 → before cutoff → "ships today".
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/ships today/i);
  });

  test('PD ship promise reads "ships tomorrow" when cutoff is set to 00:01', async ({ page }) => {
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '00:01' });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    // Wall time is effectively always >= 00:01 → after cutoff → "ships tomorrow".
    // (Test would race within the 00:00..00:01 minute window; accepted risk.)
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/ships tomorrow/i);
  });
});

test.describe('B23 — low-stock display threshold is admin-configurable', () => {
  // Requirement: when admin sets `general.lowStockThreshold = N`, PD renders
  // "Only X left" when stock ≤ N, otherwise "In stock". Default 10 preserves
  // the previous behavior.

  test('apples (qty 20) render "In stock" when threshold is below the available qty', async ({ page }) => {
    await mockStorefrontConfig(page, { lowStockThreshold: 15 });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    // qty 20 > threshold 15 → not low-stock → "In stock — ships ...".
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/in stock/i);
    await expect(promise).not.toContainText(/only \d+ left/i);
  });

  test('apples (qty 20) render "Only 20 left" when threshold is at or above the available qty', async ({ page }) => {
    await mockStorefrontConfig(page, { lowStockThreshold: 25 });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    // qty 20 ≤ threshold 25 → low-stock branch → "Only 20 left — ships ...".
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/only 20 left/i);
  });
});
