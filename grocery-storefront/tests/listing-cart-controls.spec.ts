import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCES:
// - `.claude/docs/progress.md`: ProductCard and MobileProductCard already own
//   listing add-to-cart affordances; cart state must stay consistent across
//   header, listing cards, and the cart page.
// - Storefront next scope, 2026-05-22: make the Kamito catalog shopping loop
//   behave like Kimchi-style fast grocery browsing: list -> add -> +/- -> cart.

test.describe('listing cart controls', () => {
  test('desktop product cards switch to cart quantity controls after add and keep cart in sync', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const card = page.getByTestId('product-card').first();
    await expect(card.getByTestId('product-card-title')).toContainText(/organic gala apples/i);
    await expect(card.getByTestId('product-card-quantity')).toHaveAttribute('data-in-cart', 'false');

    await card.getByRole('button', { name: /add to cart/i }).click();

    await expect(card.getByTestId('product-card-quantity')).toHaveAttribute('data-in-cart', 'true');
    await expect(card.getByTestId('product-card-quantity-value')).toHaveText('1');
    await expect(page.getByRole('link', { name: /cart, 1 item/i })).toBeVisible();

    await card.getByRole('button', { name: /increase organic gala apples family value pack quantity/i }).click();

    await expect(card.getByTestId('product-card-quantity-value')).toHaveText('2');
    await expect(page.getByRole('link', { name: /cart, 2 items/i })).toBeVisible();

    await page.goto('/en/cart');
    const cartItem = page.getByTestId('cart-item').first();

    await expect(cartItem).toContainText(/organic gala apples family value pack/i);
    await expect(cartItem).toContainText('2');
  });

  test('mobile product cards use the same stepper for cart quantity after add', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const card = page.getByTestId('mobile-product-card').first();

    await expect(card.getByTestId('mobile-product-card-stepper')).toHaveCount(0);
    await card.getByTestId('mobile-product-card-add').click();

    const stepper = card.getByTestId('mobile-product-card-stepper');
    await expect(stepper).toHaveAttribute('data-in-cart', 'true');
    await expect(card.getByTestId('mobile-product-card-quantity-value')).toHaveText('1');
    await expect(page.getByTestId('mobile-bottom-nav-cart-badge')).toHaveText('1');

    await card.getByRole('button', { name: /increase organic gala apples family value pack quantity/i }).click();

    await expect(card.getByTestId('mobile-product-card-quantity-value')).toHaveText('2');
    await expect(page.getByTestId('mobile-bottom-nav-cart-badge')).toHaveText('2');
  });
});
