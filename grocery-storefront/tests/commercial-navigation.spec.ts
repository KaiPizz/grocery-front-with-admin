import { expect, test } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

test.describe('desktop commercial navigation', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    isMobile: false,
    hasTouch: false,
  });

  test('shows commercial quick links without breaking the category mega menu', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en');

    const mainNavigation = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(mainNavigation.getByRole('link', { name: /^outlet$/i })).toBeVisible();
    const koreanPantryLink = mainNavigation.getByRole('link', { name: /^korean pantry$/i });
    await expect(koreanPantryLink).toBeVisible();
    await expect(koreanPantryLink).toHaveAttribute('href', /\/en\/collections\/korean-pantry$/);

    await koreanPantryLink.click();
    await expect(page.getByRole('heading', { name: /^korean pantry$/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /kimchi/i })).toBeVisible();

    await page.goto('/en');
    const categoriesLink = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: /^categories$/i });
    await categoriesLink.hover();
    await expect(page.getByRole('navigation', { name: /category mega menu/i })).toBeVisible();
  });
});

test.describe('commercial landing routes', () => {
  test('renders outlet as the configured collection landing instead of a fake product listing', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/outlet');

    await expect(page.getByRole('heading', { name: /^outlet$/i })).toBeVisible();
    await expect(page.getByText(/rice, noodles, sauces/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /kimchi/i })).toBeVisible();
  });

  test('returns 404 for missing collections', async ({ page }) => {
    const response = await page.goto('/en/collections/missing-collection');

    expect(response?.status()).toBe(404);
  });
});

test.describe('mobile commercial navigation', () => {
  test('exposes commercial quick links in the mobile menu', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en');

    await page.getByRole('button', { name: /open menu/i }).click();
    const mobileNavigation = page.getByRole('navigation', { name: 'Mobile navigation' });

    await expect(mobileNavigation.getByRole('link', { name: /^outlet$/i })).toBeVisible();
    await expect(mobileNavigation.getByRole('link', { name: /^korean pantry$/i })).toBeVisible();

    await mobileNavigation.getByRole('link', { name: /^outlet$/i }).click();
    await expect(page).toHaveURL(/\/en\/outlet$/);
    await expect(page.getByRole('heading', { name: /^outlet$/i })).toBeVisible();
  });
});
