import { expect, test } from '@playwright/test';
import asiaDeliGoConfig from '../public/config/asiandeligo.json';
import { mockMobileStorefront, seedAuthSession } from './mobile-fixtures';

// SPEC SOURCES:
// - PRD sections 2.1 and 5.1: the storefront must remain fast and usable on
//   mobile/tablet without horizontal scrolling.
// - PRD section 3.2: store staff must be able to control homepage promotions.
// - Landing audit 2026-07-21: the complete header does not fit below 1280px;
//   category artwork needs an explicit contain/cover contract.

type GridImageFit = 'contain' | 'cover';

async function mockAsiaDeliGoConfig(page: Parameters<typeof mockMobileStorefront>[0], imageFit?: GridImageFit) {
  const envelope = structuredClone(asiaDeliGoConfig);
  const gridBlocks = envelope.config.homepage.blocks.filter((block) => block.type === 'grid');

  for (const block of gridBlocks) {
    if (imageFit) {
      Object.assign(block, { imageFit });
    } else {
      delete (block as typeof block & { imageFit?: GridImageFit }).imageFit;
    }
  }

  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(envelope),
    });
  });
}

test.describe('landing responsive contracts', () => {
  test.use({ hasTouch: false, isMobile: false });

  test('keeps the phone header compact at mobile boundaries', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);

    for (const width of [375, 767]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/pl/products');

      const header = page.getByTestId('mobile-sticky-header');
      const menuButton = header.getByRole('button', { name: /otwórz menu|open menu/i });

      await expect(header.locator('img[alt="Asia Deli Go"]')).toBeVisible();
      await expect(header.getByRole('button', { name: /otwórz wyszukiwarkę|open search/i })).toBeVisible();
      await expect(page.locator('#desktop-search')).toBeHidden();
      await expect(header.getByRole('navigation', { name: 'Main navigation' })).toBeHidden();
      await expect(menuButton).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);

      await menuButton.click();
      await expect(page.locator('#mobile-nav')).toBeVisible();
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
      await page.keyboard.press('Escape');
      await expect(page.locator('#mobile-nav')).toHaveCount(0);
    }
  });

  test('uses compact tablet navigation until the complete header safely fits', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);

    for (const width of [768, 1024, 1200, 1279]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/pl/products');

      const header = page.getByTestId('mobile-sticky-header');
      await expect(header.locator('img[alt="Asia Deli Go"]')).toBeVisible();
      const menuButton = header.getByRole('button', { name: /otwórz menu|open menu/i });
      const desktopNavigation = header.getByRole('navigation', { name: 'Main navigation' });

      await expect(page.locator('#desktop-search')).toBeVisible();
      await expect(menuButton).toBeVisible();
      await expect(desktopNavigation).toBeHidden();
      await expect.poll(() => page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))).toEqual({ clientWidth: width, scrollWidth: width });

      await menuButton.click();
      await expect(page.locator('#mobile-nav')).toBeVisible();
      await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
      await page.keyboard.press('Escape');
      await expect(page.locator('#mobile-nav')).toHaveCount(0);
    }

    for (const width of [1280, 1535, 1536, 1600]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/pl/products');

      const desktopHeader = page.getByTestId('mobile-sticky-header');
      await expect(desktopHeader.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
      await expect(desktopHeader.getByRole('link', { name: /Zaloguj się|Log in/i })).toBeVisible();
      await expect(desktopHeader.getByRole('button', { name: /otwórz menu|open menu/i })).toBeHidden();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  });

  test('keeps a long authenticated account identity inside every tested viewport', async ({ page }) => {
    const fullName = 'Alexandra Mobile Shopper With A Very Long Account Name';

    await mockAsiaDeliGoConfig(page);
    await seedAuthSession(page, fullName);
    await mockMobileStorefront(page);

    for (const width of [375, 767, 768, 1279, 1280, 1440, 1536, 1600]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/pl/products');

      const header = page.getByTestId('mobile-sticky-header');
      const accountButton = header.getByRole('button', { name: fullName });
      const menuButton = header.getByRole('button', { name: /otwórz menu|open menu/i });
      const desktopNavigation = header.getByRole('navigation', { name: 'Main navigation' });

      if (width < 768) {
        await expect(accountButton).toBeHidden();
      } else {
        await expect(accountButton).toBeVisible();
      }

      if (width < 1280) {
        await expect(menuButton).toBeVisible();
        await expect(desktopNavigation).toBeHidden();
      } else {
        await expect(menuButton).toBeHidden();
        await expect(desktopNavigation).toBeVisible();
      }

      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    }
  });

  test('clears hidden navigation state when crossing the desktop breakpoint', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1279, height: 900 });
    await page.goto('/pl/products');

    const header = page.getByTestId('mobile-sticky-header');
    await header.getByRole('button', { name: /otwórz menu|open menu/i }).click();
    await expect(page.locator('#mobile-nav')).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('#mobile-nav')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');

    const desktopNavigation = header.getByRole('navigation', { name: 'Main navigation' });
    await desktopNavigation.getByRole('link', { name: /Kategorie|Categories/i }).hover();
    await expect(page.getByTestId('category-mega-menu')).toBeVisible();
    await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');

    await page.setViewportSize({ width: 1279, height: 900 });
    await expect(page.getByTestId('category-mega-menu')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
    await expect(header.getByRole('button', { name: /otwórz menu|open menu/i })).toBeVisible();
  });

  for (const imageFit of ['contain', 'cover'] as const) {
    test(`renders configured category artwork with ${imageFit} fit`, async ({ page }) => {
      await mockAsiaDeliGoConfig(page, imageFit);
      await mockMobileStorefront(page);
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/pl');

      const image = page.locator('img[alt="Sosy i pasty"]:visible').first();
      await expect(image).toBeVisible();
      await expect.poll(() => image.evaluate((element) => {
        const styles = getComputedStyle(element);
        return { objectFit: styles.objectFit, paddingTop: styles.paddingTop };
      })).toEqual({
        objectFit: imageFit,
        paddingTop: imageFit === 'cover' ? '0px' : '12px',
      });

      const tile = page.getByRole('link', { name: /Sosy i pasty/i }).first();
      await expect(tile).toHaveAttribute('href', '/categories/sosy-pasty-i-przyprawy');
    });
  }

  test('orders the Asia Deli Go homepage for shopping before promotion repetition', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/pl');

    const hero = page.getByTestId('desktop-home-hero');
    const pickupGuide = page.locator('[data-testid="home-pickup-guide"]:visible');
    const categories = page.locator('[data-testid="home-configured-category-grid"]:visible');
    const products = page.getByTestId('desktop-home-fresh-picks');
    const promotion = page.locator('[data-testid="home-configured-promo"]:visible');

    await expect(hero).toBeVisible();
    await expect(pickupGuide).toContainText('Jak odebrać zamówienie');
    await expect(categories.getByTestId('home-configured-category-link')).toHaveCount(9);
    await expect(products).toBeVisible();
    await expect(promotion).toHaveCount(1);
    await expect(page.locator('[data-testid="home-category-shortcuts"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-testid="home-campaign-band"]:visible')).toHaveCount(0);
    const desktopNavigation = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(desktopNavigation.getByRole('link', { name: 'Strona główna' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(desktopNavigation.getByRole('link', { name: 'Koreańska spiżarnia' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );

    const positions = await Promise.all(
      [hero, pickupGuide, categories, products, promotion].map((locator) =>
        locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
      )
    );
    expect(positions).toEqual([...positions].sort((left, right) => left - right));
  });
});
