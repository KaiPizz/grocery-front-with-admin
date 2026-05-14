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

test.describe('desktop category navigation', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    isMobile: false,
    hasTouch: false,
  });

  test('opens a Kimchi-style category mega menu with taxonomy columns and a visual feature tile', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en');

    const mainNavigation = page.getByRole('navigation', { name: 'Main navigation' });
    const categoriesLink = mainNavigation.getByRole('link', { name: /^categories$/i });

    // wiki/concepts/kimchi-category-model.md: desktop category discovery should happen in the header,
    // not only after navigating to a flat `/categories` page.
    await categoriesLink.hover();

    const megaMenu = page.getByRole('navigation', { name: /category mega menu/i });
    await expect(megaMenu).toBeVisible();
    await expect(megaMenu.getByRole('link', { name: /browse all categories/i })).toBeVisible();
    await expect(megaMenu.getByRole('link', { name: /fruit.*2 products/i })).toBeVisible();
    await expect(megaMenu.getByRole('link', { name: /household.*coming soon/i })).toBeVisible();
    await expect(megaMenu.getByRole('img', { name: /fruit category/i })).toBeVisible();

    await megaMenu.getByRole('link', { name: /fruit.*2 products/i }).click();
    await expect(page).toHaveURL(/\/en\/categories\/fruit$/);
  });

  test('keeps the category mega menu reachable from keyboard focus', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en');

    const mainNavigation = page.getByRole('navigation', { name: 'Main navigation' });
    const categoriesLink = mainNavigation.getByRole('link', { name: /^categories$/i });

    await categoriesLink.focus();

    const megaMenu = page.getByRole('navigation', { name: /category mega menu/i });
    await expect(megaMenu).toBeVisible();
    await expect(categoriesLink).toHaveAttribute('aria-expanded', 'true');

    await page.keyboard.press('Escape');
    await expect(megaMenu).toBeHidden();
    await expect(categoriesLink).toHaveAttribute('aria-expanded', 'false');
  });
});
