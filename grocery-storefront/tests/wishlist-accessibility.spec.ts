import { expect, test } from '@playwright/test';
import { mockMobileStorefront, seedAuthSession } from './mobile-fixtures';

// SPEC SOURCES:
// - PRD section 3.2: shoppers need a wishlist so saved items can be reused.
// - PRD section 5.1: mobile-first, fast storefront experience.
// - `.claude/docs/progress.md`: page-by-page accessibility audit is in progress.
// - Bottom-nav audit order: Wishlist is the tab after Home.

test.describe('wishlist accessibility', () => {
  test('explains the desktop wishlist shortcut on keyboard focus', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en');

    const wishlistShortcut = page.locator('header').getByRole('link', { name: /wishlist/i }).first();

    await wishlistShortcut.focus();

    const popover = page.getByTestId('header-wishlist-popover');
    await expect(popover).toBeVisible();
    await expect(popover).toContainText(/save for later/i);
  });

  test('keeps saved-item links and actions uniquely named for keyboard shoppers', async ({ page }) => {
    await seedAuthSession(page);
    await mockMobileStorefront(page, { wishlist: 'single-item' });
    await page.goto('/en/wishlist');

    await expect(page.getByRole('heading', { name: /wishlist/i })).toBeVisible();

    const productLinks = page.locator('a[href$="/products/organic-gala-apples"]');
    const keyboardProductLinkNames = await productLinks.evaluateAll((links) => {
      return links
        .filter((link) => {
          const element = link as HTMLAnchorElement;
          return element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true';
        })
        .map((link) => {
          const element = link as HTMLAnchorElement;
          return element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
        });
    });

    expect(keyboardProductLinkNames).toEqual(['Organic Gala Apples Family Value Pack']);
    await expect(page.getByRole('button', { name: /add organic gala apples family value pack to cart/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /remove from wishlist organic gala apples family value pack/i })).toBeVisible();
  });
});
