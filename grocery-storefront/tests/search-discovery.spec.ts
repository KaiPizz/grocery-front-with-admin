import { expect, test } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

test.describe('catalog search discovery', () => {
  test('queries the catalog endpoint with relevance ordering and matches a SKU', async ({ page }) => {
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

    await page.goto('/en/products');
    await page.getByRole('button', { name: /open search/i }).click();
    await page.locator('input[type="search"]:visible').fill('ADG-001');

    await expect.poll(() => searchVariables?.query).toBe('ADG-001');
    expect(searchVariables?.first).toBe(20);
    expect(searchDocument).toContain('searchProducts: products');
    expect(searchDocument).toContain('field: RELEVANCE');
    await expect(page.getByText('Organic Gala Apples Family Value Pack').first()).toBeVisible();
  });

  test('finds an accent-bearing category from an unaccented alias', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en/products');
    await page.getByRole('button', { name: /open search/i }).click();
    await page.locator('input[type="search"]:visible').fill('ryz');

    const categoryResult = page
      .getByTestId('search-category-results')
      .getByRole('button', { name: /noodles and rice.*category/i });
    await expect(categoryResult).toBeVisible();
    await categoryResult.click();

    await expect(page).toHaveURL(/\/en\/categories\/makaron-i-ryz$/);
  });

  test('keeps backend-ranked matches from fields not returned to the UI scorer', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en/products');
    await page.getByRole('button', { name: /open search/i }).click();
    await page.locator('input[type="search"]:visible').fill('backend-only-product-code');

    // The fixture models a product returned by backend relevance even though
    // its visible name/category/SKU do not contain the private product code.
    await expect(page.getByText('Organic Gala Apples Family Value Pack').first()).toBeVisible();
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
