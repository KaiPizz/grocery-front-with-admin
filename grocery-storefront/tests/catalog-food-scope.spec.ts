import { expect, test, type Page } from '@playwright/test';
import { mockMobileStorefront, PRIMARY_PRODUCT } from './mobile-fixtures';

// Owner requirement: cuisine listings fail closed until category identity is
// usable. A country filter alone remains independent of the food-only mode.
interface ScopeVariables {
  filter?: { categories?: string[]; countryOfOrigin?: string[] };
  categoryIds?: string[] | null;
  countryOfOrigin?: string[] | null;
}

interface ScopeRequest {
  operation: string;
  variables: ScopeVariables;
}

type MetadataState = 'pending' | 'error' | 'empty' | 'ready';

const COUNTRY = 'Korea Południowa';
const COUNTRY_URL = `/en/products?country=${encodeURIComponent(COUNTRY)}`;
const CUISINE_URL = `${COUNTRY_URL}&type=food`;
const FOOD_IDS = ['scope-food-root', 'scope-food-leaf'];
const LISTING_OPERATIONS = ['GroceryProducts', 'GroceryProductListing'];
const FACET_OPERATIONS = ['ProductCountryOrigins', 'ProductBrands'];
const CATEGORY_NODES = [
  { id: FOOD_IDS[0], slug: 'do-gotowania-i-sushi', name: 'Cooking', parent: null, level: 0, products: { totalCount: 1 } },
  { id: FOOD_IDS[1], slug: 'scope-food-leaf', name: 'Food', parent: { id: FOOD_IDS[0], slug: 'do-gotowania-i-sushi' }, level: 1, products: { totalCount: 1 } },
  { id: 'scope-cosmetics', slug: 'kosmetyki-koreanskie', name: 'Beauty', parent: null, level: 0, products: { totalCount: 1 } },
];
const PRODUCTS = [
  { ...PRIMARY_PRODUCT, id: 'scope-food', slug: 'scope-food', name: 'Scoped Korean food', countryOfOrigin: COUNTRY, category: CATEGORY_NODES[1] },
  { ...PRIMARY_PRODUCT, id: 'scope-cosmetic', slug: 'scope-cosmetic', name: 'Scoped Korean facial cleanser', countryOfOrigin: COUNTRY, category: CATEGORY_NODES[2] },
];

async function mockFoodScope(page: Page, initialMetadataState: MetadataState) {
  await mockMobileStorefront(page);
  const requests: ScopeRequest[] = [];
  let metadataState = initialMetadataState;
  let releaseMetadata: () => void = () => {};
  const pendingMetadata = new Promise<void>((resolve) => { releaseMetadata = resolve; });

  await page.route('**/api/graphql*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const body = route.request().postDataJSON() ?? {
      query: requestUrl.searchParams.get('query'),
      variables: JSON.parse(requestUrl.searchParams.get('variables') ?? '{}'),
    };
    const operation = body.operationName || String(body.query ?? '').match(/\bquery\s+(\w+)/)?.[1] || '';
    const variables: ScopeVariables = body.variables ?? {};
    requests.push({ operation, variables: structuredClone(variables) });

    if (['Categories', 'PublicCategories', 'PublicCategoryNavigation'].includes(operation)) {
      if (metadataState === 'pending') await pendingMetadata;
      if (metadataState === 'error') {
        await route.fulfill({ json: { errors: [{ message: 'Category metadata unavailable' }] } });
        return;
      }
      const nodes = metadataState === 'empty' ? [] : CATEGORY_NODES;
      await route.fulfill({ json: { data: { categories: {
        edges: nodes.map((node, index) => ({ node, cursor: `category-${index}` })),
        totalCount: nodes.length,
        pageInfo: { hasNextPage: false, endCursor: null },
      } } } });
      return;
    }
    if (LISTING_OPERATIONS.includes(operation)) {
      const categoryIds = variables.filter?.categories ?? [];
      const countries = variables.filter?.countryOfOrigin ?? [];
      const products = PRODUCTS.filter((product) => (
        (!categoryIds.length || categoryIds.includes(product.category.id))
        && (!countries.length || countries.includes(product.countryOfOrigin))
      ));
      await route.fulfill({ json: { data: { products: {
        edges: products.map((node, index) => ({ node, cursor: `scope-${index}` })),
        totalCount: products.length,
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: 'scope-0', endCursor: 'scope-1' },
      } } } });
      return;
    }
    if (FACET_OPERATIONS.includes(operation)) {
      const products = PRODUCTS.filter((product) => !variables.categoryIds?.length || variables.categoryIds.includes(product.category.id));
      await route.fulfill({ json: { data: operation === 'ProductCountryOrigins'
        ? { productCountryOrigins: [{ value: COUNTRY, count: products.length }] }
        : { productBrands: [{ value: 'Scope fixture brand', count: products.length }] },
      } });
      return;
    }
    await route.fallback();
  });

  return {
    requests,
    ready() {
      metadataState = 'ready';
      releaseMetadata();
    },
  };
}

function discoveryRequests(requests: ScopeRequest[]) {
  return requests.filter((request) => [...LISTING_OPERATIONS, ...FACET_OPERATIONS].includes(request.operation));
}

function expectFoodRequest(request: ScopeRequest) {
  const ids = LISTING_OPERATIONS.includes(request.operation)
    ? request.variables.filter?.categories : request.variables.categoryIds;
  expect([...(ids ?? [])].sort()).toEqual([...FOOD_IDS].sort());
}

async function expectFoodOnly(page: Page, requests: ScopeRequest[]) {
  await expect(page.getByTestId('product-card')).toHaveCount(1);
  await expect(page.getByTestId('product-card')).toContainText('Scoped Korean food');
  await expect(page.getByText('Scoped Korean facial cleanser', { exact: true })).toHaveCount(0);
  for (const operation of ['GroceryProductListing', ...FACET_OPERATIONS]) {
    await expect.poll(() => requests.some((request) => request.operation === operation)).toBe(true);
  }
  for (const request of discoveryRequests(requests)) expectFoodRequest(request);
}

test.describe('cuisine category metadata safety', () => {
  test.use({ viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false });

  test('pending metadata sends no product or facet request, then releases only a food-scoped query', async ({ page }) => {
    const mock = await mockFoodScope(page, 'pending');
    await page.goto(CUISINE_URL);
    await expect(page.getByRole('heading', { level: 1, name: 'Korean cuisine' })).toBeVisible();
    await expect.poll(() => mock.requests.some((request) => request.operation === 'PublicCategoryNavigation')).toBe(true);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(discoveryRequests(mock.requests)).toEqual([]);
    await expect(page.getByTestId('product-card')).toHaveCount(0);

    mock.ready();
    await expectFoodOnly(page, mock.requests);
  });

  for (const state of ['error', 'empty'] as const) {
    test(`${state} category metadata never broadens a cuisine; Retry recovers with food-scoped products and facets`, async ({ page }) => {
      const mock = await mockFoodScope(page, state);
      await page.goto(CUISINE_URL);
      const retry = page.getByRole('button', { name: 'Retry', exact: true });
      await expect(retry).toBeVisible();
      expect(discoveryRequests(mock.requests)).toEqual([]);
      await expect(page.getByTestId('product-card')).toHaveCount(0);

      mock.ready();
      await retry.click();
      await expectFoodOnly(page, mock.requests);
    });
  }

  test('same-document country-only navigation includes non-food; Back restores the explicit food scope', async ({ page }) => {
    const mock = await mockFoodScope(page, 'ready');
    await page.goto(CUISINE_URL);
    await expectFoodOnly(page, mock.requests);
    await page.evaluate((href) => {
      document.documentElement.dataset.scopeNavigation = 'same-document';
      window.history.pushState(null, '', href);
    }, COUNTRY_URL);
    await expect(page).toHaveURL(/\/products\?country=Korea%20Po%C5%82udniowa$/);
    await expect(page.getByTestId('product-card')).toHaveCount(2);
    await expect(page.getByTestId('product-card').filter({ hasText: 'Scoped Korean facial cleanser' })).toHaveCount(1);
    expect(mock.requests.some((request) => (
      LISTING_OPERATIONS.includes(request.operation)
      && !request.variables.filter?.categories?.length
      && request.variables.filter?.countryOfOrigin?.[0] === COUNTRY
    ))).toBe(true);

    const beforeBack = mock.requests.length;
    await page.goBack();
    await expect(page).toHaveURL(/type=food$/);
    await expect(page.locator('html')).toHaveAttribute('data-scope-navigation', 'same-document');
    await expect(page.getByTestId('product-card')).toHaveCount(1);
    await expect(page.getByTestId('product-card')).toContainText('Scoped Korean food');
    // A cached food result need not issue another HTTP request. Any new request
    // after Back must nevertheless carry food category IDs before pagination.
    for (const request of discoveryRequests(mock.requests.slice(beforeBack))) expectFoodRequest(request);
  });
});
