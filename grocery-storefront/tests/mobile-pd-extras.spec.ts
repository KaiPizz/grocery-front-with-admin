import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

async function scrollInlineAddIntoView(inlineAdd: Locator) {
  await inlineAdd.evaluate((element) => {
    element.scrollIntoView({ block: 'center', inline: 'nearest' });
  });
}

async function scrollInlineAddOutOfView(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
}

async function useShortMobileViewport(page: Page) {
  const viewport = page.viewportSize();
  await page.setViewportSize({
    width: viewport?.width ?? 390,
    height: 640,
  });
}

test.describe('Mobile PD — Tier 1 sticky add-to-cart + Tier 2 unit price + in-stock badge', () => {
  test('PD sticky add-to-cart is hidden while the inline CTA is in view', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    const inlineAdd = page.getByTestId('product-detail-add');
    await expect(inlineAdd).toBeVisible();

    // Protects the shopper contract: when the main CTA is reachable, the
    // sticky duplicate should be removed from assistive-tech navigation.
    await scrollInlineAddIntoView(inlineAdd);

    const sticky = page.getByTestId('mobile-pd-sticky-bar');
    await expect(sticky).toHaveAttribute('aria-hidden', 'true');
  });

  test('PD sticky add-to-cart appears once the inline CTA scrolls out of view', async ({ page }) => {
    await useShortMobileViewport(page);
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    const inlineAdd = page.getByTestId('product-detail-add');
    await expect(inlineAdd).toBeVisible();

    // Protects the shopper contract: the sticky CTA appears when the main CTA
    // is no longer reachable in the viewport, independent of device height.
    await scrollInlineAddIntoView(inlineAdd);
    await scrollInlineAddOutOfView(page);

    const sticky = page.getByTestId('mobile-pd-sticky-bar');
    await expect(sticky).toHaveAttribute('aria-hidden', 'false');
    await expect(sticky.getByTestId('mobile-pd-sticky-add')).toBeVisible();
  });

  test('PD sticky add-to-cart re-hides when the inline CTA returns into view', async ({ page }) => {
    await useShortMobileViewport(page);
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    const inlineAdd = page.getByTestId('product-detail-add');
    await expect(inlineAdd).toBeVisible();

    await scrollInlineAddIntoView(inlineAdd);
    await scrollInlineAddOutOfView(page);
    const sticky = page.getByTestId('mobile-pd-sticky-bar');
    await expect(sticky).toHaveAttribute('aria-hidden', 'false');

    await scrollInlineAddIntoView(inlineAdd);
    await expect(sticky).toHaveAttribute('aria-hidden', 'true');
  });

  test('PD sticky add-to-cart buttons meet 44×44 tap-target floor (Tier 1)', async ({ page }) => {
    await useShortMobileViewport(page);
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');
    const inlineAdd = page.getByTestId('product-detail-add');
    await expect(inlineAdd).toBeVisible();
    await scrollInlineAddIntoView(inlineAdd);
    await scrollInlineAddOutOfView(page);

    const sticky = page.getByTestId('mobile-pd-sticky-bar');
    await expect(sticky).toHaveAttribute('aria-hidden', 'false');

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

  test('links the product detail breadcrumb back to the primary category page', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const breadcrumb = page.getByRole('navigation', { name: /breadcrumb/i });
    await expect(breadcrumb.getByRole('link', { name: /^fruit$/i })).toHaveAttribute('href', '/en/categories/fruit');
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

  test('delivery-mode purchase panel preserves low-stock and shipping promise copy', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/spinach-ravioli-family-pack');

    const panel = page.getByTestId('pdp-purchase-panel');
    const promise = panel.getByTestId('pd-stock-promise');
    await expect(panel.getByRole('heading', { name: /spinach ravioli family pack/i })).toBeVisible();
    await expect(promise).toContainText(/only 9 left/i);
    await expect(promise).toContainText(/ships today|ships tomorrow/i);
    await expect(panel.getByTestId('product-detail-add')).toBeVisible();
  });
});

test.describe('PDP gallery production hardening', () => {
  test('renders ordered product media as selectable gallery images without duplicating the thumbnail fallback', async ({ page }) => {
    await mockMobileStorefront(page, { productDetailImages: 'multi-media' });
    await page.goto('/en/products/organic-gala-apples');

    const gallery = page.getByTestId('product-gallery');
    await expect(gallery).toBeVisible();

    // Protects the PDP production plan: media[] is the primary gallery source,
    // and a matching thumbnail should not create a duplicate fourth image.
    await expect(gallery.getByTestId('product-gallery-thumbnail')).toHaveCount(3);
    await expect(gallery.getByTestId('product-gallery-main').getByRole('img')).toHaveAttribute(
      'alt',
      /front package/i,
    );

    await gallery.getByRole('button', { name: /nutrition label/i }).click();
    await expect(gallery.getByTestId('product-gallery-main').getByRole('img')).toHaveAttribute(
      'alt',
      /nutrition label/i,
    );
  });

  test('falls back to the product thumbnail when media is empty', async ({ page }) => {
    await mockMobileStorefront(page, { productDetailImages: 'thumbnail-only' });
    await page.goto('/en/products/organic-gala-apples');

    const gallery = page.getByTestId('product-gallery');
    await expect(gallery.getByTestId('product-gallery-main').getByRole('img')).toHaveAttribute(
      'alt',
      /fresh produce arranged/i,
    );
    await expect(gallery.getByTestId('product-gallery-thumbnail')).toHaveCount(0);
    await expect(gallery.getByTestId('product-gallery-placeholder')).toHaveCount(0);
  });

  test('shows the package placeholder when neither media nor thumbnail exists', async ({ page }) => {
    await mockMobileStorefront(page, { productDetailImages: 'no-image' });
    await page.goto('/en/products/organic-gala-apples');

    const gallery = page.getByTestId('product-gallery');
    await expect(gallery.getByTestId('product-gallery-placeholder')).toBeVisible();
    await expect(gallery.getByRole('img')).toHaveCount(0);
  });
});

test.describe('PDP food-label sections', () => {
  test('renders ingredients, allergens, and nutrition inline without opening the nutrition modal', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const sections = page.getByTestId('pdp-food-label-sections');
    await expect(sections).toBeVisible();
    await expect(sections.getByRole('heading', { name: /description/i })).toBeVisible();
    await expect(sections.getByRole('heading', { name: /ingredients/i })).toBeVisible();
    await expect(sections).toContainText(/Apples/i);
    await expect(sections.getByRole('heading', { name: /allergens/i })).toBeVisible();
    await expect(sections.getByRole('listitem').filter({ hasText: /nuts/i })).toBeVisible();
    await expect(sections.getByRole('heading', { name: /nutrition facts/i })).toBeVisible();
    await expect(sections.getByRole('table', { name: /nutrition facts/i })).toBeVisible();
    await expect(sections).toContainText(/52 kcal/i);
    await expect(sections).toContainText(/14 g/i);
    await expect(page.getByRole('dialog', { name: /nutrition facts/i })).toHaveCount(0);
  });

  test('does not render empty label headings when ingredients and nutrition are missing', async ({ page }) => {
    await mockMobileStorefront(page, { productDetailLabels: 'missing' });
    await page.goto('/en/products/organic-gala-apples');

    const sections = page.getByTestId('pdp-food-label-sections');
    await expect(sections).toBeVisible();
    await expect(sections.getByRole('heading', { name: /description/i })).toBeVisible();
    await expect(sections.getByRole('heading', { name: /ingredients/i })).toHaveCount(0);
    await expect(sections.getByRole('heading', { name: /nutrition facts/i })).toHaveCount(0);
    await expect(sections.getByRole('heading', { name: /allergens/i })).toHaveCount(0);
  });
});

test.describe('PDP related product rail', () => {
  test('renders same-category recommendations after label sections and excludes the current product', async ({ page }) => {
    const productQueries: Array<Record<string, unknown>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => productQueries.push(variables),
    });
    await page.goto('/en/products/organic-gala-apples');

    await expect(page.getByTestId('pdp-food-label-sections')).toBeVisible();
    const related = page.getByTestId('pdp-related-products');
    await expect(related).toBeVisible();
    await expect(related.getByRole('heading', { name: /more from fruit/i })).toBeVisible();
    await expect(related.getByRole('link', { name: /blueberries snack box/i })).toBeVisible();
    await expect(related.getByRole('link', { name: /organic gala apples/i })).toHaveCount(0);

    expect(
      productQueries.some((variables) => {
        const filter = variables.filter as { categories?: string[] } | undefined;
        return variables.first === 9 && filter?.categories?.includes('cat-fruit') === true;
      })
    ).toBe(true);
  });

  test('skips the related product rail when the product has no category', async ({ page }) => {
    await mockMobileStorefront(page, { productDetailCategory: 'missing' });
    await page.goto('/en/products/organic-gala-apples');

    await expect(page.getByTestId('pdp-food-label-sections')).toBeVisible();
    await expect(page.getByTestId('pdp-related-products')).toHaveCount(0);
  });

  test('skips the related product rail when the category only returns the current product', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/spinach-ravioli-family-pack');

    await expect(page.getByRole('heading', { name: /spinach ravioli family pack/i })).toBeVisible();
    await expect(page.getByTestId('pdp-related-products')).toHaveCount(0);
  });
});
