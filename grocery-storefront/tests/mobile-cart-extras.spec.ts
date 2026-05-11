import { expect, test } from '@playwright/test';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

test.describe('Mobile cart — Tier 1 free-shipping progress', () => {
  test('mobile sticky summary bar renders the free-shipping progress strip', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const summaryBar = page.getByTestId('mobile-cart-summary-bar');
    await expect(summaryBar).toBeVisible();

    const freeShipping = page.getByTestId('mobile-cart-free-shipping');
    await expect(freeShipping).toBeVisible();
  });

  test('progress copy reflects the "Add X more for free shipping" branch when below threshold', async ({ page }) => {
    await seedCartStorage(page);
    // single-item cart → subtotal = 12.99 PLN, threshold = 150 PLN → remaining = 137.01.
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const freeShipping = page.getByTestId('mobile-cart-free-shipping');
    await expect(freeShipping).toBeVisible();
    // Don't pin on exact remaining string (locale/currency formatting); assert on the verb + currency token.
    await expect(freeShipping).toContainText(/free shipping/i);
    await expect(freeShipping).toContainText(/137/);
  });

  test('progress bar width is below 100% (not yet eligible) when subtotal is well under threshold', async ({ page }) => {
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const freeShipping = page.getByTestId('mobile-cart-free-shipping');
    await expect(freeShipping).toBeVisible();
    // Cart hydration is async — the progress bar starts at 0% before the GraphQL cart fetch resolves,
    // then snaps to the real subtotal. Poll for the eventual width.
    await expect
      .poll(async () =>
        await freeShipping.evaluate((el) => {
          const fill = el.querySelector<HTMLElement>('[style*="width"]');
          return fill ? parseFloat(fill.style.width) : NaN;
        }),
        { timeout: 5000 }
      )
      .toBeGreaterThan(0);

    const numeric = await freeShipping.evaluate((el) => {
      const fill = el.querySelector<HTMLElement>('[style*="width"]');
      return fill ? parseFloat(fill.style.width) : NaN;
    });

    // 12.99 / 150 = 8.66 → ~8.66%. Allow some slack.
    expect(numeric).toBeGreaterThan(5);
    expect(numeric).toBeLessThan(20);
  });
});
