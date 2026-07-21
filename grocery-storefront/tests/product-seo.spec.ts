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
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      'https://store.example.test/products/organic-gala-apples',
    );
    await expect(page).toHaveTitle('Organic Gala Apples 1 kg | Configured Test Grocery');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Organic Gala apples 1 kg. Check the current price and availability at Configured Test Grocery.',
    );

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

    const breadcrumbJsonLd = await page.locator('script#product-breadcrumb-json-ld').evaluate((element) => {
      return JSON.parse(element.textContent ?? '{}');
    });
    expect(breadcrumbJsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { position: 1, item: 'https://store.example.test/en' },
        { position: 2, item: 'https://store.example.test/en/categories' },
        { position: 3, item: 'https://store.example.test/en/products/organic-gala-apples' },
      ],
    });
  });

  test('uses the unprefixed canonical URL and product SEO fields for Polish', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/products/organic-gala-apples');

    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://store.example.test/products/organic-gala-apples',
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      'https://store.example.test/products/organic-gala-apples',
    );
    await expect(page).toHaveTitle('Jabłka Gala 1 kg | Configured Test Grocery');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Świeże jabłka Gala 1 kg. Sprawdź cenę i dostępność w sklepie Configured Test Grocery.',
    );

    const productJsonLd = await page.locator('script#product-json-ld').evaluate((element) => {
      return JSON.parse(element.textContent ?? '{}');
    });
    expect(productJsonLd.url).toBe('https://store.example.test/products/organic-gala-apples');
  });

  test('permanently redirects old renamed-product slugs', async ({ request }) => {
    const redirects = [
      ['/products/chipsy-z-alg-morskich-z-sezamem-50g-sempio?source=test', '/products/sempio-seasoned-laver-gim-jaban-70g?source=test'],
      ['/pl/products/chipsy-z-alg-morskich-z-sezamem-50g-sempio', '/products/sempio-seasoned-laver-gim-jaban-70g'],
      ['/en/products/chipsy-z-alg-morskich-z-sezamem-50g-sempio', '/en/products/sempio-seasoned-laver-gim-jaban-70g'],
      ['/products/papryka-gochugaru-do-kimchi-1kg-panasia', '/products/papryka-gochugaru-red-pepper-powder-500g-ourhome'],
      ['/pl/products/papryka-gochugaru-do-kimchi-1kg-panasia', '/products/papryka-gochugaru-red-pepper-powder-500g-ourhome'],
      ['/en/products/papryka-gochugaru-do-kimchi-1kg-panasia', '/en/products/papryka-gochugaru-red-pepper-powder-500g-ourhome'],
    ];

    for (const [source, destination] of redirects) {
      const response = await request.get(source, { maxRedirects: 0 });
      expect(response.status(), source).toBe(301);
      const location = response.headers().location;
      expect(location, source).toBeTruthy();
      const redirectedUrl = new URL(location, 'http://127.0.0.1:3018');
      expect(`${redirectedUrl.pathname}${redirectedUrl.search}`, source).toBe(destination);
    }
  });

  test('returns a real 404 without Product JSON-LD for an unpublished product', async ({ page }) => {
    const response = await page.goto('/en/products/unpublished-product');

    expect(response?.status()).toBe(404);
    await expect(page.locator('script#product-json-ld')).toHaveCount(0);
    await expect(page.locator('body')).toContainText(/not found|could not be found|couldn't find|nie znaleziono/i);
  });
});
