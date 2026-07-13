import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

test.describe('product SEO', () => {
  test('publishes a product canonical and valid Product JSON-LD', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://store.example.test/en/products/organic-gala-apples',
    );
    await expect(page).toHaveTitle('Organic Gala Apples Family Value Pack');

    const productJsonLd = await page.locator('script#product-json-ld').evaluate((element) => {
      return JSON.parse(element.textContent ?? '{}');
    });

    expect(productJsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: 'Organic Gala Apples Family Value Pack',
      sku: 'APPLE-1KG',
      category: 'Fruit',
      url: 'https://store.example.test/en/products/organic-gala-apples',
      offers: {
        '@type': 'Offer',
        price: '12.99',
        priceCurrency: 'PLN',
        availability: 'https://schema.org/InStock',
      },
    });
    expect(productJsonLd.image).toEqual([
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    ]);
  });

  test('returns a real 404 without Product JSON-LD for an unpublished product', async ({ page }) => {
    const response = await page.goto('/en/products/unpublished-product');

    expect(response?.status()).toBe(404);
    await expect(page.locator('script#product-json-ld')).toHaveCount(0);
    await expect(page.locator('body')).toContainText(/not found|could not be found|nie znaleziono/i);
  });
});
