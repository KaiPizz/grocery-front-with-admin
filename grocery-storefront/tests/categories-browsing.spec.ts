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

  test('applies desktop listing filters through a category-scoped products query', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/categories/fruit');

    await expect(page.getByRole('heading', { name: /^fruit$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /organic gala apples/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /blueberries snack box/i })).toBeVisible();

    await expect.poll(() => productQueries.some((variables) => {
      const filter = variables.filter as Record<string, any> | undefined;
      return Array.isArray(filter?.categories) && filter.categories.includes('cat-fruit');
    })).toBe(true);

    await page.getByRole('button', { name: /filters/i }).click();
    const filterPanel = page.locator('#filter-panel');
    await expect(filterPanel).toBeVisible();
    await filterPanel.getByLabel(/minimum price/i).fill('10');

    await expect.poll(() => productQueries.some((variables) => {
      const filter = variables.filter as Record<string, any> | undefined;
      return Array.isArray(filter?.categories)
        && filter.categories.includes('cat-fruit')
        && filter.price?.gte === 10;
    })).toBe(true);
    await expect(page.getByRole('heading', { name: /organic gala apples/i })).toBeVisible();
    await expect(page.getByText(/blueberries snack box/i)).toHaveCount(0);
  });

  test('applies mobile category filters only after tapping apply', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/categories/fruit');

    const cards = page.getByTestId('mobile-product-card');
    await expect(cards).toHaveCount(2);

    await page.getByRole('button', { name: /filters/i }).click();
    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await expect(filterSheet).toBeVisible();
    await filterSheet.getByLabel(/minimum price/i).fill('10');

    expect(productQueries.some((variables) => {
      const filter = variables.filter as Record<string, any> | undefined;
      return Array.isArray(filter?.categories)
        && filter.categories.includes('cat-fruit')
        && filter.price?.gte === 10;
    })).toBe(false);
    await expect(cards).toHaveCount(2);

    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    await expect(cards).toHaveCount(1);
    await expect.poll(() => productQueries.some((variables) => {
      const filter = variables.filter as Record<string, any> | undefined;
      return Array.isArray(filter?.categories)
        && filter.categories.includes('cat-fruit')
        && filter.price?.gte === 10;
    })).toBe(true);
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

  test('keeps the category panel visually attached to the header', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en');

    const header = page.getByRole('banner');
    const mainNavigation = page.getByRole('navigation', { name: 'Main navigation' });
    const categoriesLink = mainNavigation.getByRole('link', { name: /^categories$/i });

    await categoriesLink.hover();

    const megaMenu = page.getByRole('navigation', { name: /category mega menu/i });
    await expect(megaMenu).toBeVisible();

    const headerBox = await header.boundingBox();
    const panelBox = await megaMenu.locator(':scope > div').boundingBox();

    expect(headerBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(panelBox!.y).toBeLessThanOrEqual(headerBox!.y + headerBox!.height + 1);
  });

  test('locks the page scroll while the category mega menu is open', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en');
    await page.evaluate(() => {
      const spacer = document.createElement('div');
      spacer.setAttribute('data-testid', 'category-scroll-lock-spacer');
      spacer.style.height = '2400px';
      document.body.appendChild(spacer);
      window.scrollTo(0, 0);
    });

    const mainNavigation = page.getByRole('navigation', { name: 'Main navigation' });
    const categoriesLink = mainNavigation.getByRole('link', { name: /^categories$/i });

    await categoriesLink.hover();

    const megaMenu = page.getByRole('navigation', { name: /category mega menu/i });
    await expect(megaMenu).toBeVisible();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).toBe('hidden');

    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

    await page.keyboard.press('Escape');
    await expect(megaMenu).toBeHidden();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflow)).not.toBe('hidden');

    await page.mouse.wheel(0, 900);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});
