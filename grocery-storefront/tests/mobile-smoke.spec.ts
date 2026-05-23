import { expect, test } from '@playwright/test';
import { mockMobileStorefront, seedAuthSession, seedCartStorage } from './mobile-fixtures';

test.describe('mobile storefront smoke', () => {
  test('uses the header as the only products search surface and avoids duplicate field ids', async ({ page }) => {
    await mockMobileStorefront(page);
    const widths = [320, 375, 390, 430, 768];

    for (const width of widths) {
      await page.setViewportSize({ width, height: width >= 768 ? 900 : 780 });
      await page.goto('/en/products?search=apples');
      const productCardTestId = width < 768 ? 'mobile-product-card' : 'product-card';
      await expect(page.getByTestId(productCardTestId).first()).toBeVisible();
      await expect(page.locator('#product-search')).toHaveCount(0);
      await expect(page.getByTestId('products-page-search')).toHaveCount(0);

      const duplicateIds = await page.evaluate(() => {
        const ids = Array.from(document.querySelectorAll<HTMLElement>('[id]'))
          .map((element) => element.id)
          .filter(Boolean);

        return ids.filter((id, index) => ids.indexOf(id) !== index);
      });

      expect(duplicateIds).toEqual([]);

      if (width < 768) {
        await page.getByRole('button', { name: /open search/i }).click();
        const visibleSearch = page.locator('input[type="search"]:visible');
        await expect(visibleSearch).toHaveCount(1);
        await expect(visibleSearch).toHaveValue('apples');
      } else {
        const desktopSearch = page.locator('#desktop-search');
        await expect(desktopSearch).toBeVisible();
        await expect(desktopSearch).toHaveValue('apples');
        await expect(page.locator('input[type="search"]:visible')).toHaveCount(1);
      }
    }
  });

  test('loads the search index only for the active mobile search surface', async ({ page }) => {
    let searchIndexCalls = 0;

    await mockMobileStorefront(page, {
      onSearchProductsIndexQuery: () => {
        searchIndexCalls += 1;
      },
    });

    await page.goto('/en/products?search=apples');
    await expect(page.locator('input[type="search"]:visible')).toHaveCount(0);
    await page.waitForTimeout(400);
    expect(searchIndexCalls).toBe(0);
  });

  test('keeps the mobile header focused on primary actions and moves secondary controls into the menu', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products');

    const mobileHeader = page.getByTestId('mobile-sticky-header');
    await expect(page.getByRole('button', { name: /open search/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /open menu/i })).toBeVisible();
    await expect(page.getByTestId('mobile-header-wishlist')).toHaveCount(0);
    await expect(mobileHeader.getByRole('link', { name: /^cart/i })).toHaveCount(0);
    await expect(page.getByTestId('mobile-bottom-nav-home')).toBeVisible();
    await expect(page.getByTestId('mobile-bottom-nav-wishlist')).toBeVisible();
    await expect(page.getByTestId('mobile-bottom-nav-cart')).toBeVisible();
    await expect(page.getByTestId('mobile-header-theme')).toHaveCount(0);
    await expect(page.getByTestId('mobile-header-language')).toBeHidden();

    await page.getByRole('button', { name: /open menu/i }).click();

    await expect(page.getByTestId('mobile-nav-theme')).toHaveCount(0);
    await expect(page.getByTestId('mobile-nav-language')).toBeVisible();
  });

  test('ignores stale dark theme preference because theme switching is disabled', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.addInitScript(() => {
      window.localStorage.setItem('grocery-theme', 'dark');
    });

    await page.goto('/en/products');

    await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme ?? '')).not.toBe('dark');
  });

  test('opens mobile filters in a drawer and uses overlay product actions', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 375, height: 780 });
    await page.goto('/en/products');

    await page.getByRole('button', { name: /filters/i }).click();
    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await expect(filterSheet).toBeVisible();
    await expect(filterSheet.getByRole('button', { name: /close filters/i }).nth(1)).toBeVisible();
    await filterSheet.locator(':scope > button').evaluate((element: HTMLButtonElement) => element.click());
    await expect(filterSheet).toBeHidden();

    const grid = page.getByTestId('mobile-products-grid');
    const columnCount = await grid.evaluate((element) => {
      return getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length;
    });

    expect(columnCount).toBe(2);

    const card = page.getByTestId('mobile-product-card').first();
    const media = card.getByTestId('mobile-product-card-media');
    const quantity = card.getByTestId('mobile-product-card-stepper');
    const addButton = card.getByTestId('mobile-product-card-add');
    const wishlistButton = card.getByTestId('mobile-product-card-wishlist');
    const title = card.getByTestId('mobile-product-card-title');
    const mediaBox = await media.boundingBox();
    const quantityBox = await quantity.boundingBox();
    const addButtonBox = await addButton.boundingBox();
    const wishlistButtonBox = await wishlistButton.boundingBox();

    expect(mediaBox).not.toBeNull();
    expect(quantityBox).not.toBeNull();
    expect(addButtonBox).not.toBeNull();
    expect(wishlistButtonBox).not.toBeNull();
    expect(addButtonBox!.y + addButtonBox!.height).toBeLessThan(quantityBox!.y + 4);
    expect(wishlistButtonBox!.x).toBeLessThan(addButtonBox!.x + 1);
    expect(addButtonBox!.y - mediaBox!.y).toBeLessThanOrEqual(12);
    expect(mediaBox!.y + mediaBox!.height - (wishlistButtonBox!.y + wishlistButtonBox!.height)).toBeLessThanOrEqual(12);
    expect(Math.round(addButtonBox!.width)).toBe(Math.round(wishlistButtonBox!.width));
    expect(Math.round(addButtonBox!.height)).toBe(Math.round(wishlistButtonBox!.height));
    await expect(addButton.getByText(/add to cart/i)).toHaveCount(0);

    const titleStyles = await title.evaluate((element) => {
      const styles = getComputedStyle(element);

      return {
        overflow: styles.overflow,
        textOverflow: styles.textOverflow,
        whiteSpace: styles.whiteSpace,
      };
    });

    expect(titleStyles.overflow).toBe('hidden');
    expect(titleStyles.textOverflow).toBe('ellipsis');
    expect(titleStyles.whiteSpace).toBe('nowrap');

    await addButton.click();
    await expect(page.getByTestId('mobile-bottom-nav-cart-badge')).toHaveText('1');
  });

  test('keeps product detail actions accessible and compact with wishlist left of add to cart', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    await expect(page.getByRole('heading', { name: /organic gala apples family value pack/i })).toBeVisible();

    const wishlistButton = page.getByTestId('product-detail-wishlist');
    const addButton = page.getByTestId('product-detail-add');
    await expect(wishlistButton).toBeVisible();
    await expect(addButton).toBeVisible();

    const wishlistBox = await wishlistButton.boundingBox();
    const addButtonBox = await addButton.boundingBox();

    expect(wishlistBox).not.toBeNull();
    expect(addButtonBox).not.toBeNull();
    expect(wishlistBox!.x).toBeLessThan(addButtonBox!.x);
    expect(Math.round(wishlistBox!.width)).toBeGreaterThanOrEqual(44);
    expect(Math.round(wishlistBox!.height)).toBeGreaterThanOrEqual(44);
    expect(Math.round(addButtonBox!.height)).toBeGreaterThanOrEqual(44);
    expect(Math.round(wishlistBox!.width)).toBeLessThanOrEqual(48);
    expect(Math.round(wishlistBox!.height)).toBeLessThanOrEqual(48);
    expect(Math.round(addButtonBox!.height)).toBeLessThanOrEqual(48);
  });

  test('keeps signed-in wishlist removals after stale sync responses', async ({ page }) => {
    let syncedProductIds: string[] | null = null;

    await seedAuthSession(page);
    await mockMobileStorefront(page, {
      wishlist: 'stale-remove',
      onWishlistSyncMutation: (productIds) => {
        syncedProductIds = productIds;
      },
    });

    await page.goto('/en/products/organic-gala-apples');
    await expect(page.getByRole('heading', { name: /organic gala apples family value pack/i })).toBeVisible();

    const wishlistButton = page.getByTestId('product-detail-wishlist');
    await expect(wishlistButton).toHaveAttribute('aria-label', /remove from wishlist/i);

    await wishlistButton.click();

    await expect(wishlistButton).toHaveAttribute('aria-label', /add to wishlist/i);
    expect(syncedProductIds).toEqual([]);

    await page.reload();
    await expect(page.getByRole('heading', { name: /organic gala apples family value pack/i })).toBeVisible();
    await expect(page.getByTestId('product-detail-wishlist')).toHaveAttribute('aria-label', /add to wishlist/i);
  });

  test('shows an explicit error state when the products query fails', async ({ page }) => {
    await mockMobileStorefront(page, { products: 'error' });
    await page.goto('/en/products');

    await expect(page.getByText(/channel 'default' not found or inactive/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    await expect(page.getByText(/no products match your filters/i)).toHaveCount(0);
  });

  test('keeps checkout visible on the cart page with wrapped item controls', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const cartItem = page.getByTestId('cart-item').first();
    const mobileSummaryBar = page.getByTestId('mobile-cart-summary-bar');
    await expect(page.getByRole('heading', { name: /your cart/i })).toBeVisible();
    await expect(cartItem).toBeVisible();
    await expect(mobileSummaryBar).toBeVisible();
    await expect(mobileSummaryBar.getByRole('link', { name: /proceed to checkout/i })).toBeVisible();
    const saveForLater = page.getByRole('button', { name: /save organic gala apples family value pack for later/i }).first();
    const decreaseQuantity = page.getByRole('button', { name: /decrease organic gala apples family value pack quantity/i }).first();
    await expect(saveForLater).toBeVisible();
    await expect(decreaseQuantity).toBeVisible();
    const infoY = await saveForLater.evaluate((element) => element.getBoundingClientRect().top);
    const controlsY = await decreaseQuantity.evaluate((element) => element.getBoundingClientRect().top);

    expect(controlsY).toBeGreaterThan(infoY + 1);
  });

  test('keeps mobile checkout progress and order context visible through review', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/checkout');

    const progress = page.getByTestId('checkout-sticky-progress');
    await expect(progress).toBeVisible();
    await expect(progress).toContainText(/step 1 of 4/i);
    await expect(page.getByTestId('mobile-checkout-summary-bar')).toBeVisible();

    await page.getByLabel(/first name/i).fill('Marta');
    await page.getByLabel(/last name/i).fill('Nowak');
    await page.getByLabel(/^email/i).fill('marta@example.com');
    await page.getByLabel(/address/i).fill('Marszalkowska 1');
    await page.getByLabel(/city/i).fill('Warsaw');
    await page.getByLabel(/postal code/i).fill('00-001');
    await page.getByLabel(/country/i).fill('PL');
    await page.getByRole('button', { name: /continue/i }).click();

    await page.getByRole('button', { name: /standard courier/i }).click();
    await page.getByRole('button', { name: /credit\/debit card/i }).click();

    await expect(progress).toContainText(/step 4 of 4/i);
    await expect(page.getByTestId('mobile-checkout-summary-panel')).toContainText(/organic gala apples/i);
  });
});
