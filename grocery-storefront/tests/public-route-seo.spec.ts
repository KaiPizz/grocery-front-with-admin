import { expect, test } from '@playwright/test';

const ROUTES = [
  {
    path: '/en',
    canonical: 'https://store.example.test/en',
    title: 'Configured SEO Title',
    description: 'Configured SEO description from the admin panel.',
    ogImage: 'https://cdn.example.test/og-image.jpg',
  },
  {
    path: '/en/products',
    canonical: 'https://store.example.test/en/products',
    title: 'Asian groceries | Configured Test Grocery',
    description: 'Browse kimchi, noodles, rice, sauces, drinks, snacks, and ready meals available from Configured Test Grocery.',
    ogImage: 'https://cdn.example.test/og-image.jpg',
  },
  {
    path: '/categories',
    canonical: 'https://store.example.test/categories',
    title: 'Kategorie produktów azjatyckich | Configured Test Grocery',
    description: 'Znajdź produkty azjatyckie według kategorii: od kimchi i makaronów po sosy, napoje, przekąski i akcesoria kuchenne.',
    ogImage: 'https://cdn.example.test/og-image.jpg',
  },
  {
    path: '/en/categories/kimchi-i-kiszonki',
    canonical: 'https://store.example.test/en/categories/kimchi-i-kiszonki',
    title: 'Kimchi and pickles | Configured Test Grocery',
    description: 'Kimchi, pickled vegetables, and fermented side dishes.',
    ogImage: 'https://cdn.example.test/og-image.jpg',
  },
  {
    path: '/en/collections/korean-pantry',
    canonical: 'https://store.example.test/en/collections/korean-pantry',
    title: 'Korean pantry | Configured Test Grocery',
    description: 'Rice, noodles, sauces, and everyday staples',
    ogImage: /images\.unsplash\.com\/photo-1585032226651-759b368d7246/,
  },
  {
    path: '/en/recipes',
    canonical: 'https://store.example.test/en/recipes',
    title: 'Asian recipes | Configured Test Grocery',
    description: 'Discover Asian recipes and find the ingredients you need to prepare them.',
    ogImage: 'https://cdn.example.test/og-image.jpg',
  },
  {
    path: '/privacy',
    canonical: 'https://store.example.test/privacy',
    title: 'Polityka prywatności | Configured Test Grocery',
    description: 'Dowiedz się, jak Configured Test Grocery przetwarza i chroni dane użytkowników sklepu internetowego.',
    ogImage: 'https://cdn.example.test/og-image.jpg',
  },
  {
    path: '/en/terms',
    canonical: 'https://store.example.test/en/terms',
    title: 'Store terms | Configured Test Grocery',
    description: 'Read the terms for using the Configured Test Grocery online storefront.',
    ogImage: 'https://cdn.example.test/og-image.jpg',
  },
] as const;

function alternateUrl(canonical: string, locale: 'pl' | 'en') {
  const url = new URL(canonical);
  const routePath = url.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  url.pathname = locale === 'en' ? `/en${routePath === '/' ? '' : routePath}` : routePath;
  return url.toString();
}

test.describe('localized public route metadata', () => {
  for (const route of ROUTES) {
    test(`${route.path} has route-specific discovery and sharing metadata`, async ({ page }) => {
      await page.goto(route.path);

      await expect(page).toHaveTitle(route.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', route.description);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', route.canonical);
      await expect(page.locator('link[rel="alternate"][hreflang="pl"]')).toHaveAttribute(
        'href',
        alternateUrl(route.canonical, 'pl'),
      );
      await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
        'href',
        alternateUrl(route.canonical, 'en'),
      );
      await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
        'href',
        alternateUrl(route.canonical, 'pl'),
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', route.canonical);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', route.ogImage);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
    });
  }

  test('publishes truthful site and collection structured data without invented contact details', async ({ page }) => {
    await page.goto('/categories/kimchi-i-kiszonki');

    const websiteJsonLd = await page.locator('script#website-json-ld').evaluate((element) => (
      JSON.parse(element.textContent ?? '{}')
    ));
    expect(websiteJsonLd['@graph']).toEqual(expect.arrayContaining([
      expect.objectContaining({ '@type': 'Organization', name: 'Configured Test Grocery' }),
      expect.objectContaining({
        '@type': 'WebSite',
        potentialAction: expect.objectContaining({
          '@type': 'SearchAction',
          target: expect.objectContaining({
            urlTemplate: 'https://store.example.test/products?search={search_term_string}',
          }),
        }),
      }),
    ]));
    expect(JSON.stringify(websiteJsonLd)).not.toMatch(/telephone|address|email/i);

    const categoryJsonLd = await page.locator('script#category-json-ld').evaluate((element) => (
      JSON.parse(element.textContent ?? '{}')
    ));
    expect(categoryJsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Kimchi i kiszonki',
      url: 'https://store.example.test/categories/kimchi-i-kiszonki',
      inLanguage: 'pl',
    });
  });

  test('publishes recipe metadata and schema from real recipe fields', async ({ page }) => {
    await page.goto('/en/recipes/spring-fruit-salad');

    await expect(page).toHaveTitle('Spring Fruit Salad | Configured Test Grocery');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://store.example.test/en/recipes/spring-fruit-salad',
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      'https://store.example.test/recipes/spring-fruit-salad',
    );

    const recipeJsonLd = await page.locator('script#recipe-json-ld').evaluate((element) => (
      JSON.parse(element.textContent ?? '{}')
    ));
    expect(recipeJsonLd).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Recipe',
      name: 'Spring Fruit Salad',
      url: 'https://store.example.test/en/recipes/spring-fruit-salad',
      inLanguage: 'en',
      prepTime: 'PT10M',
      totalTime: 'PT10M',
      recipeYield: '2',
      recipeIngredient: ['2 pieces apples'],
      recipeInstructions: [
        { '@type': 'HowToStep', position: 1, text: 'Prepare and combine the fruit.' },
      ],
    });
  });

  test('returns a hard 404 without collection schema for an unknown category', async ({ page }) => {
    const response = await page.goto('/en/categories/category-that-does-not-exist');

    expect(response?.status()).toBe(404);
    await expect(page.locator('script#category-json-ld')).toHaveCount(0);
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute('content', /noindex/i);
  });
});
