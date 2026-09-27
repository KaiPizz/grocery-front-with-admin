import type { Locator, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront, PRODUCT_BRAND_FACETS } from './mobile-fixtures';

type ProductVariables = Record<string, any>;
type MockOptions = NonNullable<Parameters<typeof mockMobileStorefront>[1]>;

function filterOf(variables: ProductVariables): Record<string, any> {
  return (variables.filter as Record<string, any> | undefined) ?? {};
}

async function openDesktopListing(
  page: Page,
  path: string,
  productQueries: ProductVariables[],
  options: MockOptions = {},
): Promise<Locator> {
  await mockMobileStorefront(page, {
    ...options,
    onProductsQuery: (variables) => {
      productQueries.push(JSON.parse(JSON.stringify(variables)));
    },
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(path);

  return page.getByRole('region', { name: /^filtry$/i });
}

async function openMobileFilters(page: Page, sheet: Locator) {
  const trigger = page.getByRole('button', { name: /^filters(?:,.*)?$/i });

  await expect.poll(async () => {
    if (await sheet.isVisible()) return true;

    try {
      await trigger.click({ timeout: 1_000 });
    } catch {
      return false;
    }

    return sheet.isVisible();
  }, { timeout: 15_000 }).toBe(true);
}

const RETIRED_GROUPS = /wyklucz alergeny|preferencje żywieniowe|strefa przechowywania|certyfikaty/i;

test.describe('lean listing filters', () => {
  test('desktop sidebar offers brand, country, price and in-stock only', async ({ page }) => {
    const filterPanel = await openDesktopListing(page, '/pl/products', []);

    await expect(filterPanel.getByTestId('filter-in-stock-only')).toBeVisible();
    await expect(filterPanel.getByText(/^marka$/i)).toBeVisible();
    await expect(filterPanel.getByText(/^kraj pochodzenia$/i)).toBeVisible();
    await expect(filterPanel.getByText(/^zakres cen$/i)).toBeVisible();
    await expect(filterPanel.getByText(RETIRED_GROUPS)).toHaveCount(0);
    await expect(filterPanel.getByRole('button', { name: /^wegańskie$|^mrożone$|^ekologiczne$|^wyklucz /i })).toHaveCount(0);
  });

  test('brand chip sends the stored brand string unchanged', async ({ page }) => {
    const productQueries: ProductVariables[] = [];
    const filterPanel = await openDesktopListing(page, '/pl/products', productQueries);
    const brandGroup = filterPanel.getByTestId('filter-brand');

    // S&B is the tenth brand, behind the "show more" toggle.
    await brandGroup.getByTestId('filter-brand-toggle').click();
    const brandChip = brandGroup.getByRole('button', { name: 'S&B', exact: true });
    await brandChip.click();

    await expect(brandChip).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => productQueries.some((variables) => {
      const brands = filterOf(variables).brands;
      return Array.isArray(brands) && brands.length === 1 && brands[0] === 'S&B';
    })).toBe(true);
    await expect(page.getByTestId('product-card')).toHaveCount(1);
    await expect(page.getByTestId('product-filter-summary').getByRole('button', { name: /usuń filtr S&B/i })).toBeVisible();
  });

  test('in-stock only toggles the stockAvailability filter', async ({ page }) => {
    const productQueries: ProductVariables[] = [];
    const filterPanel = await openDesktopListing(page, '/pl/products', productQueries);
    const checkbox = filterPanel.getByTestId('filter-in-stock-only');

    await checkbox.check();
    await expect.poll(() => productQueries.some((variables) => filterOf(variables).stockAvailability === 'IN_STOCK')).toBe(true);
    await expect(page.getByTestId('product-filter-summary').getByRole('button', { name: /usuń filtr tylko dostępne/i })).toBeVisible();
    await expect(page.getByTestId('product-card')).toHaveCount(4);

    // Unchecking returns to the initial variables, which urql's document cache
    // answers without a request; the observable contract is the listing state.
    const inStockRequests = productQueries.filter((variables) => filterOf(variables).stockAvailability === 'IN_STOCK').length;
    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
    await expect(page.getByTestId('product-filter-summary')).toHaveCount(0);
    await expect(page.getByTestId('product-card')).toHaveCount(4);
    expect(productQueries.filter((variables) => filterOf(variables).stockAvailability === 'IN_STOCK').length).toBe(inStockRequests);
  });

  test('shows eight brands before "show more" and hides the toggle below the limit', async ({ page }) => {
    const filterPanel = await openDesktopListing(page, '/pl/products', [], { catalogLabels: 'polish-source' });
    const brandGroup = filterPanel.getByTestId('filter-brand');
    const brandChips = brandGroup.getByRole('group').getByRole('button');
    const toggle = brandGroup.getByTestId('filter-brand-toggle');

    await expect(brandChips).toHaveCount(8);
    await expect(toggle).toHaveText(/pokaż więcej \(2\)/i);

    await toggle.click();
    await expect(brandChips).toHaveCount(PRODUCT_BRAND_FACETS.length);
    await expect(toggle).toHaveText(/pokaż mniej/i);

    await toggle.click();
    await expect(brandChips).toHaveCount(8);

    // Four countries in this fixture, below the limit of six: no toggle at all.
    const countryGroup = filterPanel.getByTestId('filter-country');
    await expect(countryGroup.getByRole('group').getByRole('button')).toHaveCount(4);
    await expect(countryGroup.getByTestId('filter-country-toggle')).toHaveCount(0);
  });

  test('hides the brand group when the backend has no productBrands field', async ({ page }) => {
    const productQueries: ProductVariables[] = [];
    const operations: string[] = [];
    const filterPanel = await openDesktopListing(page, '/pl/products', productQueries, {
      brands: 'error',
      onGraphqlOperation: (operationName) => operations.push(operationName),
    });

    await expect(page.getByTestId('product-card')).toHaveCount(4);
    const polandChip = filterPanel.getByRole('button', { name: /^poland$/i });
    await expect(polandChip).toBeEnabled();
    await expect.poll(() => operations.includes('ProductBrands')).toBe(true);
    await expect(filterPanel.getByTestId('filter-brand')).toHaveCount(0);
    await expect(filterPanel.getByText(/nie udało się sprawdzić dostępności filtrów/i)).toHaveCount(0);

    await polandChip.click();
    await expect.poll(() => productQueries.some((variables) => {
      const countries = filterOf(variables).countryOfOrigin;
      return Array.isArray(countries) && countries.includes('Poland');
    })).toBe(true);
    await expect(filterPanel.getByTestId('filter-brand')).toHaveCount(0);
  });

  test('a country deep link scopes the first request and pre-selects the chip', async ({ page }) => {
    const productQueries: ProductVariables[] = [];
    const filterPanel = await openDesktopListing(page, '/pl/products?country=Japonia', productQueries, {
      catalogLabels: 'polish-source',
    });

    await expect(page.getByTestId('product-card')).toHaveCount(1);
    expect(productQueries.length).toBeGreaterThan(0);
    expect(filterOf(productQueries[0]).countryOfOrigin).toEqual(['Japonia']);

    const japanChip = filterPanel.getByTestId('filter-country').getByRole('button', { name: /^japonia$/i });
    await expect(japanChip).toHaveAttribute('aria-pressed', 'true');

    await page.getByTestId('product-filter-summary').getByRole('button', { name: /usuń filtr japonia/i }).click();
    await expect(japanChip).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(() => new URL(page.url()).searchParams.get('country')).toBeNull();
    await expect(page.getByTestId('product-card')).toHaveCount(4);
  });

  test('a country deep link narrows the brand list to brands sold within that country', async ({ page }) => {
    const productQueries: ProductVariables[] = [];
    const brandQueries: ProductVariables[] = [];
    const filterPanel = await openDesktopListing(page, '/pl/products?country=Japonia', productQueries, {
      catalogLabels: 'polish-source',
      onGraphqlOperation: (operationName, _query, variables) => {
        if (operationName === 'ProductBrands') brandQueries.push(JSON.parse(JSON.stringify(variables ?? {})));
      },
    });

    await expect(page.getByTestId('product-card')).toHaveCount(1);
    // The brand facet is requested within the country, not channel-wide…
    await expect.poll(() => brandQueries.some((variables) => (
      Array.isArray(variables.countryOfOrigin)
      && variables.countryOfOrigin.length === 1
      && variables.countryOfOrigin[0] === 'Japonia'
    ))).toBe(true);
    // …so only the brand of the Japanese product is offered (the fixture's
    // channel-wide list would put Samyang first, and Samyang has no Japanese product).
    const brandGroup = filterPanel.getByTestId('filter-brand');
    await expect(brandGroup.getByRole('button', { name: /^s&b$/i })).toBeVisible();
    await expect(brandGroup.getByRole('button', { name: /^samyang$/i })).toHaveCount(0);
    await expect(brandGroup.getByRole('button')).toHaveCount(1);

    // Removing the country widens the brand list again.
    await page.getByTestId('product-filter-summary').getByRole('button', { name: /usuń filtr japonia/i }).click();
    await expect(page.getByTestId('product-card')).toHaveCount(4);
    await expect(brandGroup.getByRole('button', { name: /^samyang$/i })).toBeVisible();
  });

  test('accepts several countries in one query parameter', async ({ page }) => {
    const productQueries: ProductVariables[] = [];
    const filterPanel = await openDesktopListing(
      page,
      `/pl/products?country=${encodeURIComponent('Japonia,Korea Południowa')}`,
      productQueries,
      { catalogLabels: 'polish-source' },
    );

    await expect(page.getByTestId('product-card')).toHaveCount(2);
    expect(filterOf(productQueries[0]).countryOfOrigin).toEqual(['Japonia', 'Korea Południowa']);
    const countryGroup = filterPanel.getByTestId('filter-country');
    await expect(countryGroup.getByRole('button', { name: /^japonia$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(countryGroup.getByRole('button', { name: /^korea południowa$/i })).toHaveAttribute('aria-pressed', 'true');
    await expect(countryGroup.getByRole('button', { name: /^polska$/i })).toHaveAttribute('aria-pressed', 'false');
  });

  test('a storage zone deep link still filters and shows a removable chip', async ({ page }) => {
    const productQueries: ProductVariables[] = [];
    await openDesktopListing(page, '/pl/products?zone=FROZEN', productQueries);

    await expect(page.getByTestId('product-card')).toHaveCount(1);
    expect(filterOf(productQueries[0]).storageZone).toBe('FROZEN');

    const zoneChip = page.getByTestId('product-filter-summary').getByRole('button', { name: /usuń filtr mrożone/i });
    await expect(zoneChip).toBeVisible();
    await zoneChip.click();

    await expect(page.getByTestId('product-card')).toHaveCount(4);
    await expect.poll(() => productQueries.some((variables) => !filterOf(variables).storageZone)).toBe(true);
  });

  test('mobile filter sheet shows the same lean groups', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/products');

    const sheet = page.getByTestId('mobile-filter-sheet');
    await openMobileFilters(page, sheet);

    await expect(sheet.getByTestId('filter-in-stock-only')).toBeVisible();
    await expect(sheet.getByText(/^brand$/i)).toBeVisible();
    await expect(sheet.getByText(/^country of origin$/i)).toBeVisible();
    await expect(sheet.getByLabel(/minimum price/i)).toBeVisible();
    await expect(sheet.getByText(/exclude allergens|dietary preferences|storage zone|certifications/i)).toHaveCount(0);
  });
});
