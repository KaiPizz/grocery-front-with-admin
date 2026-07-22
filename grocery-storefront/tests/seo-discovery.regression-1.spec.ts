import { expect, test } from '@playwright/test';

// Regression: ISSUE-001 — robots.txt and sitemap.xml returned localized HTML 404s
// Found by /qa on 2026-07-20
// Report: .gstack/qa-reports/qa-report-asiandeligo-eshoper-pro-2026-07-20.md

test.describe('SEO discovery endpoints', () => {
  test('publishes crawler rules and the canonical sitemap location', async ({ request }) => {
    const response = await request.get('/robots.txt');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');

    const body = await response.text();
    expect(body).toMatch(/User-Agent:\s*\*/i);
    expect(body).toContain('Allow: /');
    expect(body).toContain('Sitemap: https://store.example.test/sitemap.xml');
    expect(body).toContain('Disallow: /api/');

    // Private HTML routes must stay crawlable so search engines can observe
    // their noindex metadata. robots.txt is not an access-control boundary.
    for (const path of [
      '/account',
      '/cart',
      '/checkout',
      '/login',
      '/register',
      '/en/account',
      '/en/cart',
      '/en/checkout',
      '/en/login',
      '/en/register',
    ]) {
      expect(body).not.toContain(`Disallow: ${path}`);
    }
  });

  test('lists public Polish and English catalog URLs only', async ({ request }) => {
    const response = await request.get('/sitemap.xml');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/xml');

    const xml = await response.text();
    expect(xml).toContain('<urlset');

    for (const url of [
      'https://store.example.test/',
      'https://store.example.test/en',
      'https://store.example.test/products',
      'https://store.example.test/en/products',
      'https://store.example.test/categories',
      'https://store.example.test/en/categories',
      'https://store.example.test/categories/kimchi-i-kiszonki',
      'https://store.example.test/en/categories/kimchi-i-kiszonki',
      'https://store.example.test/collections/korean-pantry',
      'https://store.example.test/en/collections/korean-pantry',
      'https://store.example.test/products/organic-gala-apples',
      'https://store.example.test/en/products/organic-gala-apples',
    ]) {
      expect(xml).toContain(`<loc>${url}</loc>`);
    }

    for (const path of [
      '/account',
      '/cart',
      '/checkout',
      '/login',
      '/register',
      '/api/',
      '/en/account',
      '/en/cart',
      '/en/checkout',
      '/en/login',
      '/en/register',
    ]) {
      expect(xml).not.toContain(`https://store.example.test${path}`);
    }

    expect(xml).not.toContain('https://store.example.test/en/en/');
    const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(new Set(locations).size).toBe(locations.length);
  });
});
