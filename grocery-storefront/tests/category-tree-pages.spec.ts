import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

type ProductVariables = { filter?: { categories?: unknown } };
const categoriesOf = (variables: ProductVariables) => (
  Array.isArray(variables.filter?.categories) ? variables.filter!.categories.map(String) : []
);

test.describe('category tree pages', () => {
  test('group page filters by leaf ids and shows leaf tiles', async ({ page }) => {
    const queries: ProductVariables[] = [];
    await mockMobileStorefront(page, { onProductsQuery: (variables) => queries.push(JSON.parse(JSON.stringify(variables))) });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/categories/kimchi-i-kiszonki');

    await expect(page.getByTestId('category-leaf-tiles')).toHaveCount(0);
    const sidebar = page.getByTestId('desktop-category-sidebar');
    const leaves = sidebar.getByTestId('category-tree-leaves');
    await expect(leaves.getByRole('link')).toHaveCount(2);
    await expect(leaves.getByRole('link', { name: /^kimchi/i })).toHaveAttribute('href', '/categories/kimchi');
    await expect(page.getByTestId('product-card')).toHaveCount(2);

    // SSR goes to config-server; the first client request after a filter change must carry both leaf ids and never the group id.
    await page.getByTestId('filter-in-stock-only').check();
    await expect.poll(() => queries.some((variables) => JSON.stringify([...categoriesOf(variables)].sort()) === JSON.stringify(['cat-kimchi', 'cat-pickled-vegetables']))).toBe(true);
    expect(queries.some((variables) => categoriesOf(variables).includes('cat-group-kimchi'))).toBe(false);
  });

  test('leaf page shows the breadcrumb, filters by its own id and marks itself in the tree', async ({ page }) => {
    const queries: ProductVariables[] = [];
    await mockMobileStorefront(page, { onProductsQuery: (variables) => queries.push(JSON.parse(JSON.stringify(variables))) });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/categories/kimchi');

    const breadcrumb = page.getByTestId('category-breadcrumb');
    await expect(breadcrumb).toContainText('Kimchi i kiszonki');
    await expect(breadcrumb.getByRole('link', { name: 'Kimchi i kiszonki' })).toHaveAttribute('href', '/categories/kimchi-i-kiszonki');
    await expect(page.getByTestId('product-card')).toHaveCount(1);

    const sidebar = page.getByTestId('desktop-category-sidebar');
    await expect(sidebar.getByTestId('category-tree-leaves')).toHaveCount(1); // only the current group is expanded
    const leaves = sidebar.getByTestId('category-tree-leaves');
    await expect(leaves.getByRole('link')).toHaveCount(2);
    await expect(leaves.getByRole('link', { name: /^kimchi/i })).toHaveAttribute('aria-current', 'page');

    await page.getByTestId('filter-in-stock-only').check();
    await expect.poll(() => queries.some((variables) => JSON.stringify(categoriesOf(variables)) === JSON.stringify(['cat-kimchi']))).toBe(true);
  });

  test('old group and leaf slugs redirect', async ({ page }) => {
    await mockMobileStorefront(page);
    for (const [from, to] of [
      ['/categories/sosy-pasty-i-przyprawy', '/categories/sosy-i-oleje'],
      ['/pl/categories/sushi-i-algi', '/categories/do-gotowania-i-sushi'],
      ['/en/categories/grzyby-warzywa-i-tofu', '/en/categories/do-gotowania-i-sushi'],
    ]) {
      const response = await page.request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(301);
      expect(response.headers()['location'], from).toBe(to);
    }
    // ramyun-ramen is renamed by the tree but still live in this catalog (the
    // data apply has not happened yet): it must keep serving, never redirect.
    const liveOldLeaf = await page.request.get('/categories/ramyun-ramen', { maxRedirects: 0 });
    expect(liveOldLeaf.status()).toBe(200);
    for (const [from, to] of [
      ['/categories/du%C5%BCa-micha', /\/categories\/ramyun-w-kubku-i-misce$/],
      ['/en/categories/sosy-sojowe', /\/en\/categories\/sos-sojowy$/],
    ] as const) {
      const renamedLeaf = await page.request.get(from, { maxRedirects: 0 });
      expect([301, 307, 308], from).toContain(renamedLeaf.status());
      expect(renamedLeaf.headers()['location'], from).toMatch(to);
    }
  });

  test('english leaf metadata uses the catalog translation, not the Polish name', async ({ page }) => {
    await page.goto('/en/categories/ramyun-ramen');
    await expect(page).toHaveTitle('Ramyun and ramen | Configured Test Grocery');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Korean instant noodles in packs and cups.');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ramyun and ramen');
    // Two fixture products: below the index threshold, so noindex but crawlable.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('sitemap lists groups and only leaves above the index threshold', async ({ page }) => {
    const response = await page.request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).toContain('/categories/kimchi-i-kiszonki</loc>');
    expect(xml).toContain('/en/categories/makaron-i-ryz</loc>');
    expect(xml).not.toContain('/categories/kimchi</loc>'); // fixture leaf has 1 product (< 3)
    expect(xml).not.toContain('sosy-pasty-i-przyprawy');
  });

  test('mobile: group page shows breadcrumb and one chip row', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/pl/categories/kimchi-i-kiszonki');

    const rail = page.getByTestId('mobile-category-rail');
    await expect(rail.getByRole('link')).toHaveCount(3);
    await expect(rail.getByRole('link', { name: /^kimchi i kiszonki/i })).toHaveAttribute('aria-current', 'page');
    await expect(page.getByTestId('category-leaf-tiles')).toHaveCount(0);
    await expect(page.getByTestId('category-breadcrumb')).toContainText('Kimchi i kiszonki');
  });

  test('tablet: category chip row and filter button', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 900, height: 1000 });
    await page.goto('/pl/categories/kimchi-i-kiszonki');

    const rail = page.getByTestId('tablet-category-rail');
    await expect(rail).toBeVisible();
    await expect(rail.getByRole('link')).toHaveCount(3);

    await page.getByRole('button', { name: /^filtry/i }).click();
    const panel = page.locator('#filter-panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId('filter-in-stock-only')).toBeVisible();
  });
});
