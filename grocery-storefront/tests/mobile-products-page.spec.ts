import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

const PRODUCT_FILTER_METADATA_OPERATIONS = [
  'GroceryProductFilterCatalog',
  'ProductCountryOrigins',
  'ProductDietaryAvailability',
];

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
    expect(operations).not.toContain('GroceryProductFilterCatalog');
    expect(operations).not.toContain('ProductCountryOrigins');
    expect(operations).not.toContain('ProductDietaryAvailability');
    await expect(page.getByTestId('product-card')).toHaveCount(0);

    releaseListing();

    await expect(page.getByTestId('product-card')).toHaveCount(4);
    await expect.poll(() => operations.includes('GroceryProductFilterCatalog')).toBe(true);
    await expect.poll(() => operations.includes('ProductCountryOrigins')).toBe(true);
    await expect.poll(() => operations.includes('ProductDietaryAvailability')).toBe(true);
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
    expect(operations).not.toContain('GroceryProductFilterCatalog');
    expect(operations).not.toContain('ProductCountryOrigins');
    expect(operations).not.toContain('ProductDietaryAvailability');
    expect(metadataStartedBeforeUserIntent).toBe(false);

    userOpenedFilters = true;
    await page.getByRole('button', { name: /filters/i }).click();
    await expect.poll(() => operations.includes('GroceryProductFilterCatalog')).toBe(true);
    await expect.poll(() => operations.includes('ProductCountryOrigins')).toBe(true);
    await expect.poll(() => operations.includes('ProductDietaryAvailability')).toBe(true);
  });

  test('excludes both legacy and canonical tree-nut allergen codes', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    const treeNutsButton = filterPanel.getByRole('button', { name: /tree nuts/i });
    await expect(treeNutsButton).toBeEnabled();
    await treeNutsButton.click();

    await expect.poll(() => productQueries.some((variables) => {
      const allergens = (variables.filter as Record<string, any> | undefined)?.excludeAllergens;
      return Array.isArray(allergens)
        && allergens.includes('nuts')
        && allergens.includes('tree_nuts');
    })).toBe(true);
    await expect(page.getByRole('link', { name: /organic gala apples/i })).toHaveCount(0);
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

  test('keeps dietary filters usable when the metadata page is not exhaustive', async ({ page }) => {
    let releaseDietaryAvailability!: () => void;
    const dietaryAvailabilityGate = new Promise<void>((resolve) => {
      releaseDietaryAvailability = resolve;
    });
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      filterCatalogProductLimit: 1,
      beforeProductDietaryAvailabilityResponse: async () => {
        await dietaryAvailabilityGate;
      },
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/products');

    const filterPanel = page.getByRole('region', { name: /^filtry$/i });
    await expect(filterPanel).toBeVisible();

    // The one-item metadata page contains only the vegan tag. Waiting until
    // Bakery disappears proves the partial metadata response has settled.
    await expect(filterPanel.getByRole('button', { name: /bakery/i })).toHaveCount(0);

    const glutenFreeButton = filterPanel.getByRole('button', { name: /bez glutenu/i });
    const vegetarianButton = filterPanel.getByRole('button', { name: /wegetariańskie/i });
    await expect(glutenFreeButton).toBeDisabled();
    await expect(vegetarianButton).toBeDisabled();

    releaseDietaryAvailability();

    await expect(glutenFreeButton).toBeEnabled();
    await expect(vegetarianButton).toBeEnabled();
    await expect(filterPanel.getByRole('button', { name: /bez laktozy/i })).toHaveCount(0);
    await expect(filterPanel.getByRole('button', { name: /bez cukru/i })).toHaveCount(0);

    await glutenFreeButton.click();
    await expect.poll(() => productQueries.some((variables) => {
      const dietaryTags = (variables.filter as Record<string, any> | undefined)?.dietaryTags;
      return Array.isArray(dietaryTags) && dietaryTags.includes('gluten-free');
    })).toBe(true);

    await expect(glutenFreeButton).toHaveAttribute('aria-pressed', 'true');
    await glutenFreeButton.click();
    await expect(glutenFreeButton).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('product-card')).toHaveCount(4);
  });

  test('restores dietary deep links and keeps the URL in sync with desktop filters', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products?ref=campaign&dietary=vegetarian');

    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    const vegetarianButton = filterPanel.getByRole('button', { name: /^vegetarian$/i });
    const glutenFreeButton = filterPanel.getByRole('button', { name: /^gluten free$/i });

    await expect(vegetarianButton).toBeEnabled();
    await expect(vegetarianButton).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => productQueries.some((variables) => {
      const dietaryTags = (variables.filter as Record<string, any> | undefined)?.dietaryTags;
      return Array.isArray(dietaryTags)
        && dietaryTags.length === 1
        && dietaryTags[0] === 'vegetarian';
    })).toBe(true);

    await glutenFreeButton.click();
    await expect(glutenFreeButton).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        pathname: url.pathname,
        ref: url.searchParams.get('ref'),
        dietary: url.searchParams.getAll('dietary'),
      };
    }).toEqual({
      pathname: '/en/products',
      ref: 'campaign',
      dietary: ['vegetarian', 'gluten-free'],
    });

    await vegetarianButton.click();
    await expect(vegetarianButton).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => new URL(page.url()).searchParams.getAll('dietary')).toEqual(['gluten-free']);

    const filterSummary = page.getByTestId('product-filter-summary');
    await filterSummary.getByRole('button', { name: /remove gluten free filter/i }).click();
    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        ref: url.searchParams.get('ref'),
        dietary: url.searchParams.get('dietary'),
      };
    }).toEqual({ ref: 'campaign', dietary: null });

    await page.goBack();
    await expect(glutenFreeButton).toHaveAttribute('aria-pressed', 'true');
    await expect(vegetarianButton).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => new URL(page.url()).searchParams.getAll('dietary')).toEqual(['gluten-free']);

    await page.goBack();
    await expect(vegetarianButton).toHaveAttribute('aria-pressed', 'true');
    await expect(glutenFreeButton).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => new URL(page.url()).searchParams.getAll('dietary')).toEqual([
      'vegetarian',
      'gluten-free',
    ]);

    await page.goForward();
    await expect(vegetarianButton).toHaveAttribute('aria-pressed', 'false');
    await expect(glutenFreeButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('clears search and dietary discovery state in one URL update', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products?ref=campaign&search=kimchi&dietary=vegetarian');

    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    const vegetarianButton = filterPanel.getByRole('button', { name: /^vegetarian$/i });
    const filterSummary = page.getByTestId('product-filter-summary');

    await expect(vegetarianButton).toHaveAttribute('aria-pressed', 'true');
    await expect(filterSummary.getByRole('button', { name: /remove search: kimchi filter/i })).toBeVisible();
    await expect(filterSummary.getByRole('button', { name: /remove vegetarian filter/i })).toBeVisible();

    await filterSummary.getByRole('button', { name: /^clear all$/i }).click();

    await expect.poll(() => {
      const url = new URL(page.url());
      return {
        ref: url.searchParams.get('ref'),
        search: url.searchParams.get('search'),
        dietary: url.searchParams.getAll('dietary'),
        sort: url.searchParams.get('sort'),
      };
    }).toEqual({
      ref: 'campaign',
      search: null,
      dietary: [],
      sort: null,
    });
    await expect(vegetarianButton).toHaveAttribute('aria-pressed', 'false');
    await expect(filterSummary).toHaveCount(0);
    await expect(page.getByTestId('product-card')).toHaveCount(4);
  });

  test('restores the initial category listing when Back removes a dietary filter', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/categories/kimchi-i-kiszonki');

    await expect(page.getByTestId('product-card')).toHaveCount(2);
    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    const glutenFreeButton = filterPanel.getByRole('button', { name: /^gluten free$/i });
    await expect(glutenFreeButton).toBeEnabled();

    await glutenFreeButton.click();
    await expect.poll(() => new URL(page.url()).searchParams.getAll('dietary')).toEqual(['gluten-free']);
    await expect(page.getByTestId('product-card')).toHaveCount(1);
    await expect(page.getByRole('link', { name: /pickled daikon radish/i })).toBeVisible();

    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get('dietary')).toBeNull();
    await expect(glutenFreeButton).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('product-card')).toHaveCount(2);
    await expect(page.getByRole('link', { name: /napa cabbage kimchi/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /pickled daikon radish/i })).toBeVisible();
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
    await filterPanel.getByRole('button', { name: /^frozen/i }).click();

    const filterSummary = page.getByTestId('product-filter-summary');
    await expect(filterSummary).toBeVisible();
    await expect(filterSummary).toContainText(/showing 1 of 1/i);
    await expect(filterSummary.getByRole('button', { name: /remove frozen filter/i })).toBeVisible();

    await filterSummary.getByRole('button', { name: /remove frozen filter/i }).click();

    await expect(page.getByTestId('product-card')).toHaveCount(4);
    await expect(filterSummary.getByRole('button', { name: /remove frozen filter/i })).toHaveCount(0);
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

  test('publishes a mobile dietary filter only after apply and restores it with Back', async ({ page }) => {
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
    const vegetarianButton = filterSheet.getByRole('button', { name: /^vegetarian$/i });
    await expect(vegetarianButton).toBeEnabled();

    await vegetarianButton.click();
    await expect(vegetarianButton).toHaveAttribute('aria-pressed', 'true');
    expect(new URL(page.url()).searchParams.get('dietary')).toBeNull();
    expect(productQueries.some((variables) => {
      const dietaryTags = (variables.filter as Record<string, any> | undefined)?.dietaryTags;
      return Array.isArray(dietaryTags) && dietaryTags.includes('vegetarian');
    })).toBe(false);

    await filterSheet.getByRole('button', { name: /apply filters/i }).click();
    await expect.poll(() => new URL(page.url()).searchParams.getAll('dietary')).toEqual(['vegetarian']);
    await expect.poll(() => productQueries.some((variables) => {
      const dietaryTags = (variables.filter as Record<string, any> | undefined)?.dietaryTags;
      return Array.isArray(dietaryTags) && dietaryTags.includes('vegetarian');
    })).toBe(true);

    await page.goBack();
    await expect.poll(() => new URL(page.url()).searchParams.get('dietary')).toBeNull();
    await expect(page.getByTestId('product-filter-summary')).toHaveCount(0);
    await expect(page.getByTestId('mobile-product-card')).toHaveCount(4);
  });

  test('preserves a mobile price filter while full catalog metadata is still loading', async ({ page }) => {
    let releaseCatalogMetadata!: () => void;
    const catalogMetadataGate = new Promise<void>((resolve) => {
      releaseCatalogMetadata = resolve;
    });
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      listingProductLimit: 3,
      beforeProductFilterCatalogResponse: async () => {
        await catalogMetadataGate;
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
    const minPriceInput = filterSheet.getByLabel(/minimum price/i);
    await minPriceInput.fill('17');
    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    await expect.poll(() => productQueries.some((variables) => {
      const filter = variables.filter as Record<string, any> | undefined;
      return filter?.price?.gte === 17;
    })).toBe(true);

    releaseCatalogMetadata();

    await openFilters(page, filterSheet);
    await expect(filterSheet).toContainText('Available range: 6.79-18.49 PLN');
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
    await filterSheet.getByRole('button', { name: /^frozen/i }).click();
    await filterSheet.getByLabel(/maximum price/i).fill('10');
    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    const filterSummary = page.getByTestId('product-filter-summary');
    await expect(filterSummary).toBeVisible();
    await expect(filterSummary).toContainText(/showing 0 of 0/i);
    await expect(filterSummary.getByRole('button', { name: /remove frozen filter/i })).toBeVisible();
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
