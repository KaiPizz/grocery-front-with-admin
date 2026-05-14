import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

test.describe('B1 category browsing', () => {
  test('server-renders the category index without requiring JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    try {
      // PRD Phase 2 / backlog B2: `/categories` must be browseable on first render with no JS dependency.
      await page.goto('/en/categories');

      await expect(page.getByRole('heading', { name: /categories/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /fruit.*2 products/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /household.*coming soon/i })).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test('server-renders category products without requiring JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    try {
      // PRD Phase 2 / backlog B1: slug category pages are public browse surfaces, not JS-only widgets.
      await page.goto('/en/categories/fruit');

      await expect(page.getByRole('heading', { name: /^fruit$/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /organic gala apples/i })).toBeVisible();
      await expect(page.getByText(/sourdough sandwich bread/i)).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('lists flat storefront categories with product counts and coming-soon badges', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en/categories');

    await expect(page.getByRole('heading', { name: /categories/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /fruit.*2 products/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /bakery.*1 product/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /household.*coming soon/i })).toBeVisible();
  });

  test('opens a category slug page with only storefront-visible products from that category', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en/categories/fruit');

    await expect(page.getByRole('heading', { name: /^fruit$/i })).toBeVisible();
    await expect(page.getByText(/2 products/i)).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: /categories/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /organic gala apples/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /blueberries snack box/i })).toBeVisible();
    await expect(page.getByText(/sourdough sandwich bread/i)).toHaveCount(0);
  });

  test('keeps empty categories visible with a clear empty state', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en/categories/household');

    await expect(page.getByRole('heading', { name: /^household$/i })).toBeVisible();
    await expect(page.getByText(/coming soon/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /browse all categories/i })).toBeVisible();
  });
});
