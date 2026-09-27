import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

const ADG_CONFIG = JSON.parse(readFileSync(path.join(process.cwd(), 'public/config/asiandeligo.json'), 'utf8'));

async function mockAsiaDeliGoConfig(page: Page) {
  await page.route('**/api/config/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(ADG_CONFIG),
  }));
}

type ProductVariables = { filter?: { categories?: unknown } };

test.describe('landing wave 2', () => {
  test('ADG pl: trust row replaces the pickup guide, shelf is Polecane, seo text renders', async ({ page }) => {
    const queries: ProductVariables[] = [];
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => queries.push(JSON.parse(JSON.stringify(variables))),
    });
    await page.goto('/pl');

    const trustRow = page.getByTestId('home-trust-row').first();
    await expect(trustRow.getByTestId('home-trust-row-item')).toHaveCount(4);
    await expect(trustRow).toContainText('Odbiór osobisty w Warszawie');
    await expect(page.getByTestId('home-pickup-guide')).toHaveCount(0);

    // Product cards inside the shelf render their own h2, so pin the heading by name.
    const shelf = page.getByTestId('mobile-home-fresh-picks');
    await expect(shelf.getByRole('heading', { name: 'Polecane', exact: true })).toBeVisible();
    await expect(shelf.getByRole('heading', { name: 'Nowości' })).toHaveCount(0);
    await expect.poll(() => queries.some((variables) => (
      Array.isArray(variables.filter?.categories)
      && (variables.filter!.categories as string[]).includes('cat-kimchi')
    ))).toBe(true);

    const seo = page.getByTestId('home-seo-text');
    await expect(seo.getByRole('heading', { level: 2 })).toContainText('Asia Deli Go');
    await expect(seo.getByRole('paragraph')).toHaveCount(2);
  });

  test('ADG en: trust row and seo text use the English copy', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.goto('/en');

    await expect(page.getByTestId('home-trust-row').first()).toContainText('Pickup in Warsaw');
    await expect(page.getByTestId('mobile-home-fresh-picks').getByRole('heading', { name: 'Recommended', exact: true })).toBeVisible();
    await expect(page.getByTestId('home-seo-text').getByRole('paragraph').first()).not.toContainText('Warszawie');
  });

  test('generic storefront has no trust row, no seo text and no featured shelf query', async ({ page }) => {
    const queries: ProductVariables[] = [];
    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => queries.push(JSON.parse(JSON.stringify(variables))),
    });
    await page.goto('/pl');
    await page.waitForLoadState('networkidle');

    // The generic SSR fixture has no homepage sections, so there is no shelf
    // at all; what matters is that nothing ADG-specific leaks in.
    await expect(page.getByTestId('home-trust-row')).toHaveCount(0);
    await expect(page.getByTestId('home-seo-text')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Polecane' })).toHaveCount(0);
    expect(queries.some((variables) => Array.isArray(variables.filter?.categories))).toBe(false);
  });

  test('desktop ADG: Polecane heading and 4 trust items', async ({ page }) => {
    await mockAsiaDeliGoConfig(page);
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl');

    await expect(page.getByTestId('desktop-home-fresh-picks').getByRole('heading', { level: 2 })).toHaveText('Polecane');
    await expect(page.locator('[data-testid="home-trust-row"]:visible').getByTestId('home-trust-row-item')).toHaveCount(4);
  });
});
