import { expect, test } from '@playwright/test';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

// SPEC SOURCES:
// - PRD section 3.2: shoppers review cart contents and adjust quantities before checkout.
// - PRD section 5.3: Cart must support zone-grouped items and shipping progress.
// - `.claude/docs/progress.md`: page-by-page accessibility audit is in progress.

test.describe('cart accessibility', () => {
  test('keeps cart line actions uniquely named for keyboard shoppers', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    await expect(page.getByRole('heading', { name: /your cart/i })).toBeVisible();
    await expect(page.getByTestId('mobile-bottom-nav')).toHaveCount(0);

    const cartItem = page.getByTestId('cart-item').first();
    await expect(cartItem).toBeVisible();
    await expect(cartItem.getByRole('button', { name: /decrease organic gala apples family value pack quantity/i })).toBeVisible();
    await expect(cartItem.getByRole('button', { name: /increase organic gala apples family value pack quantity/i })).toBeVisible();
    await expect(cartItem.getByRole('button', { name: /remove organic gala apples family value pack/i })).toBeVisible();
    await expect(cartItem.getByRole('button', { name: /save organic gala apples family value pack for later/i })).toBeVisible();
  });

  test('keeps the mobile checkout CTA reachable when the bottom nav is hidden', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const summaryBar = page.getByTestId('mobile-cart-summary-bar');
    await expect(summaryBar).toBeVisible();
    await expect(summaryBar.getByRole('link', { name: /proceed to checkout/i })).toBeVisible();
  });
});
