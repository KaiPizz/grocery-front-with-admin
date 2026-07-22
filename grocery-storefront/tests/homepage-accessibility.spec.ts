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
  {
    headline,
    firstSlideTitle = '',
    autoPlay = false,
    autoPlayInterval,
  }: {
    headline: string;
    firstSlideTitle?: string;
    autoPlay?: boolean;
    autoPlayInterval?: number;
  }
) {
  const envelope = structuredClone(asiaDeliGoConfig);
  envelope.config.homepage.hero.headline = headline;
  const heroBlock = envelope.config.homepage.blocks.find((block: { type: string }) => block.type === 'hero');
  heroBlock.autoPlay = autoPlay;
  if (autoPlayInterval !== undefined) heroBlock.autoPlayInterval = autoPlayInterval;
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
    const mobileHero = page.getByTestId('mobile-home-hero');
    const carouselDots = mobileHero.getByRole('button', {
      name: /przejdź do slajdu/i,
    });
    await expect(carouselDots).toHaveCount(6);
    // Owner-approved mobile controls stay visible without overpowering the hero artwork.
    const mobileCarousel = mobileHero.locator('[aria-roledescription="carousel"]');
    const indicatorRowBox = await mobileHero
      .getByTestId('hero-carousel-indicators')
      .boundingBox();
    const mobileCarouselBox = await mobileCarousel.boundingBox();
    expect(indicatorRowBox).not.toBeNull();
    expect(mobileCarouselBox).not.toBeNull();
    expect(Math.round(indicatorRowBox!.width)).toBeLessThanOrEqual(120);
    expect(
      Math.round(
        mobileCarouselBox!.y +
          mobileCarouselBox!.height -
          (indicatorRowBox!.y + indicatorRowBox!.height)
      )
    ).toBeLessThanOrEqual(3);
    for (let index = 0; index < 6; index += 1) {
      const box = await carouselDots.nth(index).boundingBox();
      const indicatorBox = await carouselDots
        .nth(index)
        .getByTestId('hero-carousel-indicator')
        .boundingBox();
      expect(box).not.toBeNull();
      expect(Math.round(box!.width)).toBeGreaterThanOrEqual(20);
      expect(Math.round(box!.width)).toBeLessThanOrEqual(20);
      expect(Math.round(box!.height)).toBeGreaterThanOrEqual(36);
      expect(Math.round(box!.height)).toBeLessThanOrEqual(36);
      expect(indicatorBox).not.toBeNull();
      expect(Math.round(indicatorBox!.width)).toBeLessThanOrEqual(10);
      expect(Math.round(indicatorBox!.height)).toBeLessThanOrEqual(4);
      const indicatorBottomGap =
        mobileCarouselBox!.y + mobileCarouselBox!.height - (indicatorBox!.y + indicatorBox!.height);
      expect(Math.round(indicatorBottomGap)).toBeGreaterThanOrEqual(3);
      expect(Math.round(indicatorBottomGap)).toBeLessThanOrEqual(6);
    }
    const previous = mobileHero.getByRole('button', { name: 'Poprzedni slajd' });
    const next = mobileHero.getByRole('button', { name: 'Następny slajd' });
    await expect(previous).toBeVisible();
    await expect(next).toBeVisible();
    const previousBox = await previous.boundingBox();
    const nextBox = await next.boundingBox();
    expect(previousBox).not.toBeNull();
    expect(nextBox).not.toBeNull();
    expect(Math.round(previousBox!.width)).toBeGreaterThanOrEqual(44);
    expect(Math.round(previousBox!.height)).toBeGreaterThanOrEqual(44);
    expect(Math.round(nextBox!.width)).toBeGreaterThanOrEqual(44);
    expect(Math.round(nextBox!.height)).toBeGreaterThanOrEqual(44);
    const arrowVisuals = mobileHero.getByTestId('hero-carousel-arrow-visual');
    await expect(arrowVisuals).toHaveCount(2);
    for (let index = 0; index < 2; index += 1) {
      const arrowVisualBox = await arrowVisuals.nth(index).boundingBox();
      expect(arrowVisualBox).not.toBeNull();
      expect(Math.round(arrowVisualBox!.width)).toBeLessThanOrEqual(28);
      expect(Math.round(arrowVisualBox!.height)).toBeLessThanOrEqual(28);
    }
    expect(previousBox!.x - mobileCarouselBox!.x).toBeLessThanOrEqual(4);
    expect(
      mobileCarouselBox!.x + mobileCarouselBox!.width - (nextBox!.x + nextBox!.width)
    ).toBeLessThanOrEqual(4);
    await expect(carouselDots.nth(0)).toHaveAttribute('aria-current', 'true');
    await next.click();
    await expect(carouselDots.nth(1)).toHaveAttribute('aria-current', 'true');
    await previous.click();
    await expect(carouselDots.nth(0)).toHaveAttribute('aria-current', 'true');

    await page.setViewportSize({ width: 320, height: 700 });
    const narrowCarouselBox = await mobileCarousel.boundingBox();
    const narrowPreviousBox = await previous.boundingBox();
    const narrowNextBox = await next.boundingBox();
    const narrowIndicatorRowBox = await mobileHero
      .getByTestId('hero-carousel-indicators')
      .boundingBox();
    expect(narrowCarouselBox).not.toBeNull();
    expect(narrowPreviousBox).not.toBeNull();
    expect(narrowNextBox).not.toBeNull();
    expect(narrowIndicatorRowBox).not.toBeNull();
    expect(narrowPreviousBox!.x).toBeGreaterThanOrEqual(narrowCarouselBox!.x);
    expect(narrowNextBox!.x + narrowNextBox!.width).toBeLessThanOrEqual(
      narrowCarouselBox!.x + narrowCarouselBox!.width
    );
    expect(narrowPreviousBox!.x + narrowPreviousBox!.width).toBeLessThan(
      narrowIndicatorRowBox!.x
    );
    expect(narrowNextBox!.x).toBeGreaterThan(
      narrowIndicatorRowBox!.x + narrowIndicatorRowBox!.width
    );
    await expect(main.locator('img[alt^="Store promotion banner"]')).toHaveCount(0);
  });

  test('uses edge arrows and lets mobile shoppers swipe between slides', async ({ page }) => {
    await mockHeroBlockConfig(page, {
      headline: 'Azjatyckie produkty spożywcze na co dzień',
    });
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl');

    const desktopHero = page.getByTestId('desktop-home-hero');
    const desktopCarousel = desktopHero.locator('[aria-roledescription="carousel"]');
    const desktopDots = desktopHero.getByRole('button', { name: /przejdź do slajdu/i });
    const previous = desktopHero.getByRole('button', { name: 'Poprzedni slajd' });
    const next = desktopHero.getByRole('button', { name: 'Następny slajd' });

    await expect(previous).toBeVisible();
    await expect(next).toBeVisible();
    const carouselBox = await desktopCarousel.boundingBox();
    const previousBox = await previous.boundingBox();
    const nextBox = await next.boundingBox();
    expect(carouselBox).not.toBeNull();
    expect(previousBox).not.toBeNull();
    expect(nextBox).not.toBeNull();
    expect(previousBox!.width).toBeGreaterThanOrEqual(44);
    expect(previousBox!.height).toBeGreaterThanOrEqual(44);
    expect(nextBox!.width).toBeGreaterThanOrEqual(44);
    expect(nextBox!.height).toBeGreaterThanOrEqual(44);
    expect(previousBox!.x - carouselBox!.x).toBeLessThanOrEqual(16);
    expect(carouselBox!.x + carouselBox!.width - (nextBox!.x + nextBox!.width)).toBeLessThanOrEqual(
      16
    );
    await expect(desktopDots.nth(0)).toHaveAttribute('aria-current', 'true');
    await next.click();
    await expect(desktopDots.nth(1)).toHaveAttribute('aria-current', 'true');
    await previous.click();
    await expect(desktopDots.nth(0)).toHaveAttribute('aria-current', 'true');

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileHero = page.getByTestId('mobile-home-hero');
    const mobileCarousel = mobileHero.locator('[aria-roledescription="carousel"]');
    const mobileDots = mobileHero.getByRole('button', { name: /przejdź do slajdu/i });
    await expect(mobileHero).toBeVisible();
    const homepageUrl = page.url();
    await mobileCarousel.dispatchEvent('pointerdown', {
      pointerId: 1,
      isPrimary: true,
      pointerType: 'touch',
      clientX: 320,
      clientY: 160,
    });
    await mobileCarousel.dispatchEvent('pointerup', {
      pointerId: 1,
      isPrimary: true,
      pointerType: 'touch',
      clientX: 100,
      clientY: 164,
    });
    await expect(mobileDots.nth(1)).toHaveAttribute('aria-current', 'true');
    const activeLink = mobileCarousel.locator('a[tabindex="0"]');
    await expect(activeLink).toHaveAttribute('href', '/products');
    await activeLink.dispatchEvent('click');
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(homepageUrl);

    await mobileCarousel.dispatchEvent('pointerdown', {
      pointerId: 2,
      isPrimary: true,
      pointerType: 'touch',
      clientX: 240,
      clientY: 80,
    });
    await mobileCarousel.dispatchEvent('pointerup', {
      pointerId: 2,
      isPrimary: true,
      pointerType: 'touch',
      clientX: 190,
      clientY: 220,
    });
    await expect(mobileDots.nth(1)).toHaveAttribute('aria-current', 'true');

    await mobileCarousel.dispatchEvent('pointerdown', {
      pointerId: 3,
      isPrimary: true,
      pointerType: 'touch',
      clientX: 240,
      clientY: 120,
    });
    await mobileCarousel.dispatchEvent('pointerup', {
      pointerId: 3,
      isPrimary: true,
      pointerType: 'touch',
      clientX: 220,
      clientY: 122,
    });
    await expect(mobileDots.nth(1)).toHaveAttribute('aria-current', 'true');
    await activeLink.dispatchEvent('click');
    await page.waitForTimeout(600);
    await expect(page).toHaveURL(homepageUrl);

    await activeLink.click();
    await expect(page).toHaveURL(/\/products(?:[?#]|$)/);
  });

  test('disables hero autoplay when the shopper requests reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockHeroBlockConfig(page, {
      headline: 'Azjatyckie produkty spożywcze na co dzień',
      autoPlay: true,
      autoPlayInterval: 100,
    });
    await mockMobileStorefront(page);
    await page.goto('/pl');

    const dots = page
      .getByTestId('mobile-home-hero')
      .getByRole('button', { name: /przejdź do slajdu/i });
    await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');
    await page.waitForTimeout(350);
    await expect(dots.nth(0)).toHaveAttribute('aria-current', 'true');
  });

  test('keeps autoplay paused while a carousel control owns keyboard focus', async ({ page }) => {
    await mockHeroBlockConfig(page, {
      headline: 'Azjatyckie produkty spożywcze na co dzień',
      autoPlay: true,
      autoPlayInterval: 100,
    });
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl');

    const hero = page.getByTestId('desktop-home-hero');
    const carousel = hero.locator('[aria-roledescription="carousel"]');
    const dots = hero.getByRole('button', { name: /przejdź do slajdu/i });
    const next = hero.getByRole('button', { name: 'Następny slajd' });
    const carouselBox = await carousel.boundingBox();
    expect(carouselBox).not.toBeNull();

    await page.mouse.move(carouselBox!.x + carouselBox!.width / 2, carouselBox!.y + 10);
    await next.focus();
    const focusedIndex = await dots.evaluateAll((buttons) =>
      buttons.findIndex((button) => button.getAttribute('aria-current') === 'true')
    );
    expect(focusedIndex).toBeGreaterThanOrEqual(0);
    await page.mouse.move(1, 1);
    await page.waitForTimeout(350);
    await expect(dots.nth(focusedIndex)).toHaveAttribute('aria-current', 'true');
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
