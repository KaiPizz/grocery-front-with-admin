import { expect, test, type Page } from '@playwright/test';
import { mockMobileStorefront, seedAuthSession } from './mobile-fixtures';

// SPEC SOURCES:
// - Owner report 2026-09-25: wishlist photos are cropped on desktop and the
//   wishlist cards take far too much room.
// - Desktop audit 2026-09-25 (asiadeligo.com, 1366 + 1920): listing cards shrink
//   to 216px on wide screens so "add to cart" wraps onto two lines, the header
//   row overflows its container, and the web fonts never load.
// - Owner direction: layouts must be fluid, not tuned for one screen size.

const DESKTOP_WIDTHS = [1280, 1366, 1600, 1920, 2560];
const CARD_MIN = 224;
const CARD_MAX = 340;

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

test.describe('desktop layout', () => {
  test('loads the brand web fonts instead of falling back to system fonts', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto('/en/products');
    await settle(page);

    const families = await page.evaluate(() =>
      [...document.fonts].filter((face) => face.status === 'loaded').map((face) => face.family)
    );
    expect(families.some((family) => /DM.?Sans/i.test(family))).toBe(true);
    expect(families.some((family) => /Fraunces/i.test(family))).toBe(true);
  });

  for (const width of DESKTOP_WIDTHS) {
    test(`listing cards keep a readable size and a one-line cart button at ${width}px`, async ({ page }) => {
      await mockMobileStorefront(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/en/products');
      await settle(page);

      const card = page.getByTestId('product-card').first();
      await expect(card).toBeVisible();
      const cardBox = await card.boundingBox();
      expect(cardBox!.width).toBeGreaterThanOrEqual(CARD_MIN);
      expect(cardBox!.width).toBeLessThanOrEqual(CARD_MAX);

      const label = card.locator('button.checkout-btn span').first();
      const labelBox = await label.boundingBox();
      // One line of text-sm is ~20px; two lines would be ~40px.
      expect(labelBox!.height).toBeLessThan(28);
    });

    test(`header row stays inside its container at ${width}px`, async ({ page }) => {
      await mockMobileStorefront(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/en');
      await settle(page);

      const overflow = await page.evaluate(() => {
        const row = [...document.querySelectorAll<HTMLElement>('header .container-grocery')]
          .find((element) => element.style.height) ?? null;
        if (!row) return null;
        // Production Polish labels ("Koreańska spiżarnia", "DO KASY 0,00 zł") make the
        // nav ~482px and the action cluster ~336px; the fixture labels are shorter.
        const nav = row.querySelector('nav') as HTMLElement | null;
        if (nav && getComputedStyle(nav).display !== 'none') nav.style.minWidth = '482px';
        (row.lastElementChild as HTMLElement).style.minWidth = '336px';
        const style = getComputedStyle(row);
        const contentRight = row.getBoundingClientRect().right - parseFloat(style.paddingRight);
        const childRight = Math.max(...[...row.children].map((child) => child.getBoundingClientRect().right));
        return { scroll: row.scrollWidth - row.clientWidth, past: childRight - contentRight };
      });
      expect(overflow).not.toBeNull();
      expect(overflow!.scroll).toBeLessThanOrEqual(1);
      expect(overflow!.past).toBeLessThanOrEqual(1);
    });
  }

  test('tablet listing fits three columns instead of two oversized cards at 768px', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/en/products');
    await settle(page);

    const columns = await page.evaluate(() => {
      const grid = document.querySelector('.product-grid-fluid');
      return grid ? getComputedStyle(grid).gridTemplateColumns.split(' ').length : 0;
    });
    expect(columns).toBeGreaterThanOrEqual(3);
  });

  for (const width of [1366, 1920]) {
    test(`wishlist shows whole product photos in listing-sized cards at ${width}px`, async ({ page }) => {
      await seedAuthSession(page);
      await mockMobileStorefront(page, { wishlist: 'single-item' });
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/en/wishlist');
      await settle(page);

      const image = page.getByTestId('wishlist-item').first().locator('img').first();
      await expect(image).toBeVisible();
      expect(await image.evaluate((img) => getComputedStyle(img).objectFit)).toBe('contain');

      const card = page.getByTestId('wishlist-item').first();
      const cardBox = await card.boundingBox();
      expect(cardBox!.width).toBeGreaterThanOrEqual(CARD_MIN);
      expect(cardBox!.width).toBeLessThanOrEqual(CARD_MAX);
    });
  }
});
