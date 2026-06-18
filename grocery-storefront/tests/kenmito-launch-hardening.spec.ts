import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

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
        sections: [
          { id: 'shopByZone', enabled: true, order: 0 },
          { id: 'deals', enabled: true, order: 1 },
          { id: 'freshPicks', enabled: true, order: 2 },
          { id: 'recipes', enabled: false, order: 3 },
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
        quickLinks: [
          {
            id: 'quick-outlet',
            label: 'Outlet',
            href: '/outlet',
            kind: 'outlet',
            description: null,
            imageUrl: null,
            enabled: true,
            order: 0,
          },
          {
            id: 'quick-pantry',
            label: 'Korean pantry',
            href: '/collections/korean-pantry',
            kind: 'collection',
            description: null,
            imageUrl: null,
            enabled: true,
            order: 1,
          },
        ],
        collections: [],
        outlet: { enabled: false, label: 'Outlet', collectionSlug: null },
      },
    },
    version: 1,
    updatedAt: '2026-05-24T00:00:00.000Z',
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

async function fillDeliveryForm(page: Page) {
  await page.getByLabel(/first name/i).fill('Marta');
  await page.getByLabel(/last name/i).fill('Nowak');
  await page.getByLabel(/^email/i).fill('marta@example.com');
  await page.getByLabel(/phone/i).fill('+48123123123');
  await page.getByLabel(/address/i).fill('Marszalkowska 1');
  await page.getByLabel(/city/i).fill('Warsaw');
  await page.getByLabel(/postal code/i).fill('00-001');
  await page.getByLabel(/country/i).fill('PL');
}

async function completePickupBankTransferSelection(page: Page) {
  await fillDeliveryForm(page);
  await page.getByRole('button', { name: /continue/i }).click();

  const shippingPanel = page.locator('#checkout-panel-shipping');
  const pickupMethod = shippingPanel.getByRole('button', { name: /pickup in store/i });
  await expect(pickupMethod).toBeVisible();
  await pickupMethod.click();

  const paymentPanel = page.locator('#checkout-panel-payment');
  const bankTransfer = paymentPanel.getByRole('button', { name: /bank transfer/i });
  await expect(bankTransfer).toBeVisible();
  await bankTransfer.click();
}

test.describe('Kenmito launch truth copy', () => {
  test('replaces the header shipping countdown with pickup and bank transfer copy', async ({ page }) => {
    await mockPickupConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/en/products');

    const status = page.getByRole('banner').getByRole('status');

    await expect.poll(async () => (await status.textContent()) ?? '', { timeout: 5000 }).toMatch(/pickup/i);
    await expect(status).toContainText(/bank transfer/i);
    await expect(status).not.toContainText(/same-day shipping|ships tomorrow|order in/i);
  });

  test('shows broad product availability without exact stock or shipping promise', async ({ page }) => {
    await mockPickupConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const stockPromise = page.getByTestId('pd-stock-promise');

    await expect.poll(async () => (await stockPromise.textContent()) ?? '', { timeout: 5000 }).toMatch(/in stock/i);
    await expect(stockPromise).not.toContainText(/only 20 left|ships today|ships tomorrow/i);
    await expect(page.getByText(/pickup/i).first()).toBeVisible();
    await expect(page.getByText(/bank transfer/i).first()).toBeVisible();
  });

  test('keeps Kenmito fulfillment truth and compact product facts inside the purchase panel', async ({ page }) => {
    await mockPickupConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const panel = page.getByTestId('pdp-purchase-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId('pd-stock-promise')).toContainText(/in stock/i);
    await expect(panel).not.toContainText(/only 20 left|ships today|ships tomorrow/i);
    await expect(panel).toContainText(/pickup/i);
    await expect(panel).toContainText(/bank transfer/i);
    await expect(panel).toContainText(/confirmed manually/i);
    await expect(panel).toContainText(/fruit/i);
    await expect(panel).toContainText(/poland/i);
    await expect(panel).toContainText(/shelf-stable/i);
    await expect(panel).toContainText(/vegan/i);
    await expect(panel).toContainText(/3 allergens/i);
    await expect(panel).toContainText(/APPLE-1KG/i);
    await expect(panel.getByTestId('product-detail-add')).toBeVisible();
  });

  test('hides cart free-shipping progress and shows pickup notice', async ({ page }) => {
    await mockPickupConfig(page);
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    await expect(page.getByText(/free shipping/i)).toHaveCount(0);
    await expect(page.getByText(/pickup/i).first()).toBeVisible();
    await expect(page.getByText(/bank transfer/i).first()).toBeVisible();
  });

  test('checkout exposes pickup-only fulfillment and bank-transfer payment without delivery alternatives', async ({ page }) => {
    await mockPickupConfig(page);
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item', checkoutProfile: 'pickup-bank-transfer' });
    await page.goto('/en/checkout');

    await fillDeliveryForm(page);
    await page.getByRole('button', { name: /continue/i }).click();

    const shippingPanel = page.locator('#checkout-panel-shipping');
    const pickupMethod = shippingPanel.getByRole('button', { name: /pickup in store/i });
    await expect(pickupMethod).toBeVisible();
    await expect(shippingPanel).toContainText(/only fulfillment path/i);
    await expect(shippingPanel.getByRole('button', { name: /standard courier/i })).toHaveCount(0);
    await pickupMethod.click();

    const paymentPanel = page.locator('#checkout-panel-payment');
    const bankTransfer = paymentPanel.getByRole('button', { name: /bank transfer/i });
    await expect(bankTransfer).toBeVisible();
    await expect(paymentPanel.getByRole('button', { name: /credit\/debit card|blik/i })).toHaveCount(0);
    await expect(paymentPanel).toContainText(/bank transfer after the order is placed/i);
    await bankTransfer.click();

    const reviewSection = page.getByTestId('checkout-section-review');
    await expect(reviewSection).toContainText(/complete the bank transfer/i);
    await expect(reviewSection).toContainText(/pickup confirmation/i);
  });

  test('checkout blocks honestly when backend exposes no pickup method for the channel', async ({ page }) => {
    await mockPickupConfig(page);
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item', checkoutProfile: 'unconfigured' });
    await page.goto('/en/checkout');

    await fillDeliveryForm(page);
    await page.getByRole('button', { name: /continue/i }).click();

    const shippingAlert = page.getByRole('alert').filter({ hasText: /pickup is not available for this store yet/i });
    await expect(shippingAlert).toBeVisible();
    await expect(page.locator('#checkout-panel-shipping').getByRole('button', { name: /pickup in store/i })).toHaveCount(0);
  });

  test('checkout blocks honestly when backend exposes pickup but no payment methods for the channel', async ({ page }) => {
    await mockPickupConfig(page);
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item', checkoutProfile: 'pickup-no-payment' });
    await page.goto('/en/checkout');

    await fillDeliveryForm(page);
    await page.getByRole('button', { name: /continue/i }).click();

    const pickupMethod = page.locator('#checkout-panel-shipping').getByRole('button', { name: /pickup in store/i });
    await expect(pickupMethod).toBeVisible();
    await pickupMethod.click();

    await expect(page.locator('#checkout-panel-payment')).toContainText(/payment methods are not available for this store yet/i);
  });

  test('checkout complete explains insufficient stock without placing the order', async ({ page }) => {
    await mockPickupConfig(page);
    await seedCartStorage(page);
    await mockMobileStorefront(page, {
      cart: 'single-item',
      checkoutProfile: 'pickup-bank-transfer',
      checkoutComplete: 'insufficient-stock',
    });
    await page.goto('/en/checkout');

    await completePickupBankTransferSelection(page);
    const summaryPanel = page.getByTestId('mobile-checkout-summary-panel');
    await expect(summaryPanel).toBeVisible();
    await summaryPanel.getByRole('button', { name: /^close$/i }).click();
    await expect(summaryPanel).toHaveCount(0);
    await page.getByTestId('checkout-section-review').getByRole('button', { name: /place order/i }).click();

    const alert = page.getByRole('alert').filter({ hasText: /not enough stock/i });
    await expect(alert).toBeVisible();
    await expect(alert).toContainText(/review your cart/i);
    await expect(page).not.toHaveURL(/\/checkout\/confirmation/i);
  });

  test('order confirmation explains bank transfer and pickup next steps', async ({ page }) => {
    await mockPickupConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/en/checkout/confirmation?order=1001&email=marta@example.com');

    await expect(page.getByText(/#1001/i)).toBeVisible();
    await expect(page.getByText(/complete the bank transfer/i)).toBeVisible();
    await expect(page.getByText(/pickup next step/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /order history/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /continue shopping/i })).toBeVisible();
  });
});

test.describe('Kenmito category discovery', () => {
  test('groups and searches flat categories without fake child routes', async ({ page }) => {
    await mockPickupConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/en/categories');

    await expect(page.getByRole('heading', { name: /pantry essentials/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /fruit.*2 products/i })).toBeVisible();

    await page.getByLabel(/search categories/i).fill('fruit');

    await expect(page.getByRole('link', { name: /fruit.*2 products/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /bakery/i })).toHaveCount(0);
  });

  test('homepage exposes real category shortcuts and commercial links in the first mobile flow', async ({ page }) => {
    await mockPickupConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en');

    await expect(page.getByTestId('mobile-home-hero')).toBeVisible();
    await expect(page.getByRole('heading', { name: /browse categories/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /fruit/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /outlet/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /korean pantry/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /shop by storage zone/i })).toHaveCount(0);
    await expect(page.locator('[data-testid="home-category-card-image"]:visible')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: /new arrivals/i })).toHaveCount(0);

    const trust = page.locator('[data-testid="home-fulfillment-trust"]:visible');
    await expect(trust).toBeVisible();
    await expect(trust.getByText(/pickup.*available/i)).toBeVisible();
    await expect(trust.getByText(/bank transfer/i)).toBeVisible();
    await expect(trust.getByText(/manual confirmation/i)).toBeVisible();
  });

  test('does not invent a desktop promotion carousel when config has no banners', async ({ page }) => {
    await mockPickupConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en');

    await expect(page.locator('[aria-roledescription="carousel"]')).toHaveCount(0);
  });
});
