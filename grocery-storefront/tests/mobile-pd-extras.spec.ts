import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

test.describe('Mobile PD — Tier 1 sticky add-to-cart + Tier 2 unit price + in-stock badge', () => {
  test('PD sticky add-to-cart is hidden while the inline CTA is in view', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    const inlineAdd = page.getByTestId('product-detail-add');
    await expect(inlineAdd).toBeVisible();

    // The inline CTA is below the fold on smaller mobile viewports — scroll it
    // into view explicitly so the IntersectionObserver reports it as visible.
    await inlineAdd.scrollIntoViewIfNeeded();

    const sticky = page.getByTestId('mobile-pd-sticky-bar');
    await expect
      .poll(async () => Number(await sticky.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 5000 })
      .toBeLessThanOrEqual(0.05);
  });

  test('PD sticky add-to-cart appears once the inline CTA scrolls out of view', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    const inlineAdd = page.getByTestId('product-detail-add');
    await expect(inlineAdd).toBeVisible();

    // Scroll the inline CTA out of the viewport. Use scrollIntoViewIfNeeded(false) target by anchoring
    // to a later DOM element, plus scrollBy to push it further off-screen. IntersectionObserver fires
    // after the next composited frame; poll the computed opacity rather than asserting immediately.
    await inlineAdd.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy({ top: 800, behavior: 'instant' }));

    const sticky = page.getByTestId('mobile-pd-sticky-bar');
    await expect
      .poll(async () => Number(await sticky.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 5000 })
      .toBeGreaterThan(0.9);
    await expect(sticky.getByTestId('mobile-pd-sticky-add')).toBeVisible();
  });

  test('PD sticky add-to-cart re-hides when the inline CTA returns into view', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    const inlineAdd = page.getByTestId('product-detail-add');
    await expect(inlineAdd).toBeVisible();

    await inlineAdd.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy({ top: 800, behavior: 'instant' }));
    const sticky = page.getByTestId('mobile-pd-sticky-bar');
    await expect
      .poll(async () => Number(await sticky.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 5000 })
      .toBeGreaterThan(0.9);

    // Scroll the inline CTA back into view so the IntersectionObserver reports
    // intersecting again. scrollIntoViewIfNeeded is more robust than scrollTo(0,0)
    // because the CTA can sit below the fold on short mobile viewports.
    await inlineAdd.scrollIntoViewIfNeeded();
    await expect
      .poll(async () => Number(await sticky.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 5000 })
      .toBeLessThanOrEqual(0.05);
  });

  test('PD sticky add-to-cart buttons meet 44×44 tap-target floor (Tier 1)', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    const inlineAdd = page.getByTestId('product-detail-add');
    await expect(inlineAdd).toBeVisible();
    await inlineAdd.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy({ top: 800, behavior: 'instant' }));

    const sticky = page.getByTestId('mobile-pd-sticky-bar');
    await expect
      .poll(async () => Number(await sticky.evaluate((el) => getComputedStyle(el).opacity)), { timeout: 5000 })
      .toBeGreaterThan(0.9);

    const addBox = await sticky.getByTestId('mobile-pd-sticky-add').boundingBox();
    const decBox = await sticky.getByRole('button', { name: /decrease quantity/i }).boundingBox();
    const incBox = await sticky.getByRole('button', { name: /increase quantity/i }).boundingBox();

    expect(addBox).not.toBeNull();
    expect(decBox).not.toBeNull();
    expect(incBox).not.toBeNull();
    expect(Math.round(addBox!.height)).toBeGreaterThanOrEqual(44);
    expect(Math.round(decBox!.height)).toBeGreaterThanOrEqual(44);
    expect(Math.round(decBox!.width)).toBeGreaterThanOrEqual(44);
    expect(Math.round(incBox!.height)).toBeGreaterThanOrEqual(44);
    expect(Math.round(incBox!.width)).toBeGreaterThanOrEqual(44);
  });

  test('unit price renders on PD when product has pricePerUnit + unitOfMeasure (Tier 2)', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    await expect(page.getByRole('heading', { name: /organic gala apples family value pack/i })).toBeVisible();

    // Apples fixture: pricePerUnit = 2.99, unitOfMeasure = 'kg'. UnitPrice should render at least once
    // in the main price block, plus once in the sticky bar (after scroll).
    const unitPrice = page.getByTestId('unit-price').first();
    await expect(unitPrice).toBeVisible();
    await expect(unitPrice).toContainText(/kg/i);
  });

  test('in-stock badge shows the high-stock variant for qty > 10', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    // Apples qty = 20 → "In stock — ships today/tomorrow". Don't assert on the time-of-day half.
    await expect(promise).toContainText(/in stock/i);
    await expect(promise).not.toContainText(/only \d+ left/i);
  });

  test('in-stock badge shows the low-stock "Only N left" microcopy for qty <= 10', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/spinach-ravioli-family-pack');
    await expect(page.getByRole('heading', { name: /spinach ravioli family pack/i })).toBeVisible();

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    // Ravioli qty = 9 → "Only 9 left — ships ..."
    await expect(promise).toContainText(/only 9 left/i);
  });
});
