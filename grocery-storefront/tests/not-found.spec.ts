import { expect, test } from '@playwright/test';

test.describe('localized not-found page', () => {
  test('renders a branded Polish 404 with safe recovery links', async ({ page }) => {
    const response = await page.goto('/brakujaca-strona-qa');

    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expect(page.getByRole('heading', { level: 1, name: 'Nie znaleźliśmy tej strony' })).toBeVisible();
    await expect(page.getByText('Configured Test Grocery', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Wróć na stronę główną', exact: true })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: 'Przejdź do produktów', exact: true })).toHaveAttribute('href', '/products');
    await expect(page.getByTestId('not-found-illustration')).toBeHidden();
    await expect(page.getByText('This page could not be found.')).toHaveCount(0);
  });

  test('keeps English copy and locale-prefixed recovery links under /en', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const response = await page.goto('/en/missing-page-qa');

    expect(response?.status()).toBe(404);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1, name: "We couldn't find that page" })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to home', exact: true })).toHaveAttribute('href', '/en');
    await expect(page.getByRole('link', { name: 'Browse products', exact: true })).toHaveAttribute('href', '/en/products');
    await expect(page.getByTestId('not-found-illustration')).toBeVisible();
    await expect(page.getByText('This page could not be found.')).toHaveCount(0);
  });
});
