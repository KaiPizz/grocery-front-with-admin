import { expect, test } from '@playwright/test';

test.describe('commercial collection SEO and document structure', () => {
  for (const locale of [
    {
      name: 'Polish',
      path: '/collections/korean-pantry',
      canonical: 'https://store.example.test/collections/korean-pantry',
    },
    {
      name: 'English',
      path: '/en/collections/korean-pantry',
      canonical: 'https://store.example.test/en/collections/korean-pantry',
    },
  ]) {
    test(`publishes ${locale.name} collection metadata and one main landmark`, async ({ page }) => {
      const response = await page.goto(locale.path);

      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle('Korean pantry | Configured Test Grocery');
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        'content',
        'Rice, noodles, sauces, and everyday staples',
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        locale.canonical,
      );
      await expect(page.locator('link[rel="alternate"][hreflang="pl"]')).toHaveAttribute(
        'href',
        'https://store.example.test/collections/korean-pantry',
      );
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
        'href',
        'https://store.example.test/en/collections/korean-pantry',
      );
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('main main')).toHaveCount(0);
      await expect(page.getByRole('heading', { level: 1, name: 'Korean pantry' })).toBeVisible();
    });
  }
});
