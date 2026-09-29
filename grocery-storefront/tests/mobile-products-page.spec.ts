import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront, openFilterGroup } from './mobile-fixtures';

const PRODUCT_FILTER_METADATA_OPERATIONS = [
  'ProductCountryOrigins',
  'ProductBrands',
];

function hasPolandCountryFilter(variables: Record<string, any>) {
  const countries = (variables.filter as Record<string, any> | undefined)?.countryOfOrigin;
  return Array.isArray(countries) && countries.includes('Poland');
}

async function openFilters(page: Page, panel: Locator) {
  const trigger = page.getByRole('button', { name: /^filters(?:,.*)?$/i });

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
  test('prioritizes visible products before requesting secondary filter metadata', async ({ page }) => {
    let releaseListing!: () => void;
    const listingGate = new Promise<void>((resolve) => {
      releaseListing = resolve;
    });
    const operations: string[] = [];
    const operationQueries = new Map<string, string>();
    let listingResponseReleased = false;
    let metadataStartedBeforeListingResponse = false;

    await mockMobileStorefront(page, {
      beforeProductListingResponse: async () => {
        await listingGate;
        listingResponseReleased = true;
      },
      onGraphqlOperation: (operationName, query) => {
        operations.push(operationName);
        operationQueries.set(operationName, query);
        if (
          !listingResponseReleased
          && PRODUCT_FILTER_METADATA_OPERATIONS.includes(operationName)
        ) {
          metadataStartedBeforeListingResponse = true;
        }
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    await expect.poll(() => operations.includes('GroceryProductListing')).toBe(true);
    await expect.poll(() => operations.includes('PublicCategoryNavigation')).toBe(true);
    expect(operationQueries.get('PublicCategoryNavigation')).not.toMatch(/\bproducts\s*\(/);
    expect(operations).not.toContain('ProductCountryOrigins');
    expect(operations).not.toContain('ProductBrands');
    await expect(page.getByTestId('product-card')).toHaveCount(0);

    releaseListing();

    await expect(page.getByTestId('product-card')).toHaveCount(4);
    await expect.poll(() => operations.includes('ProductCountryOrigins')).toBe(true);
    await expect.poll(() => operations.includes('ProductBrands')).toBe(true);
    expect(metadataStartedBeforeListingResponse).toBe(false);
  });

  test('does not amplify a failed listing request with automatic metadata requests', async ({ page }) => {
    const operations: string[] = [];
    let userOpenedFilters = false;
    let metadataStartedBeforeUserIntent = false;

    await mockMobileStorefront(page, {
      products: 'error',
      onGraphqlOperation: (operationName) => {
        operations.push(operationName);
        if (
          !userOpenedFilters
          && PRODUCT_FILTER_METADATA_OPERATIONS.includes(operationName)
        ) {
          metadataStartedBeforeUserIntent = true;
        }
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    await expect(page.getByText(/channel 'default' not found or inactive/i)).toBeVisible();
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    expect(operations).not.toContain('ProductCountryOrigins');
    expect(operations).not.toContain('ProductBrands');
    expect(metadataStartedBeforeUserIntent).toBe(false);

    userOpenedFilters = true;
    await page.getByRole('button', { name: /filters/i }).click();
    await expect.poll(() => operations.includes('ProductCountryOrigins')).toBe(true);
    await expect.poll(() => operations.includes('ProductBrands')).toBe(true);
  });

  test('replaces stale products with an error when a filtered listing request fails', async ({ page }) => {
    await mockMobileStorefront(page, { products: 'filter-error' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/products');

    const filterPanel = page.getByRole('region', { name: /^filtry$/i });
    await expect(page.getByTestId('product-card')).toHaveCount(4);
    await openFilterGroup(filterPanel, 'filter-brand');
    await filterPanel.getByRole('button', { name: 'Samyang', exact: true }).click();

    await expect(page.getByRole('button', { name: /^spróbuj ponownie$/i })).toBeVisible();
    await expect(page.getByTestId('product-card')).toHaveCount(0);
    await expect(page.getByTestId('product-pagination')).toHaveCount(0);
    await expect(page.getByTestId('mobile-products-title-count')).toHaveCount(0);
  });

  test('never presents cursor-unknown page numbers as disabled navigation choices', async ({ page }) => {
    await mockMobileStorefront(page, { listingPaginationTotalCount: 92 });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/products');

    const pagination = page.getByTestId('product-pagination');
    await expect(pagination.locator('[aria-label="Strona 1 / 4"]')).toBeVisible();
    await expect(pagination.getByRole('button', { name: '2', exact: true })).toBeEnabled();
    await expect(pagination.getByRole('button', { name: '3', exact: true })).toHaveCount(0);
    await expect(pagination.getByRole('button', { name: '4', exact: true })).toHaveCount(0);

    await pagination.getByRole('button', { name: 'Następna', exact: true }).click();
    await expect(pagination.locator('[aria-label="Strona 2 / 4"]')).toBeVisible();
    await expect(page.getByTestId('product-card').first()).toContainText('(Page 2)');
    await expect(pagination.getByRole('button', { name: '1', exact: true })).toBeEnabled();
    await expect(pagination.getByRole('button', { name: '3', exact: true })).toBeEnabled();
    await expect(pagination.getByRole('button', { name: '4', exact: true })).toHaveCount(0);

    await pagination.getByRole('button', { name: 'Następna', exact: true }).click();
    await expect(pagination.locator('[aria-label="Strona 3 / 4"]')).toBeVisible();
    await expect(page.getByTestId('product-card').first()).toContainText('(Page 3)');
    await expect(pagination.getByRole('button', { name: '4', exact: true })).toBeEnabled();

    await pagination.getByRole('button', { name: 'Poprzednia', exact: true }).click();
    await expect(pagination.locator('[aria-label="Strona 2 / 4"]')).toBeVisible();
    await expect(page.getByTestId('product-card').first()).toContainText('(Page 2)');

    await pagination.getByRole('button', { name: '1', exact: true }).click();
    await expect(pagination.locator('[aria-label="Strona 1 / 4"]')).toBeVisible();
    await expect(page.getByTestId('product-card').first()).not.toContainText('(Page');
  });

  test('with offset cursors shows first and last page and jumps straight to any page', async ({ page }) => {
    const pageRequests: Array<{ after: unknown; before: unknown }> = [];
    await mockMobileStorefront(page, {
      listingPaginationTotalCount: 240,
      listingOffsetCursors: true,
      onProductsQuery: (variables) => {
        pageRequests.push({ after: variables.after ?? null, before: variables.before ?? null });
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/products');

    const pagination = page.getByTestId('product-pagination');
    const pageButtons = pagination.locator('[aria-label^="Strona"] button');
    await expect(pagination.locator('[aria-label="Strona 1 / 10"]')).toBeVisible();
    await expect(pageButtons).toHaveText(['1', '2', '3', '4', '5', '10']);

    await pagination.getByRole('button', { name: '10', exact: true }).click();
    await expect(pagination.locator('[aria-label="Strona 10 / 10"]')).toBeVisible();
    await expect(page.getByTestId('product-card').first()).toContainText('(Page 10)');
    await expect(pageButtons).toHaveText(['1', '6', '7', '8', '9', '10']);
    await expect(pagination).toContainText('Produkty 217-220 z 240');

    await pagination.getByRole('button', { name: 'Poprzednia', exact: true }).click();
    await expect(pagination.locator('[aria-label="Strona 9 / 10"]')).toBeVisible();
    await expect(page.getByTestId('product-card').first()).toContainText('(Page 9)');
    // The API shifts `last`/`before` windows, so stepping back must page forward from an offset.
    expect(pageRequests.at(-1)).toEqual({ after: Buffer.from('offset:191').toString('base64'), before: null });

    await pagination.getByRole('button', { name: '1', exact: true }).click();
    await expect(pagination.locator('[aria-label="Strona 1 / 10"]')).toBeVisible();
    await expect(page.getByTestId('product-card').first()).not.toContainText('(Page');
  });

  test('phone pager fits one row: arrows plus five page slots', async ({ page }) => {
    await mockMobileStorefront(page, { listingPaginationTotalCount: 240, listingOffsetCursors: true });
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/pl/products');

    const pagination = page.getByTestId('product-pagination');
    const pageList = pagination.locator('[aria-label^="Strona"]');
    await expect(pageList.locator('button')).toHaveText(['1', '2', '3', '10']);
    await expect(pagination.getByRole('button', { name: 'Następna', exact: true })).toBeVisible();
    const overflow = await pagination.evaluate((nav) => nav.scrollWidth - nav.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);

    await pageList.getByRole('button', { name: '10', exact: true }).click();
    await expect(pagination.locator('[aria-label="Strona 10 / 10"]')).toBeVisible();
    await expect(pageList.locator('button')).toHaveText(['1', '8', '9', '10']);
  });

  test('ignores an old page response after the listing filters change', async ({ page }) => {
    let releasePageTwo!: () => void;
    let notifyPageTwoRequested!: () => void;
    let releaseFilteredPageOne!: () => void;
    let notifyFilteredPageOneRequested!: () => void;
    let holdNextListingResponse = false;
    let holdFilteredListingResponse = false;
    const pageTwoGate = new Promise<void>((resolve) => {
      releasePageTwo = resolve;
    });
    const pageTwoRequested = new Promise<void>((resolve) => {
      notifyPageTwoRequested = resolve;
    });
    const filteredPageOneGate = new Promise<void>((resolve) => {
      releaseFilteredPageOne = resolve;
    });
    const filteredPageOneRequested = new Promise<void>((resolve) => {
      notifyFilteredPageOneRequested = resolve;
    });

    await mockMobileStorefront(page, {
      listingPaginationTotalCount: 92,
      onProductsQuery: (variables) => {
        if (typeof variables.after === 'string') {
          holdNextListingResponse = true;
          notifyPageTwoRequested();
          return;
        }

        const brands = (variables.filter as Record<string, any> | undefined)?.brands;
        if (Array.isArray(brands) && brands.includes('Samyang')) {
          holdFilteredListingResponse = true;
          notifyFilteredPageOneRequested();
        }
      },
      beforeProductListingResponse: async () => {
        if (holdNextListingResponse) {
          holdNextListingResponse = false;
          await pageTwoGate;
          return;
        }
        if (holdFilteredListingResponse) {
          holdFilteredListingResponse = false;
          await filteredPageOneGate;
        }
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/products');

    const pagination = page.getByTestId('product-pagination');
    await pagination.getByRole('button', { name: 'Następna', exact: true }).click();
    await pageTwoRequested;

    const filterPanel = page.getByRole('region', { name: /^filtry$/i });
    await openFilterGroup(filterPanel, 'filter-brand');
    await filterPanel.getByRole('button', { name: 'Samyang', exact: true }).click();
    await filteredPageOneRequested;
    await expect(pagination.getByRole('button', { name: 'Następna', exact: true })).toBeDisabled();

    releaseFilteredPageOne();
    await expect(page.getByRole('link', { name: /sourdough sandwich bread/i })).toHaveCount(0);

    releasePageTwo();

    await expect(pagination.locator('[aria-label="Strona 1 / 4"]')).toBeVisible();
    await expect(page.getByRole('link', { name: /sourdough sandwich bread/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /organic gala apples/i }).first()).toBeVisible();
  });

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
    await expect(firstCard.getByTestId('mobile-product-card-scan-facts')).toHaveCount(0);
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

  test('keeps the lean filter groups visible on desktop even when catalog metadata is empty', async ({ page }) => {
    await mockMobileStorefront(page, { facets: 'empty', brands: 'empty' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const filterPanel = page.getByRole('region', { name: /^filters$/i });

    await expect(filterPanel).toBeVisible();
    await expect(filterPanel.getByTestId('filter-in-stock-only')).toBeVisible();
    await expect(filterPanel.getByText(/^country of origin$/i)).toBeVisible();
    await expect(filterPanel.getByText(/^price range$/i)).toBeVisible();
    await expect(filterPanel.getByTestId('filter-brand')).toHaveCount(0);
    await expect(filterPanel.getByText(/exclude allergens|dietary preferences|storage zone|certifications/i)).toHaveCount(0);
  });

  test('keeps country and price usable while the brand facet is pending', async ({ page }) => {
    let releaseBrands!: () => void;
    const brandsGate = new Promise<void>((resolve) => {
      releaseBrands = resolve;
    });
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      beforeProductBrandsResponse: async () => {
        await brandsGate;
      },
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/products');

    const filterPanel = page.getByRole('region', { name: /^filtry$/i });
    await expect(filterPanel).toBeVisible();

    await openFilterGroup(filterPanel, 'filter-country');
    const polandButton = filterPanel.getByRole('button', { name: /^poland$/i });
    await expect(polandButton).toBeEnabled();
    await expect(filterPanel.getByTestId('filter-brand')).toHaveCount(0);

    await polandButton.click();
    await expect(polandButton).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => productQueries.some(hasPolandCountryFilter)).toBe(true);

    await openFilterGroup(filterPanel, 'filter-price');
    await filterPanel.getByLabel(/cena minimalna/i).fill('999');
    await expect.poll(() => productQueries.some((variables) => {
      const filter = variables.filter as Record<string, any> | undefined;
      return filter?.price?.gte === 999;
    })).toBe(true);
    await expect(filterPanel.getByText(/dostępny zakres:/i)).toHaveCount(0);

    releaseBrands();

    await openFilterGroup(filterPanel, 'filter-brand');
    await expect(filterPanel.getByRole('button', { name: 'Samyang', exact: true })).toBeEnabled();
    await expect(polandButton).toHaveAttribute('aria-pressed', 'true');
    await expect(filterPanel.getByLabel(/cena minimalna/i)).toHaveValue('999');
  });

  test('omits global origin counts when the listing is scoped by search', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/products?search=apple');

    const filterPanel = page.getByRole('region', { name: /^filtry$/i });
    await openFilterGroup(filterPanel, 'filter-country');
    const polandOrigin = filterPanel.getByRole('button', { name: /^poland$/i });
    await expect(polandOrigin).toBeEnabled();
    await expect(polandOrigin).toHaveText(/^Poland$/);
  });

  test('omits base origin counts when another unsupported facet scopes the listing', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    await openFilterGroup(filterPanel, 'filter-country');
    const polandOrigin = filterPanel.getByRole('button', { name: /^poland$/i });
    await expect(polandOrigin).toHaveText(/^Poland4$/);

    await openFilterGroup(filterPanel, 'filter-price');
    await filterPanel.getByLabel(/minimum price/i).fill('10');
    await expect(polandOrigin).toHaveText(/^Poland$/);
  });

  test('restores country deep links and keeps the URL in sync with desktop filters', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products?ref=campaign&country=Poland');

    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    const polandButton = filterPanel.getByRole('button', { name: /^poland$/i });

    await expect(polandButton).toHaveAttribute('aria-pressed', 'true');
    expect(productQueries.length).toBeGreaterThan(0);
    // The very first listing request is already scoped; nothing flashes the full catalog first.
    expect(productQueries.every((variables) => {
      const countries = (variables.filter as Record<string, any> | undefined)?.countryOfOrigin;
      return Array.isArray(countries) && countries.length === 1 && countries[0] === 'Poland';
    })).toBe(true);

    await polandButton.click();
    await expect(polandButton).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        ref: url.searchParams.get('ref'),
        country: url.searchParams.getAll('country'),
      };
    }).toEqual({
      pathname: '/en/products',
      ref: 'campaign',
      country: [],
    });
    await expect.poll(() => productQueries.some((variables) => {
      const countries = (variables.filter as Record<string, any> | undefined)?.countryOfOrigin;
      return !Array.isArray(countries) || countries.length === 0;
    })).toBe(true);

    await polandButton.click();
    await expect(polandButton).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => new URL(page.url()).searchParams.getAll('country')).toEqual(['Poland']);

    const filterSummary = page.getByTestId('product-filter-summary');
    await filterSummary.getByRole('button', { name: /remove Poland filter/i }).click();
    await expect(polandButton).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        ref: url.searchParams.get('ref'),
        country: url.searchParams.get('country'),
      };
    }).toEqual({ ref: 'campaign', country: null });
  });

  test('clears search and country discovery state in one URL update', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products?ref=campaign&search=kimchi&country=Poland');

    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    const polandButton = filterPanel.getByRole('button', { name: /^poland$/i });
    const filterSummary = page.getByTestId('product-filter-summary');

    await expect(polandButton).toHaveAttribute('aria-pressed', 'true');
    await expect(filterSummary.getByRole('button', { name: /remove search: kimchi filter/i })).toBeVisible();
    await expect(filterSummary.getByRole('button', { name: /remove Poland filter/i })).toBeVisible();

    await filterSummary.getByRole('button', { name: /^clear all$/i }).click();

    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        ref: url.searchParams.get('ref'),
        search: url.searchParams.get('search'),
        country: url.searchParams.getAll('country'),
        sort: url.searchParams.get('sort'),
      };
    }).toEqual({
      ref: 'campaign',
      search: null,
      country: [],
      sort: null,
    });
    await expect(polandButton).toHaveAttribute('aria-pressed', 'false');
    await expect(filterSummary).toHaveCount(0);
    await expect(page.getByTestId('product-card')).toHaveCount(4);
  });

  test('uses curated desktop category navigation instead of duplicate raw category filters', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    await expect(page.getByTestId('product-card')).toHaveCount(4);
    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    await expect(filterPanel).toBeVisible();
    await expect(filterPanel.getByRole('button', { name: /bakery/i })).toHaveCount(0);

    const categorySidebar = page.getByTestId('desktop-category-sidebar');
    const kimchiLink = categorySidebar.getByRole('link', { name: /kimchi and pickles/i });
    await expect(kimchiLink).toHaveAttribute('href', '/en/categories/kimchi-i-kiszonki');
    await kimchiLink.click();

    await expect(page).toHaveURL(/\/en\/categories\/kimchi-i-kiszonki$/);
    await expect(page.getByTestId('product-card')).toHaveCount(2);
    await expect(page.getByRole('link', { name: /napa cabbage kimchi/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pickled daikon radish/i })).toBeVisible();
  });

  test('surfaces active desktop filters and lets shoppers remove them from the catalog toolbar', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    await expect(filterPanel).toBeVisible();
    await openFilterGroup(filterPanel, 'filter-brand');
    await filterPanel.getByRole('button', { name: 'Samyang', exact: true }).click();

    const filterSummary = page.getByTestId('product-filter-summary');
    await expect(filterSummary).toBeVisible();
    await expect(filterSummary).toContainText(/showing 1 of 1/i);
    await expect(filterSummary.getByRole('button', { name: /remove Samyang filter/i })).toBeVisible();

    await filterSummary.getByRole('button', { name: /remove Samyang filter/i }).click();

    await expect(page.getByTestId('product-card')).toHaveCount(4);
    await expect(filterSummary.getByRole('button', { name: /remove Samyang filter/i })).toHaveCount(0);
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
    await expect(filterSheet.getByText(/^brand$/i)).toBeVisible();

    await openFilterGroup(filterSheet, 'filter-price');
    const minPriceInput = filterSheet.getByLabel(/minimum price/i);
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

  test('publishes a mobile country filter only after apply', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products?ref=mobile');

    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);
    await openFilterGroup(filterSheet, 'filter-country');
    const polandButton = filterSheet.getByRole('button', { name: /^poland$/i });
    await expect(polandButton).toBeEnabled();

    await polandButton.click();
    await expect(polandButton).toHaveAttribute('aria-pressed', 'true');
    expect(new URL(page.url()).searchParams.get('country')).toBeNull();
    expect(productQueries.some(hasPolandCountryFilter)).toBe(false);

    await filterSheet.getByRole('button', { name: /apply filters/i }).click();
    await expect.poll(() => new URL(page.url()).searchParams.getAll('country')).toEqual(['Poland']);
    expect(new URL(page.url()).searchParams.get('ref')).toBe('mobile');
    await expect.poll(() => productQueries.some(hasPolandCountryFilter)).toBe(true);
    await expect(page.getByTestId('product-filter-summary').getByRole('button', { name: /remove Poland filter/i })).toBeVisible();
  });

  test('preserves a mobile price filter while exact facet metadata is still loading', async ({ page }) => {
    let releaseFilterFacets!: () => void;
    const filterFacetsGate = new Promise<void>((resolve) => {
      releaseFilterFacets = resolve;
    });
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      listingProductLimit: 3,
      beforeProductBrandsResponse: async () => {
        await filterFacetsGate;
      },
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const cards = page.getByTestId('mobile-product-card');
    await expect(cards).toHaveCount(3);

    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);
    await openFilterGroup(filterSheet, 'filter-price');
    const minPriceInput = filterSheet.getByLabel(/minimum price/i);
    await minPriceInput.fill('17');
    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    await expect.poll(() => productQueries.some((variables) => {
      const filter = variables.filter as Record<string, any> | undefined;
      return filter?.price?.gte === 17;
    })).toBe(true);

    releaseFilterFacets();

    await openFilters(page, filterSheet);
    await expect(filterSheet.getByText(/available range:/i)).toHaveCount(0);
    await expect(filterSheet.getByLabel(/minimum price/i)).toHaveValue('17');
    expect(productQueries.some((variables) => {
      const filter = variables.filter as Record<string, any> | undefined;
      return filter?.price?.gte === 12.99;
    })).toBe(false);
  });

  test('uses the curated mobile category rail instead of duplicate raw category filters', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const cards = page.getByTestId('mobile-product-card');
    await expect(cards).toHaveCount(4);

    const categoryRail = page.getByTestId('mobile-category-rail');
    const kimchiLink = categoryRail.getByRole('link', { name: /kimchi and pickles/i });
    await expect(kimchiLink).toHaveAttribute('href', '/en/categories/kimchi-i-kiszonki');

    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);
    await expect(filterSheet.getByRole('button', { name: /bakery/i })).toHaveCount(0);
    await filterSheet.getByRole('button', { name: /close filters/i }).last().click();

    await kimchiLink.click();
    await expect(page).toHaveURL(/\/en\/categories\/kimchi-i-kiszonki$/);
    await expect(page.getByTestId('mobile-product-card')).toHaveCount(2);
    await expect(page.getByRole('link', { name: /napa cabbage kimchi/i })).toBeVisible();
  });

  test('gives mobile shoppers an active-filter trail and clear path when filters remove every product', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const cards = page.getByTestId('mobile-product-card');
    await expect(cards).toHaveCount(4);

    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await openFilters(page, filterSheet);
    await openFilterGroup(filterSheet, 'filter-brand');
    await filterSheet.getByRole('button', { name: 'Samyang', exact: true }).click();
    await openFilterGroup(filterSheet, 'filter-price');
    await filterSheet.getByLabel(/maximum price/i).fill('10');
    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    const filterSummary = page.getByTestId('product-filter-summary');
    await expect(filterSummary).toBeVisible();
    await expect(filterSummary).toContainText(/showing 0 of 0/i);
    await expect(filterSummary.getByRole('button', { name: /remove Samyang filter/i })).toBeVisible();
    await expect(filterSummary.getByRole('button', { name: /remove up to 10 PLN filter/i })).toBeVisible();
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
