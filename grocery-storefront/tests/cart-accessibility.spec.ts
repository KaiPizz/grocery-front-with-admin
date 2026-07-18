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
    await expect(page.getByTestId('mobile-bottom-nav')).toBeVisible();

    const cartItem = page.getByTestId('cart-item').first();
    await expect(cartItem).toBeVisible();
    await expect(cartItem.getByRole('button', { name: /decrease organic gala apples family value pack quantity/i })).toBeVisible();
    await expect(cartItem.getByRole('button', { name: /increase organic gala apples family value pack quantity/i })).toBeVisible();
    await expect(cartItem.getByRole('button', { name: /remove organic gala apples family value pack/i })).toBeVisible();
    await expect(cartItem.getByRole('button', { name: /save organic gala apples family value pack for later/i })).toBeVisible();
  });

  test('keeps the mobile checkout CTA reachable above the bottom nav', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const summaryBar = page.getByTestId('mobile-cart-summary-bar');
    await expect(summaryBar).toBeVisible();
    await expect(summaryBar.getByRole('link', { name: /proceed to checkout/i })).toBeVisible();
  });

  test('localizes allergen codes in the Polish cart', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/pl/cart');

    const cartItem = page.getByTestId('cart-item').first();
    await expect(cartItem).toContainText(/orzechy/i);
    await expect(cartItem).toContainText(/mleko/i);
    await expect(cartItem).not.toContainText(/tree_nuts|\bnuts\b|\bmilk\b/i);
  });

  test('persists active cart metadata so reload does not scan the product catalog', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    await page.getByTestId('product-detail-add').click();
    await expect(page.getByTestId('mobile-bottom-nav-cart-badge')).toHaveText('1');

    const persistedCart = await page.evaluate(() => JSON.parse(window.localStorage.getItem('grocery-cart') ?? '{}'));
    expect(persistedCart.state.metadataByMerchandiseId['variant-apples']).toMatchObject({
      productId: 'prod-apples',
      slug: 'organic-gala-apples',
      name: 'Organic Gala Apples Family Value Pack',
    });

    let metadataQueryCount = 0;
    page.on('request', (request) => {
      if (request.postData()?.includes('query CartProductMetadata')) {
        metadataQueryCount += 1;
      }
    });

    await page.goto('/en/cart');
    await expect(page.getByTestId('cart-item')).toContainText('Organic Gala Apples Family Value Pack');
    expect(metadataQueryCount).toBe(0);
  });
});
