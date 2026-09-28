import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// The curated ADG landing (homepage.showcase) as shipped in public/config.
const ADG_CONFIG = JSON.parse(readFileSync(path.join(process.cwd(), 'public/config/asiandeligo.json'), 'utf8'));
const LIVE_GENERAL = {
  address: 'Zamieniecka 80/12, 04-158 Warszawa (Centrum Handlowe Szembeka)',
  openingHours: [
    { label: 'Pon. – Sob.', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], opens: '7:00', closes: '19:00' },
    { label: 'Niedziela', days: ['Sunday'], opens: null, closes: null },
  ],
};

async function mockShowcaseConfig(page: Page, patch: (config: typeof ADG_CONFIG.config) => void = () => {}) {
  const envelope = structuredClone(ADG_CONFIG);
  Object.assign(envelope.config.general, LIVE_GENERAL);
  patch(envelope.config);
  await page.route('**/api/config/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(envelope),
  }));
}

test.describe('showcase landing', () => {
  test('phone: one-line promises of equal height, readable hero with a real CTA, no screen-eating section', async ({ page }, testInfo) => {
    test.skip(!testInfo.project.use.isMobile, 'phone layout');
    await mockShowcaseConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/pl');

    await expect(page.getByTestId('showcase-home')).toBeVisible();
    await expect(page.getByTestId('home-trust-row')).toHaveCount(0);

    // The owner's complaint (28/09): four cards of different heights filling a screen.
    const usp = page.getByTestId('showcase-usp-item');
    await expect(usp).toHaveCount(4);
    const heights = await usp.evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().height)));
    expect(new Set(heights).size).toBe(1);
    const strip = await page.getByTestId('showcase-usp').boundingBox();
    expect(strip!.height).toBeLessThanOrEqual(90);

    const hero = page.getByTestId('showcase-hero');
    const firstSlide = hero.getByTestId('showcase-hero-slide').first();
    await expect(firstSlide).toContainText('Ramen, który rozgrzewa');
    await expect(firstSlide.getByTestId('showcase-hero-cta')).toHaveAttribute('href', '/categories/ramyun-w-paczce');
    await expect.poll(() => firstSlide.locator('img').evaluate((img) => (img as HTMLImageElement).currentSrc)).toContain('hero-ramen-mobile.webp');

    const viewport = page.viewportSize()!;
    for (const testId of ['showcase-hero', 'showcase-usp', 'showcase-categories']) {
      const box = await page.getByTestId(testId).boundingBox();
      expect(box!.height, testId).toBeLessThanOrEqual(viewport.height * 0.6);
    }

    // Category tiles are the hub groups the catalog serves, named by the tree.
    await expect(page.getByTestId('showcase-categories')).toContainText('Makaron i ryż');
    await expect(page.getByTestId('showcase-cuisine-card')).toHaveCount(5);
    await expect(page.getByTestId('showcase-step')).toHaveCount(3);
  });

  test('shop block: address, hours and directions; maps, photo, reviews and social stay hidden until configured', async ({ page }) => {
    await mockShowcaseConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/pl');

    const store = page.getByTestId('showcase-store');
    await expect(store).toContainText('Zamieniecka 80/12');
    await expect(store).toContainText('Pon. – Sob.');
    await expect(store.getByTestId('showcase-store-directions')).toHaveAttribute('href', /google\.com\/maps\/search\/.*Zamieniecka/);
    await expect(store.getByTestId('showcase-store-reviews')).toHaveCount(0);
    await expect(store.getByTestId('showcase-store-social')).toHaveCount(0);
    await expect(store.locator('img')).toHaveCount(0);
  });

  test('shop block shows the owner links once they exist', async ({ page }) => {
    await mockShowcaseConfig(page, (config) => {
      config.homepage.showcase.store = {
        mapsUrl: 'https://maps.app.goo.gl/example',
        photoUrl: '/brand/showcase/cuisine-korean.webp',
        reviews: { rating: 4.8, count: 37, url: 'https://g.page/r/example/review' },
      };
      config.general.socialLinks = [{ platform: 'instagram', url: 'https://instagram.com/asiadeligo' }];
    });
    await mockMobileStorefront(page);
    await page.goto('/pl');

    const store = page.getByTestId('showcase-store');
    await expect(store.getByTestId('showcase-store-directions')).toHaveAttribute('href', 'https://maps.app.goo.gl/example');
    await expect(store.getByTestId('showcase-store-reviews')).toContainText('4.8 · 37 opinii');
    await expect(store.getByTestId('showcase-store-social')).toBeVisible();
    await expect(store.locator('img[alt="Sklep Asia Deli Go"]')).toHaveCount(1);
  });

  test('rails settle: each shown rail has 3+ products, no multipacks, no endless skeleton', async ({ page }) => {
    await mockShowcaseConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/pl');

    await expect(page.getByTestId('showcase-rail').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('showcase-rail').locator('.skeleton')).toHaveCount(0);
    for (const rail of await page.getByTestId('showcase-rail').all()) {
      const names = await rail.getByTestId('showcase-rail-item').allInnerTexts();
      expect(names.length).toBeGreaterThanOrEqual(3);
      expect(names.join('\n')).not.toMatch(/karton|zestaw|\d+\s*x\s*\d/i);
    }
  });

  test('English copy, collapsed about text and payment methods in the footer', async ({ page }) => {
    await mockShowcaseConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/en');

    await expect(page.getByTestId('showcase-hero-slide').first()).toContainText('Ramen that warms you up');
    await expect(page.getByTestId('showcase-usp')).toContainText('Pickup in Warsaw');
    await expect(page.getByTestId('showcase-steps')).toContainText('Order online, collect in store');

    const about = page.getByTestId('home-seo-text');
    await expect(about.getByText('Read more')).toBeVisible();
    await expect(about.locator('details p').first()).toBeHidden();
    await about.getByText('Read more').click();
    await expect(about.locator('details p').first()).toBeVisible();

    await expect(page.getByTestId('footer-payment-methods')).toContainText('BLIK');
    await expect(page.getByTestId('footer-service-notes')).toHaveCount(0);
  });

  test('desktop: headline over the art, promises in one row', async ({ page }, testInfo) => {
    test.skip(Boolean(testInfo.project.use.isMobile), 'desktop layout');
    await page.setViewportSize({ width: 1366, height: 900 });
    await mockShowcaseConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/pl');

    const slide = page.getByTestId('showcase-hero-slide').first();
    const image = await slide.locator('img').boundingBox();
    const cta = await slide.getByTestId('showcase-hero-cta').boundingBox();
    expect(cta!.y + cta!.height).toBeLessThanOrEqual(image!.y + image!.height);
    const tops = await page.getByTestId('showcase-usp-item').evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().top)));
    expect(new Set(tops).size).toBe(1);
  });
});
