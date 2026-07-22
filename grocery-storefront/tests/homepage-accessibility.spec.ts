import { expect, test } from '@playwright/test';
import asiaDeliGoConfig from '../public/config/asiandeligo.json';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCES:
// - PRD section 3.2: mobile shoppers need to browse quickly on the go.
// - PRD section 5.1: mobile-first, fast storefront experience.
// - `.claude/docs/progress.md`: accessibility is partial; full audit pending.
// - Page-by-page audit plan: homepage is the first purchase-flow entry point.

test.use({
  hasTouch: false,
  isMobile: false,
  viewport: { width: 390, height: 844 },
});

async function mockHeroBlockConfig(
  page: Parameters<typeof mockMobileStorefront>[0],
  { headline, firstSlideTitle = '' }: { headline: string; firstSlideTitle?: string }
) {
  const envelope = structuredClone(asiaDeliGoConfig);
  envelope.config.homepage.hero.headline = headline;
  const heroBlock = envelope.config.homepage.blocks.find((block: { type: string }) => block.type === 'hero');
  heroBlock.slides[0].title = firstSlideTitle;

  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope),
    });
  });
}

test.describe('homepage accessibility', () => {
  test('lets keyboard shoppers skip the repeated homepage header', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en');

    await page.keyboard.press('Tab');

    const skipControl = page.getByRole('button', { name: /skip to content/i });
    await expect(skipControl).toBeFocused();
    await expect(skipControl).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('gives a configured hero one page heading and meaningful Polish image alternatives', async ({ page }) => {
    await mockHeroBlockConfig(page, {
      headline: 'Azjatyckie produkty spożywcze na co dzień',
      firstSlideTitle: 'Smaki Korei',
    });
    await mockMobileStorefront(page);
    await page.goto('/pl');

    const main = page.locator('#main-content');
    const heroImages = page.getByTestId('mobile-home-hero').locator('img');

    await expect(main.locator('h1')).toHaveCount(1);
    await expect(main.locator('h1')).toHaveText('Azjatyckie produkty spożywcze na co dzień');
    await expect(heroImages).toHaveCount(6);
    await expect(heroImages.nth(0)).toHaveAttribute('alt', 'Smaki Korei');
    await expect(heroImages.nth(1)).toHaveAttribute(
      'alt',
      'Azjatyckie produkty spożywcze na co dzień — slajd 2'
    );
    await expect(
      page.getByTestId('mobile-home-hero').getByRole('link', {
        name: /przeglądaj azjatyckie produkty spożywcze na co dzień/i,
      })
    ).toHaveAttribute('href', '/products');
    const carouselDots = page.getByTestId('mobile-home-hero').getByRole('button', {
      name: /przejdź do slajdu/i,
    });
    await expect(carouselDots).toHaveCount(6);
    for (let index = 0; index < 6; index += 1) {
      const box = await carouselDots.nth(index).boundingBox();
      expect(box).not.toBeNull();
      expect(Math.round(box!.width)).toBeGreaterThanOrEqual(44);
      expect(Math.round(box!.height)).toBeGreaterThanOrEqual(44);
    }
    await expect(main.locator('img[alt^="Store promotion banner"]')).toHaveCount(0);
  });

  test('uses the localized homepage heading when configured hero copy is blank', async ({ page }) => {
    await mockHeroBlockConfig(page, { headline: '   ' });
    await mockMobileStorefront(page);
    await page.goto('/pl');

    const main = page.locator('#main-content');
    const firstHeroImage = page.getByTestId('mobile-home-hero').locator('img').first();

    await expect(main.locator('h1')).toHaveCount(1);
    await expect(main.locator('h1')).toHaveText('Świeże produkty, prosto do Twoich drzwi');
    await expect(firstHeroImage).toHaveAttribute(
      'alt',
      'Świeże produkty, prosto do Twoich drzwi — slajd 1'
    );
  });
});
