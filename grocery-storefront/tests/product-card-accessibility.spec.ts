import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

test.describe('product card interactive semantics', () => {
  test('desktop cards keep their product link and actions as independent controls', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const card = page.getByTestId('product-card').first();
    const productLink = card.getByTestId('product-card-link');

    await expect(page.locator('[data-testid="product-card"] a button, [data-testid="product-card"] button a')).toHaveCount(0);
    await expect(productLink).toHaveAttribute('href', '/en/products/organic-gala-apples');
    await expect(card.getByRole('button', { name: /add to cart/i })).toBeVisible();
    await expect(card.getByTestId('product-card-image-counter')).toHaveCSS('pointer-events', 'none');
    await expect(card.getByTestId('product-card-freshness-badge')).toHaveCSS('pointer-events', 'none');
    await expect(card.getByTestId('product-card-desktop-actions')).toHaveCSS('pointer-events', 'none');
    await expect(card.getByTestId('product-card-wishlist-desktop')).toHaveCSS('pointer-events', 'auto');

    await card.getByRole('button', { name: /add to cart/i }).click();
    await expect(page).toHaveURL(/\/en\/products$/);

    await productLink.focus();
    await expect(productLink).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/en\/products\/organic-gala-apples$/);
  });

  test('mobile cards preserve separate 44px quick actions without nested interactivity', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const card = page.getByTestId('mobile-product-card').first();
    const productLink = card.getByTestId('mobile-product-card-link');
    const addButton = card.getByTestId('mobile-product-card-add');
    const wishlistButton = card.getByTestId('mobile-product-card-wishlist');

    await expect(page.locator('[data-testid="mobile-product-card"] a button, [data-testid="mobile-product-card"] button a')).toHaveCount(0);
    await expect(productLink).toHaveAttribute('href', '/en/products/organic-gala-apples');
    await expect(card.getByTestId('mobile-product-card-image-counter')).toHaveCSS('pointer-events', 'none');

    for (const control of [addButton, wishlistButton]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await wishlistButton.click();
    await expect(page).toHaveURL(/\/en\/products$/);
    await expect(wishlistButton).toHaveAttribute('aria-pressed', 'true');
  });
});
