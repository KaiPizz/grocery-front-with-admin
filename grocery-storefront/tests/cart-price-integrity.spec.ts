import { expect, test } from '@playwright/test';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

const PRODUCT_PRICE_PATTERN = /12[,.]99/;
const ZERO_PRICE_PATTERN = /0[,.]00/;

test.describe('cart price integrity', () => {
  test('keeps product prices in the header and mini cart when the cart API returns zero line costs', async ({ page }) => {
    await mockMobileStorefront(page, { cartCosts: 'zero' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const firstCard = page.getByTestId('product-card').first();
    await expect(firstCard).toContainText(PRODUCT_PRICE_PATTERN);

    await firstCard.getByRole('button', { name: /add to cart/i }).click();

    const cartLink = page.getByRole('link', { name: /cart, 1 item/i });
    await expect(cartLink).toBeVisible();
    await expect(cartLink).toContainText(PRODUCT_PRICE_PATTERN);
    await expect(cartLink).not.toContainText(ZERO_PRICE_PATTERN);

    await cartLink.hover();
    const miniCart = page.getByRole('dialog', { name: /your cart/i });
    await expect(miniCart).toBeVisible();
    await expect(miniCart).toContainText(PRODUCT_PRICE_PATTERN);
    await expect(miniCart).not.toContainText(ZERO_PRICE_PATTERN);
  });

  test('keeps product prices on the cart page when cart totals are zeroed by the API', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item', cartCosts: 'zero' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/cart');

    await expect(page.getByRole('heading', { name: /your cart/i }).first()).toBeVisible();
    await expect(page.getByTestId('cart-item').first()).toContainText(PRODUCT_PRICE_PATTERN);
    const cartSummary = page.getByRole('heading', { name: 'Your cart', exact: true }).locator('..');
    await expect(cartSummary).toContainText(PRODUCT_PRICE_PATTERN);
    await expect(cartSummary).not.toContainText(ZERO_PRICE_PATTERN);
  });

  test('keeps product prices in checkout summary when cart totals are zeroed by the API', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item', cartCosts: 'zero' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/checkout');

    await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible();
    const orderSummary = page.getByRole('heading', { name: /order summary/i }).locator('..');
    await expect(orderSummary).toContainText(PRODUCT_PRICE_PATTERN);
    await expect(orderSummary).not.toContainText(ZERO_PRICE_PATTERN);
  });
});
