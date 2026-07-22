import { expect, test, type Page } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

async function openMobileSearch(page: Page, locale = 'en') {
  await page.goto(`/${locale}/products`);
  await page.getByRole('button', { name: /open search|otwórz wyszukiwarkę/i }).click();
  return page.locator('input[type="search"]:visible');
}

const PRODUCT_KEYWORD_CASES = [
  {
    label: 'product-name intent',
    query: 'ramen',
    expectedProduct: 'Spicy Ramyun Noodles',
  },
  {
    label: 'brand intent from a backend-only field',
    query: 'Nongshim',
    expectedProduct: 'Spicy Ramyun Noodles',
  },
  {
    label: 'accent-folded product alias',
    query: 'jablka',
    expectedProduct: 'Organic Gala Apples Family Value Pack',
  },
  {
    label: 'exact hyphenated SKU',
    query: 'ADG-001',
    expectedProduct: 'Organic Gala Apples Family Value Pack',
  },
  {
    label: 'hyphenless SKU',
    query: 'ADG001',
    expectedProduct: 'Organic Gala Apples Family Value Pack',
  },
  {
    label: 'backend-only product code',
    query: 'backend-only-product-code',
    expectedProduct: 'Organic Gala Apples Family Value Pack',
  },
] as const;

test.describe('catalog search discovery', () => {
  test('queries the catalog endpoint with relevance ordering', async ({ page }) => {
    let searchVariables: Record<string, unknown> | null = null;
    let searchDocument = '';

    await mockMobileStorefront(page, {
      onGraphqlOperation: (operationName, query) => {
        if (operationName === 'StorefrontProductSearch') searchDocument = query;
      },
      onSearchProductsIndexQuery: (variables) => {
        searchVariables = variables;
      },
    });

    const searchInput = await openMobileSearch(page);
    await searchInput.fill('ADG-001');

    await expect.poll(() => searchVariables?.query).toBe('ADG-001');
    expect(searchVariables?.first).toBe(20);
    expect(searchDocument).toContain('searchProducts: products');
    expect(searchDocument).toContain('field: RELEVANCE');
  });

  for (const keywordCase of PRODUCT_KEYWORD_CASES) {
    test(`finds ${keywordCase.label}: ${keywordCase.query}`, async ({ page }) => {
      await mockMobileStorefront(page);

      const searchInput = await openMobileSearch(page);
      await searchInput.fill(keywordCase.query);

      await expect(
        page
          .getByTestId('search-product-results')
          .getByRole('button', { name: keywordCase.expectedProduct }),
      ).toBeVisible();
    });
  }

  test('finds an accent-bearing category from an unaccented alias', async ({ page }) => {
    await mockMobileStorefront(page);

    const searchInput = await openMobileSearch(page);
    await searchInput.fill('ryz');

    const categoryResult = page
      .getByTestId('search-category-results')
      .getByRole('button', { name: /noodles and rice.*category/i });
    await expect(categoryResult).toBeVisible();
    await categoryResult.click();

    await expect(page).toHaveURL(/\/en\/categories\/makaron-i-ryz$/);
  });

  test('preserves backend relevance order for exact EAN and backend-only matches', async ({ page }) => {
    await mockMobileStorefront(page);

    const searchInput = await openMobileSearch(page);
    await searchInput.fill('5901234567890');

    const productResults = page.getByTestId('search-product-results').getByRole('button');
    await expect(productResults).toHaveCount(2);
    await expect(productResults.nth(0)).toContainText('Blueberries Snack Box');
    await expect(productResults.nth(1)).toContainText('Organic Gala Apples Family Value Pack');
  });

  for (const emptyCase of [
    {
      locale: 'en',
      noMatches: 'No matching products yet',
      resultsFor: 'Results for: unfindable-bubble-tea-404',
      seeResults: 'See results for "unfindable-bubble-tea-404"',
    },
    {
      locale: 'pl',
      noMatches: 'Brak dopasowanych produktów',
      resultsFor: 'Wyniki dla: unfindable-bubble-tea-404',
      seeResults: 'Zobacz wyniki dla "unfindable-bubble-tea-404"',
    },
  ] as const) {
    test(`keeps the localized empty dropdown open and echoes the ${emptyCase.locale} query`, async ({ page }) => {
      await mockMobileStorefront(page);

      const searchInput = await openMobileSearch(page, emptyCase.locale);
      await searchInput.fill('unfindable-bubble-tea-404');

      await expect(page.getByText(emptyCase.noMatches, { exact: true })).toBeVisible();
      await expect(searchInput).toHaveAttribute('aria-expanded', 'true');
      await expect(page.getByText(emptyCase.resultsFor, { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: emptyCase.seeResults, exact: true })).toBeVisible();
    });
  }

  test('carries an unsuccessful keyword into the results page and empty-state copy', async ({ page }) => {
    await mockMobileStorefront(page);

    const searchInput = await openMobileSearch(page);
    await searchInput.fill('unfindable-bubble-tea-404');
    await page.getByRole('button', { name: 'See results for "unfindable-bubble-tea-404"', exact: true }).click();

    await expect(page).toHaveURL(/\/en\/products\?search=unfindable-bubble-tea-404$/);
    await expect(page.getByRole('heading', { name: 'Results for “unfindable-bubble-tea-404”' })).toBeVisible();
    await expect(page.getByText('No results for “unfindable-bubble-tea-404”', { exact: true })).toBeVisible();
  });

  test('shows a search title, removable query chip, and relevance-first listing', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });

    await page.goto('/en/products?search=apples');

    await expect(page.getByRole('heading', { name: /results for.*apples/i })).toBeVisible();
    await expect(page.getByTestId('mobile-products-sort-select')).toHaveValue('relevance');
    await expect.poll(() => productQueries.some((variables) => (
      variables.filter?.search === 'apples'
      && variables.sortBy?.field === 'RELEVANCE'
      && variables.sortBy?.direction === 'DESC'
    ))).toBe(true);

    const searchChip = page
      .getByTestId('product-filter-summary')
      .getByRole('button', { name: /remove search: apples filter/i });
    await expect(searchChip).toBeVisible();
    await searchChip.click();

    await expect(page).toHaveURL(/\/en\/products$/);
    await expect(page.getByRole('heading', { name: /^all products/i })).toBeVisible();
    await expect(page.getByTestId('mobile-products-sort-select')).toHaveValue('newest');
  });
});
