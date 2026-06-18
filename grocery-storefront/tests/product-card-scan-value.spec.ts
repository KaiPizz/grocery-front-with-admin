import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCES:
// - `.claude/docs/PRD.md`: shoppers need fast mobile-first product browsing,
//   clear prices, and quick add-to-cart from large grocery catalogs.
// - `.claude/docs/progress.md`: Kenmito is pickup-only, bank-transfer/manual
//   ops, and availability-only stock display.
// - Kenmito PDP production plan: copy the reference stores' catalog facts
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
        canonical: 'https://kenmito.example.test',
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
    const imageCounter = card.getByTestId('product-card-image-counter');
    await expect(imageCounter).toContainText('1/3');
    await card.hover();
    await expect(imageCounter.getByTestId('product-card-image-progress')).toBeVisible();
    await expect(card.getByTestId('product-card-image-slide')).toHaveCount(3);
    const slideTransition = await card.getByTestId('product-card-image-slide').first().evaluate((element) => {
      return getComputedStyle(element).transition;
    });
    expect(slideTransition).toContain('opacity');
    const imageLayerMetrics = await card.evaluate((element) => {
      const primaryImage = element.querySelector('[data-testid="product-card-image-primary"]');
      const imageContainer = primaryImage?.parentElement;
      const carouselLayer = element.querySelector('[data-testid="product-card-image-carousel"]');
      const imageRect = primaryImage?.getBoundingClientRect();
      const containerRect = imageContainer?.getBoundingClientRect();

      return {
        primaryImage: imageRect ? { width: imageRect.width, height: imageRect.height } : null,
        container: containerRect ? { width: containerRect.width, height: containerRect.height } : null,
        carouselBackground: carouselLayer ? getComputedStyle(carouselLayer).backgroundColor : null,
      };
    });
    expect(imageLayerMetrics.primaryImage).not.toBeNull();
    expect(imageLayerMetrics.container).not.toBeNull();
    expect(imageLayerMetrics.primaryImage!.width).toBeLessThanOrEqual(imageLayerMetrics.container!.width + 0.5);
    expect(imageLayerMetrics.primaryImage!.height).toBeLessThanOrEqual(imageLayerMetrics.container!.height + 0.5);
    expect(imageLayerMetrics.carouselBackground).not.toBe('rgba(0, 0, 0, 0)');
    await expect(imageCounter).toContainText('2/3');
    await expect(imageCounter).toContainText('3/3');

    const wishlistButton = card.getByRole('button', { name: /add to wishlist/i });
    const wishlistBox = await wishlistButton.boundingBox();
    expect(wishlistBox).not.toBeNull();
    const wishlistHitTarget = await page.evaluate(({ x, y }) => {
      const element = document.elementFromPoint(x, y);
      return element?.closest('button')?.getAttribute('aria-label') ?? null;
    }, {
      x: wishlistBox!.x + wishlistBox!.width / 2,
      y: wishlistBox!.y + wishlistBox!.height / 2,
    });
    expect(wishlistHitTarget ?? '').toMatch(/add to wishlist/i);

    await page.mouse.move(20, 20);
    await expect(imageCounter).toContainText('1/3');

    await expect(card.getByRole('button', { name: /add to cart/i })).toBeVisible();
    await expect(wishlistButton).toBeVisible();
    expect(wishlistBox!.width).toBeGreaterThanOrEqual(44);
    expect(wishlistBox!.height).toBeGreaterThanOrEqual(44);
    await expect(card.getByTestId('product-card-wishlist-desktop')).toHaveAttribute('aria-pressed', 'false');

    await card.getByTestId('product-card-wishlist-desktop').click();
    await expect(card.getByRole('button', { name: /remove from wishlist/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(card.getByTestId('product-card-saved-state')).toContainText(/saved for later/i);

    const addButtonBox = await card.getByRole('button', { name: /add to cart/i }).boundingBox();
    const cardBox = await card.boundingBox();
    expect(addButtonBox).not.toBeNull();
    expect(cardBox).not.toBeNull();
    expect(cardBox!.y + cardBox!.height - (addButtonBox!.y + addButtonBox!.height)).toBeLessThanOrEqual(18);

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
    const mobileAddBox = await card.getByTestId('mobile-product-card-add').boundingBox();
    const mobileWishlistBox = await card.getByTestId('mobile-product-card-wishlist').boundingBox();
    expect(mobileAddBox).not.toBeNull();
    expect(mobileWishlistBox).not.toBeNull();
    expect(mobileAddBox!.width).toBeGreaterThanOrEqual(44);
    expect(mobileAddBox!.height).toBeGreaterThanOrEqual(44);
    expect(mobileWishlistBox!.width).toBeGreaterThanOrEqual(44);
    expect(mobileWishlistBox!.height).toBeGreaterThanOrEqual(44);
    await expect(card.getByTestId('mobile-product-card-wishlist')).toHaveAttribute('aria-pressed', 'false');
    await card.getByTestId('mobile-product-card-wishlist').click();
    await expect(card.getByTestId('mobile-product-card-wishlist')).toHaveAttribute('aria-pressed', 'true');
    await expect(card.getByTestId('mobile-product-card-saved-state')).toContainText(/saved for later/i);
    await expect(card.getByTestId('mobile-product-card-stepper')).toHaveCount(0);
    await expect(card.getByTestId('mobile-product-card-image-counter')).toContainText('1/3');
    await expect(card.getByTestId('mobile-product-card-fulfillment')).toHaveCount(0);
    await expect(card).not.toContainText(/only 20 left|ships today|ships tomorrow|same-day shipping|pickup|bank transfer|manual confirmation/i);
  });
});
