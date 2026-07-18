import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

async function openFilters(page: Page, panel: Locator) {
  const trigger = page.getByRole('button', { name: /filters/i });

  // A cold development compile can replace the server-rendered trigger while
  // hydration applies the mocked facets. Retry the user action against the
  // current trigger until the intended panel is actually visible.
  await expect.poll(async () => {
    if (await panel.isVisible()) return true;

    try {
      await trigger.click({ timeout: 1_000 });
    } catch {
      return false;
    }

    return panel.isVisible();
  }, { timeout: 15_000 }).toBe(true);
}

test.describe('mobile products page', () => {
  test('compresses the mobile catalog layout to prioritize product images', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const mobileShell = page.getByTestId('mobile-products-shell');
    const toolbar = page.getByTestId('mobile-products-toolbar');
    const title = page.getByTestId('mobile-products-title');
    const titleCount = page.getByTestId('mobile-products-title-count');
    const sortGroup = page.getByTestId('mobile-products-sort-trigger');
    const sortLabel = page.getByTestId('mobile-products-sort-label');
    const sortValue = sortGroup.getByText(/^newest$/i);
    const sortSelect = page.getByTestId('mobile-products-sort-select');
    const grid = page.getByTestId('mobile-products-grid');
    const cards = page.getByTestId('mobile-product-card');

    await expect(mobileShell).toBeVisible();
    await expect(toolbar).toBeVisible();
    await expect(title).toBeVisible();
    await expect(titleCount).toBeVisible();
    await expect(sortGroup).toBeVisible();
    await expect(grid).toBeVisible();
    await expect(cards).toHaveCount(4);
    await expect(page.getByTestId('product-card')).toHaveCount(0);

    const [titleFontSize, countFontSize] = await Promise.all([
      title.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
      titleCount.evaluate((element) => parseFloat(getComputedStyle(element).fontSize)),
    ]);

    expect(titleFontSize).toBeGreaterThan(countFontSize);

    await expect(sortSelect).toBeHidden();
    await expect(sortSelect).toHaveValue('newest');

    const [sortLabelBox, sortValueBox] = await Promise.all([
      sortLabel.boundingBox(),
      sortValue.boundingBox(),
    ]);

    expect(sortLabelBox).not.toBeNull();
    expect(sortValueBox).not.toBeNull();
    expect(sortLabelBox!.y + sortLabelBox!.height).toBeLessThanOrEqual(sortValueBox!.y + 4);

    const columnCount = await grid.evaluate((element) => {
      return getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length;
    });

    expect(columnCount).toBe(2);

    const firstCard = cards.first();
    const firstMedia = firstCard.getByTestId('mobile-product-card-media');
    const firstImage = firstCard.getByTestId('mobile-product-card-image');
    const firstTitle = firstCard.getByTestId('mobile-product-card-title');
    const addButton = firstCard.getByTestId('mobile-product-card-add');
    const wishlistButton = firstCard.getByTestId('mobile-product-card-wishlist');
    const addIcon = addButton.locator('svg');
    const wishlistIcon = wishlistButton.locator('svg');

    await expect(firstMedia).toBeVisible();
    await expect(firstImage).toBeVisible();
    await expect(firstTitle).toBeVisible();
    await expect(addButton).toBeVisible();
    await expect(firstCard.getByTestId('mobile-product-card-stepper')).toHaveCount(0);
    await expect(firstCard.getByTestId('mobile-product-card-scan-facts')).toContainText(/fruit/i);
    await expect(firstCard.getByTestId('mobile-product-card-scan-facts')).toContainText(/poland/i);
    await expect(firstCard.getByTestId('mobile-product-card-availability')).toContainText(/in stock/i);
    await expect(firstCard).not.toContainText(/soybeans|milk|nutrition/i);

    const titleStyles = await firstTitle.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        whiteSpace: styles.whiteSpace,
        overflow: styles.overflow,
        webkitLineClamp: styles.webkitLineClamp,
      };
    });

    expect(titleStyles.whiteSpace).toBe('normal');
    expect(titleStyles.overflow).toBe('hidden');
    expect(titleStyles.webkitLineClamp).toBe('2');
    const cardTitleFontSize = await firstTitle.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
    expect(cardTitleFontSize).toBeLessThanOrEqual(13.6);

    const imageStyles = await firstImage.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        objectFit: styles.objectFit,
        paddingTop: parseFloat(styles.paddingTop),
      };
    });

    expect(imageStyles.objectFit).toBe('contain');
    expect(imageStyles.paddingTop).toBeLessThanOrEqual(4);

    const [cardBox, mediaBox, addButtonBox, wishlistButtonBox] = await Promise.all([
      firstCard.boundingBox(),
      firstMedia.boundingBox(),
      addButton.boundingBox(),
      wishlistButton.boundingBox(),
    ]);

    expect(cardBox).not.toBeNull();
    expect(mediaBox).not.toBeNull();
    expect(addButtonBox).not.toBeNull();
    expect(wishlistButtonBox).not.toBeNull();
    expect(mediaBox!.x - cardBox!.x).toBeLessThanOrEqual(2);
    expect(mediaBox!.y - cardBox!.y).toBeLessThanOrEqual(2);
    expect(cardBox!.x + cardBox!.width - (mediaBox!.x + mediaBox!.width)).toBeLessThanOrEqual(2);
    expect(addButtonBox!.width).toBeGreaterThanOrEqual(44);
    expect(addButtonBox!.height).toBeGreaterThanOrEqual(44);
    expect(wishlistButtonBox!.width).toBeGreaterThanOrEqual(44);
    expect(wishlistButtonBox!.height).toBeGreaterThanOrEqual(44);
    expect(addButtonBox!.width).toBeLessThanOrEqual(48);
    expect(addButtonBox!.height).toBeLessThanOrEqual(48);
    expect(wishlistButtonBox!.width).toBeLessThanOrEqual(48);
    expect(wishlistButtonBox!.height).toBeLessThanOrEqual(48);

    const [addIconBox, wishlistIconBox] = await Promise.all([
      addIcon.boundingBox(),
      wishlistIcon.boundingBox(),
    ]);

    expect(addIconBox).not.toBeNull();
    expect(wishlistIconBox).not.toBeNull();
    expect(addIconBox!.width).toBeLessThanOrEqual(14);
    expect(addIconBox!.height).toBeLessThanOrEqual(14);
    expect(wishlistIconBox!.width).toBeLessThanOrEqual(14);
    expect(wishlistIconBox!.height).toBeLessThanOrEqual(14);

    expect(mediaBox!.x + mediaBox!.width - (addButtonBox!.x + addButtonBox!.width)).toBeLessThanOrEqual(12);
    expect(addButtonBox!.y - mediaBox!.y).toBeLessThanOrEqual(12);
    expect(wishlistButtonBox!.x - mediaBox!.x).toBeLessThanOrEqual(12);
    expect(mediaBox!.y + mediaBox!.height - (wishlistButtonBox!.y + wishlistButtonBox!.height)).toBeLessThanOrEqual(12);

    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);
  });

  test('keeps the Stitch-like products redesign scoped to mobile', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    await expect(page.getByTestId('mobile-products-shell')).toHaveCount(0);
    await expect(page.getByTestId('product-card').first()).toBeVisible();
  });

  test('keeps preset filter groups visible on desktop even when catalog metadata is empty', async ({ page }) => {
    await mockMobileStorefront(page, { facets: 'empty' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const filterPanel = page.getByRole('region', { name: /^filters$/i });

    await expect(filterPanel).toBeVisible();
    await expect(filterPanel.getByText(/exclude allergens/i)).toBeVisible();
    await expect(filterPanel.getByText(/dietary preferences/i)).toBeVisible();
    await expect(filterPanel.getByText(/storage zone/i)).toBeVisible();
    await expect(filterPanel.getByText(/certifications/i)).toBeVisible();
    await expect(filterPanel.getByText(/price range/i)).toBeVisible();
    await expect(filterPanel.getByRole('button', { name: /vegan/i })).toBeDisabled();
    await expect(filterPanel.getByRole('button', { name: /ambient/i })).toBeDisabled();
    await expect(filterPanel.getByRole('button', { name: /organic/i })).toBeDisabled();
  });

  test('lets desktop shoppers narrow all products by category', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    await expect(page.getByTestId('product-card')).toHaveCount(4);
    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    await expect(filterPanel).toBeVisible();
    await expect(filterPanel.getByText(/categories/i)).toBeVisible();
    await filterPanel.getByRole('button', { name: /bakery/i }).click();

    await expect(page.getByTestId('product-card')).toHaveCount(1);
    await expect(page.getByRole('link', { name: /sourdough sandwich bread/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /organic gala apples/i })).toHaveCount(0);
    expect(
      productQueries.some((variables) => {
        const filter = variables.filter as Record<string, any> | undefined;
        return Array.isArray(filter?.categories) && filter.categories.includes('cat-bakery');
      })
    ).toBe(true);
  });

  test('surfaces active desktop filters and lets shoppers remove them from the catalog toolbar', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByRole('button', { name: /bakery/i }).click();

    const filterSummary = page.getByTestId('product-filter-summary');
    await expect(filterSummary).toBeVisible();
    await expect(filterSummary).toContainText(/showing 1 of 1/i);
    await expect(filterSummary.getByRole('button', { name: /remove bakery filter/i })).toBeVisible();

    await filterSummary.getByRole('button', { name: /remove bakery filter/i }).click();

    await expect(page.getByTestId('product-card')).toHaveCount(4);
    await expect(filterSummary.getByRole('button', { name: /remove bakery filter/i })).toHaveCount(0);
  });

  test('applies mobile filters only after save', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const cards = page.getByTestId('mobile-product-card');
    await expect(cards).toHaveCount(4);

    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);
    await expect(filterSheet.getByText(/certifications/i)).toBeVisible();

    const minPriceInput = filterSheet.getByLabel(/minimum price/i);
    const minPriceBox = await minPriceInput.boundingBox();
    const allergenHeadingBox = await filterSheet.getByText(/exclude allergens/i).boundingBox();
    expect(minPriceBox).not.toBeNull();
    expect(allergenHeadingBox).not.toBeNull();
    expect(minPriceBox!.y).toBeLessThan(allergenHeadingBox!.y);
    await expect(minPriceInput).toBeVisible();
    await minPriceInput.fill('10');

    expect(
      productQueries.some((variables) => {
        const filter = variables.filter as Record<string, any> | undefined;
        return Boolean(filter?.price?.gte);
      })
    ).toBe(false);
    await expect(cards).toHaveCount(4);

    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    await expect(cards).toHaveCount(2);
    expect(
      productQueries.some((variables) => {
        const filter = variables.filter as Record<string, any> | undefined;
        return filter?.price?.gte === 10;
      })
    ).toBe(true);
  });

  test('applies mobile category filters only after save', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const cards = page.getByTestId('mobile-product-card');
    await expect(cards).toHaveCount(4);

    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);
    await expect(filterSheet.getByText(/categories/i)).toBeVisible();
    await filterSheet.getByRole('button', { name: /bakery/i }).click();

    expect(
      productQueries.some((variables) => {
        const filter = variables.filter as Record<string, any> | undefined;
        return Array.isArray(filter?.categories) && filter.categories.includes('cat-bakery');
      })
    ).toBe(false);
    await expect(cards).toHaveCount(4);

    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    await expect(cards).toHaveCount(1);
    await expect(page.getByRole('link', { name: /sourdough sandwich bread/i })).toBeVisible();
    expect(
      productQueries.some((variables) => {
        const filter = variables.filter as Record<string, any> | undefined;
        return Array.isArray(filter?.categories) && filter.categories.includes('cat-bakery');
      })
    ).toBe(true);
  });

  test('gives mobile shoppers an active-filter trail and clear path when filters remove every product', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const cards = page.getByTestId('mobile-product-card');
    await expect(cards).toHaveCount(4);

    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);
    await filterSheet.getByRole('button', { name: /bakery/i }).click();
    await filterSheet.getByLabel(/minimum price/i).fill('10');
    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    const filterSummary = page.getByTestId('product-filter-summary');
    await expect(filterSummary).toBeVisible();
    await expect(filterSummary).toContainText(/showing 0 of 0/i);
    await expect(filterSummary.getByRole('button', { name: /remove bakery filter/i })).toBeVisible();
    await expect(filterSummary.getByRole('button', { name: /remove from 10 PLN filter/i })).toBeVisible();
    await expect(page.getByText(/no matching products/i)).toBeVisible();
    await expect(page.getByText(/try clearing filters or widening your price range/i)).toBeVisible();

    await page.getByRole('button', { name: /clear filters/i }).click();

    await expect(cards).toHaveCount(4);
    await expect(page.getByTestId('product-filter-summary')).toHaveCount(0);
  });

  test('keeps products visible when mobile filters are applied without changes', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const cards = page.getByTestId('mobile-product-card');
    await expect(cards).toHaveCount(4);

    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);

    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    await expect(page.getByTestId('mobile-filter-sheet')).toHaveCount(0);
    await expect(cards).toHaveCount(4);
    await expect(page.getByText(/no products match your filters/i)).toHaveCount(0);
  });

  test('keeps the mobile filter sheet fully inside the viewport and the footer reachable', async ({ page }) => {
    await mockMobileStorefront(page, { facets: 'empty' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);

    const panel = filterSheet.locator(':scope > div').last();
    const panelBox = await panel.boundingBox();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.x).toBeGreaterThanOrEqual(0);
    expect(panelBox!.y).toBeGreaterThanOrEqual(0);
    expect(panelBox!.x + panelBox!.width).toBeLessThanOrEqual(390);
    expect(panelBox!.y + panelBox!.height).toBeLessThanOrEqual(844);

    const scrollRegion = panel.locator('div.overflow-y-auto').first();
    await scrollRegion.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });

    await expect(panel.getByText(/price range/i)).toBeVisible();
    await expect(panel.getByRole('button', { name: /apply filters/i })).toBeVisible();
  });

  test('does not emit missing translation errors when product filters open', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', (message) => {
      consoleMessages.push(message.text());
    });

    await mockMobileStorefront(page, { facets: 'empty' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');
    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);

    expect(consoleMessages.filter((entry) => entry.includes('MISSING_MESSAGE'))).toEqual([]);
  });
});
