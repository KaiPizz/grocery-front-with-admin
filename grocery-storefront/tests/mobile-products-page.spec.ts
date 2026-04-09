import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

test.describe('mobile products page', () => {
  test('compresses the mobile catalog layout to prioritize product images', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const mobileShell = page.getByTestId('mobile-products-shell');
    const toolbar = page.getByTestId('mobile-products-toolbar');
    const title = page.getByTestId('mobile-products-title');
    const titleCount = page.getByTestId('mobile-products-title-count');
    const sortGroup = page.getByTestId('mobile-products-sort');
    const sortLabel = page.getByTestId('mobile-products-sort-label');
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

    const [sortLabelBox, sortSelectBox] = await Promise.all([
      sortLabel.boundingBox(),
      sortSelect.boundingBox(),
    ]);

    expect(sortLabelBox).not.toBeNull();
    expect(sortSelectBox).not.toBeNull();
    expect(sortLabelBox!.y + sortLabelBox!.height).toBeLessThanOrEqual(sortSelectBox!.y + 4);

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
    await expect(firstCard.getByTestId('mobile-product-card-stepper')).toBeVisible();
    await expect(firstCard.getByTestId('mobile-product-card-meta')).toHaveCount(0);
    await expect(firstCard).not.toContainText(/vegan|soybeans|milk|nutrition/i);

    const titleStyles = await firstTitle.evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        whiteSpace: styles.whiteSpace,
        overflow: styles.overflow,
        textOverflow: styles.textOverflow,
      };
    });

    expect(titleStyles.whiteSpace).toBe('nowrap');
    expect(titleStyles.overflow).toBe('hidden');
    expect(titleStyles.textOverflow).toBe('ellipsis');
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
    expect(addButtonBox!.width).toBeLessThanOrEqual(36);
    expect(addButtonBox!.height).toBeLessThanOrEqual(36);
    expect(wishlistButtonBox!.width).toBeLessThanOrEqual(36);
    expect(wishlistButtonBox!.height).toBeLessThanOrEqual(36);

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

    await page.getByRole('button', { name: /filters/i }).click();
    await expect(page.getByTestId('mobile-filter-sheet')).toBeVisible();
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

    await page.getByRole('button', { name: /filters/i }).click();
    const filterPanel = page.locator('#filter-panel');

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

    await page.getByRole('button', { name: /filters/i }).click();
    const filterSheet = page.getByTestId('mobile-filter-sheet');

    await expect(filterSheet).toBeVisible();
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

  test('keeps products visible when mobile filters are applied without changes', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const cards = page.getByTestId('mobile-product-card');
    await expect(cards).toHaveCount(4);

    await page.getByRole('button', { name: /filters/i }).click();
    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await expect(filterSheet).toBeVisible();

    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    await expect(page.getByTestId('mobile-filter-sheet')).toHaveCount(0);
    await expect(cards).toHaveCount(4);
    await expect(page.getByText(/no products match your filters/i)).toHaveCount(0);
  });

  test('keeps the mobile filter sheet fully inside the viewport and the footer reachable', async ({ page }) => {
    await mockMobileStorefront(page, { facets: 'empty' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    await page.getByRole('button', { name: /filters/i }).click();
    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await expect(filterSheet).toBeVisible();

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

    await expect(panel.getByText(/certifications/i)).toBeVisible();
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
    await page.getByRole('button', { name: /filters/i }).click();
    await expect(page.getByTestId('mobile-filter-sheet')).toBeVisible();

    expect(consoleMessages.filter((entry) => entry.includes('MISSING_MESSAGE'))).toEqual([]);
  });
});
