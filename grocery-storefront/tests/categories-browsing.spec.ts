import { expect, test } from '@playwright/test';
import { getEnabledCategoryHub, mergeCategoryHub } from '../src/lib/category-hub';
import {
  PUBLIC_CATEGORY_DEFINITIONS,
  buildPublicCategories,
  type PublicCategory,
} from '../src/lib/public-taxonomy';
import { getImageSrc } from '../src/lib/utils';
import { mockMobileStorefront } from './mobile-fixtures';

const KIMCHI_RAW_CATEGORY_IDS = ['cat-kimchi', 'cat-pickled-vegetables'];

// Frozen from the 2026-07-22 Asia Deli Go production taxonomy. The seventieth
// active raw category, `pozostałe-produkty`, is intentionally hidden because it
// has no published products. Every public raw category must be assigned by an
// explicit slug, not by the loose keyword fallback.
const ASIA_DELI_GO_PUBLIC_RAW_SLUGS = [
  'arkusze-nori-gim',
  'buliony',
  'dania-gotowe',
  'duża-micha',
  'foremki',
  'grzyby-mun',
  'grzyby-shiitake',
  'herbaty',
  'imbir-marynowany',
  'inne-grzyby-azjatyckie',
  'japońskie-ciasto-ryżowe',
  'kawy',
  'kimchi',
  'kluski-tteok-do-dań',
  'kombu-dasima',
  'komplety-do-sushi-i-herbaty',
  'koreańskie-kosmetyki',
  'koty-szczęścia-i-inne-gadżety',
  'makaron-gryczany',
  'makaron-konjac',
  'makaron-pszenny',
  'makaron-ryżowy',
  'makaron-szklisty',
  'makarony',
  'marynowane-warzywa-i-owoce',
  'maty-do-zwijania',
  'mąki-panierki-tapioka',
  'miski',
  'mleczko-kokosowe',
  'moździerze',
  'naczynia',
  'napoje',
  'noże',
  'ocet-ryżowy-do-sushi',
  'octy-i-winne-przyprawy',
  'oleje',
  'oleje-sezamowe',
  'owoce-marynowane-warzywa',
  'pałeczki-i-sztućce',
  'papier-ryżowy',
  'parowary-bambusowe',
  'pasta-miso',
  'pasty',
  'pasty-smakowe',
  'patelnie-tamago',
  'patelnie-wok-grill',
  'prezenty',
  'przyprawy',
  'przyprawy-jednoskładnikowe',
  'ramyun-ramen',
  'ryż-do-sushi-i-nie-tylko',
  'ryż-i-inne-ziarna',
  'sezam',
  'słodycze-japońskie',
  'słodycze-przekąski',
  'sos-sojowy',
  'sosy-i-marynaty',
  'sosy-marynaty',
  'sosy-marynaty-oleje',
  'sosy-sojowe',
  'sól',
  'syropy',
  'świeże-produkty',
  'tofu',
  'wakame-miyeok',
  'wasabi',
  'zaparzacze-do-kawy',
  'zestawy-do-sushi',
  'zupy-buliony',
] as const;

function hasCompleteKimchiScope(variables: Record<string, any>) {
  const filter = variables.filter as Record<string, any> | undefined;
  const categoryIds = Array.isArray(filter?.categories)
    ? filter.categories.map(String)
    : [];

  return categoryIds.length === KIMCHI_RAW_CATEGORY_IDS.length
    && KIMCHI_RAW_CATEGORY_IDS.every((categoryId) => categoryIds.includes(categoryId));
}

const CATEGORY_HUB_FIXTURES: PublicCategory[] = [
  {
    id: 'public:kimchi-i-kiszonki',
    slug: 'kimchi-i-kiszonki',
    name: 'Kimchi and pickles',
    description: 'Fermented sides.',
    products: { totalCount: 2 },
    rawCategoryIds: ['cat-kimchi'],
    rawCategorySlugs: ['kimchi'],
  },
  {
    id: 'public:makaron-i-ryz',
    slug: 'makaron-i-ryz',
    name: 'Noodles and rice',
    description: 'Everyday staples.',
    products: { totalCount: 1 },
    rawCategoryIds: ['cat-ramen'],
    rawCategorySlugs: ['ramyun-ramen'],
  },
  {
    id: 'public:grzyby-warzywa-i-tofu',
    slug: 'grzyby-warzywa-i-tofu',
    name: 'Mushrooms, vegetables, and tofu',
    description: 'Plant-based ingredients.',
    products: { totalCount: 0 },
    rawCategoryIds: ['cat-tofu'],
    rawCategorySlugs: ['tofu'],
  },
];

test.describe('category hub presentation merge', () => {
  test('assigns every live Asia Deli Go raw category through one explicit slug mapping', () => {
    const explicitRawSlugs = PUBLIC_CATEGORY_DEFINITIONS.flatMap((definition) => definition.rawSlugs ?? []);
    const uniqueRawSlugs = new Set(explicitRawSlugs);

    expect(explicitRawSlugs).toHaveLength(uniqueRawSlugs.size);
    expect(ASIA_DELI_GO_PUBLIC_RAW_SLUGS.every((slug) => uniqueRawSlugs.has(slug))).toBe(true);

    const publicCategories = buildPublicCategories(
      ASIA_DELI_GO_PUBLIC_RAW_SLUGS.map((slug) => ({
        id: `raw:${slug}`,
        slug,
        name: slug,
        description: null,
        products: { totalCount: 1 },
      })),
      'pl',
    );
    const assignedRawSlugs = publicCategories.flatMap((category) => category.rawCategorySlugs);

    expect(publicCategories).toHaveLength(10);
    expect(assignedRawSlugs.sort()).toEqual([...ASIA_DELI_GO_PUBLIC_RAW_SLUGS].sort());
    expect(publicCategories.reduce((sum, category) => sum + (category.products.totalCount ?? 0), 0)).toBe(69);
  });

  test('keeps known food and accessory categories in their correct public groups', () => {
    const criticalRawSlugs = [
      'komplety-do-sushi-i-herbaty',
      'zaparzacze-do-kawy',
      'zestawy-do-sushi',
      'ocet-ryżowy-do-sushi',
      'zupy-buliony',
      'duża-micha',
      'kombu-dasima',
    ];
    const publicCategories = buildPublicCategories(criticalRawSlugs.map((slug) => ({
      id: `raw:${slug}`,
      slug,
      name: slug,
      description: null,
      products: { totalCount: 1 },
    })));
    const publicSlugByRawSlug = new Map(publicCategories.flatMap((category) => (
      category.rawCategorySlugs.map((rawSlug) => [rawSlug, category.slug] as const)
    )));

    expect(publicSlugByRawSlug.get('komplety-do-sushi-i-herbaty')).toBe('akcesoria-kuchenne');
    expect(publicSlugByRawSlug.get('zaparzacze-do-kawy')).toBe('akcesoria-kuchenne');
    expect(publicSlugByRawSlug.get('zestawy-do-sushi')).toBe('akcesoria-kuchenne');
    expect(publicSlugByRawSlug.get('ocet-ryżowy-do-sushi')).toBe('sosy-pasty-i-przyprawy');
    expect(publicSlugByRawSlug.get('zupy-buliony')).toBe('dania-gotowe');
    expect(publicSlugByRawSlug.get('duża-micha')).toBe('dania-gotowe');
    expect(publicSlugByRawSlug.get('kombu-dasima')).toBe('sushi-i-algi');
  });

  test('routes future slug variants by their most specific taxonomy phrase', () => {
    const futureSlugs = [
      'nowe-zupy-buliony-instant',
      'promocja-duża-micha-koreańska',
      'premium-zestawy-do-sushi-ceramika',
      'nowe-komplety-do-sushi-dla-dwojga',
    ];
    const publicCategories = buildPublicCategories(futureSlugs.map((slug) => ({
      id: `future:${slug}`,
      slug,
      name: slug,
      description: null,
      products: { totalCount: 1 },
    })));
    const publicSlugByRawSlug = new Map(publicCategories.flatMap((category) => (
      category.rawCategorySlugs.map((rawSlug) => [rawSlug, category.slug] as const)
    )));

    expect(publicSlugByRawSlug.get('nowe-zupy-buliony-instant')).toBe('dania-gotowe');
    expect(publicSlugByRawSlug.get('promocja-duża-micha-koreańska')).toBe('dania-gotowe');
    expect(publicSlugByRawSlug.get('premium-zestawy-do-sushi-ceramika')).toBe('akcesoria-kuchenne');
    expect(publicSlugByRawSlug.get('nowe-komplety-do-sushi-dla-dwojga')).toBe('akcesoria-kuchenne');
  });

  test('keeps the full taxonomy as a backward-compatible fallback', () => {
    const merged = mergeCategoryHub(CATEGORY_HUB_FIXTURES, undefined);

    expect(merged.map(({ slug }) => slug)).toEqual(CATEGORY_HUB_FIXTURES.map(({ slug }) => slug));
    expect(merged.every(({ imageUrl }) => imageUrl === null)).toBe(true);
  });

  test('applies owner order and images without losing unconfigured catalog categories', () => {
    const merged = mergeCategoryHub(CATEGORY_HUB_FIXTURES, {
      enabled: true,
      items: [
        {
          id: 'hub-kimchi',
          categorySlug: 'kimchi-i-kiszonki',
          imageUrl: '/kimchi.webp',
          enabled: false,
          order: 1,
        },
        {
          id: 'hub-noodles',
          categorySlug: 'makaron-i-ryz',
          imageUrl: '/noodles.webp',
          enabled: true,
          order: 0,
        },
      ],
    });

    expect(merged.map(({ slug }) => slug)).toEqual([
      'makaron-i-ryz',
      'grzyby-warzywa-i-tofu',
    ]);
    expect(merged[0].imageUrl).toBe('/noodles.webp');
    expect(merged[1].imageUrl).toBeNull();
  });

  test('ignores category presentation when the commercial master switch is off', () => {
    const categoryHub = getEnabledCategoryHub({
      enabled: false,
      categoryHub: {
        enabled: true,
        items: [{
          id: 'hub-hidden-kimchi',
          categorySlug: 'kimchi-i-kiszonki',
          imageUrl: '/kimchi.webp',
          enabled: false,
          order: 0,
        }],
      },
    });
    const merged = mergeCategoryHub(CATEGORY_HUB_FIXTURES, categoryHub);

    expect(categoryHub).toBeUndefined();
    expect(merged.map(({ slug }) => slug)).toEqual(CATEGORY_HUB_FIXTURES.map(({ slug }) => slug));
    expect(merged.every(({ imageUrl }) => imageUrl === null)).toBe(true);
  });

  test('asks the image proxy to expose remote failures to the category fallback', () => {
    const src = getImageSrc('https://cdn.example.test/category.webp', {
      proxyFallback: 'error',
    });

    expect(src).toContain('/api/image?');
    expect(src).toContain('fallback=error');
  });

  test('returns an image error instead of a generic proxy placeholder when requested', async ({ request }) => {
    const response = await request.get('/api/image?url=not-an-image-url&fallback=error');

    expect(response.status()).toBe(404);
    expect(response.headers()['x-image-fallback']).toBe('true');
  });
});

test.describe('B1 category browsing', () => {
  test('server-renders the category index without requiring JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    try {
      // PRD Phase 2 / backlog B2: `/categories` must be browseable on first render with no JS dependency.
      await page.goto('/en/categories');

      await expect(page.getByRole('heading', { name: /categories/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /kimchi and pickles.*2 products/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /noodles and rice.*1 product/i })).toBeVisible();

      const cards = page.getByTestId('category-hub-card');
      await expect(cards).toHaveCount(4);
      await expect(cards.nth(0)).toHaveAccessibleName(/noodles and rice.*1 product/i);
      await expect(cards.nth(1)).toHaveAccessibleName(/kimchi and pickles.*2 products/i);
      await expect(cards.nth(0).getByTestId('category-hub-image')).toBeVisible();
      await expect(cards.nth(1).getByTestId('category-hub-image')).toBeVisible();
      await expect(page.getByTestId('category-hub-image-fallback')).toHaveCount(2);
      await expect(page.getByRole('searchbox', { name: /search categories/i })).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('server-renders category products without requiring JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    try {
      // PRD Phase 2 / backlog B1: slug category pages are public browse surfaces, not JS-only widgets.
      await page.goto('/en/categories/kimchi-i-kiszonki');

      await expect(page.getByRole('heading', { name: /^kimchi and pickles$/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /napa cabbage kimchi/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /pickled daikon radish/i })).toBeVisible();
      await expect(page.getByText(/sourdough sandwich bread/i)).toHaveCount(0);
    } finally {
      await context.close();
    }
  });

  test('lists the public storefront taxonomy with product counts', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en/categories');

    await expect(page.getByRole('heading', { name: /categories/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /kimchi and pickles.*2 products/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /noodles and rice.*1 product/i })).toBeVisible();
  });

  test('keeps the visual hub keyboard-accessible with 2, 3, and 5 responsive columns', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/categories');

    const grid = page.getByTestId('category-hub-grid');
    const cards = page.getByTestId('category-hub-card');
    const getColumnCount = () => grid.evaluate((element) => (
      getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length
    ));

    await expect.poll(getColumnCount).toBe(2);
    await cards.first().focus();
    await expect(cards.first()).toBeFocused();

    const mobileCardBox = await cards.first().boundingBox();
    expect(mobileCardBox).not.toBeNull();
    expect(mobileCardBox!.height).toBeGreaterThanOrEqual(176);

    await page.setViewportSize({ width: 800, height: 900 });
    await expect.poll(getColumnCount).toBe(3);

    await page.setViewportSize({ width: 1440, height: 1000 });
    await expect.poll(getColumnCount).toBe(5);
  });

  test('publishes localized category metadata and canonical alternates', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/categories');
    await expect(page).toHaveTitle('Kategorie produktów azjatyckich | Configured Test Grocery');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Znajdź produkty azjatyckie według kategorii/i,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://store.example.test/categories',
    );
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute(
      'href',
      'https://store.example.test/en/categories',
    );
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute(
      'href',
      'https://store.example.test/categories',
    );

    await page.goto('/en/categories');
    await expect(page).toHaveTitle('Asian grocery categories | Configured Test Grocery');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /Find Asian groceries by category/i,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://store.example.test/en/categories',
    );
    await expect(page.locator('link[rel="alternate"][hreflang="pl"]')).toHaveAttribute(
      'href',
      'https://store.example.test/categories',
    );
  });

  test('opens a category slug page with only storefront-visible products from that category', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en/categories/kimchi-i-kiszonki');

    await expect(page.getByRole('heading', { name: /^kimchi and pickles$/i })).toBeVisible();
    await expect(page.getByText(/2 products/i)).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: /categories/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /napa cabbage kimchi/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /pickled daikon radish/i })).toBeVisible();
    await expect(page.getByText(/sourdough sandwich bread/i)).toHaveCount(0);
  });

  test('keeps empty categories visible with a clear empty state', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en/categories/household');

    await expect(page.getByRole('heading', { name: /^household$/i })).toBeVisible();
    await expect(page.getByText(/coming soon/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /browse all categories/i })).toBeVisible();
  });

  test('keeps a slim-navigation public category route valid after its products reach zero', async ({ page }) => {
    await mockMobileStorefront(page);

    await page.goto('/en/products');
    const emptyPublicCategoryLink = page.getByRole('link', {
      name: /mushrooms, vegetables, and tofu/i,
    }).first();
    await expect(emptyPublicCategoryLink).toBeVisible();
    await emptyPublicCategoryLink.click();

    await expect(page.getByRole('heading', { name: /^mushrooms, vegetables, and tofu$/i })).toBeVisible();
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
    await page.goto('/en/categories/kimchi-i-kiszonki');

    await expect(page.getByRole('heading', { name: /^kimchi and pickles$/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /napa cabbage kimchi/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /pickled daikon radish/i })).toBeVisible();

    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    await expect(filterPanel).toBeVisible({ timeout: 15_000 });
    const minimumPrice = filterPanel.getByLabel(/minimum price/i);

    await expect.poll(async () => {
      // Re-emit a changed value until the cold server-rendered control has
      // hydrated and its React change handler can execute the listing query.
      await minimumPrice.fill('');
      await minimumPrice.fill('10');
      return productQueries.some((variables) => {
        const filter = variables.filter as Record<string, any> | undefined;
        return hasCompleteKimchiScope(variables)
          && filter?.price?.gte === 10;
      });
    }, { timeout: 15_000 }).toBe(true);
    await expect(page.getByRole('heading', { name: /napa cabbage kimchi/i })).toBeVisible();
    await expect(page.getByText(/pickled daikon radish/i)).toHaveCount(0);
  });

  test('applies mobile category filters only after tapping apply', async ({ page }) => {
    const productQueries: Array<Record<string, any>> = [];

    await mockMobileStorefront(page, {
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en/categories/kimchi-i-kiszonki');

    const cards = page.getByTestId('mobile-product-card');
    await expect(cards).toHaveCount(2);

    await page.getByRole('button', { name: /filters/i }).click();
    const filterSheet = page.getByTestId('mobile-filter-sheet');
    await expect(filterSheet).toBeVisible();
    await filterSheet.getByLabel(/minimum price/i).fill('10');

    expect(productQueries.some((variables) => {
      const filter = variables.filter as Record<string, any> | undefined;
      return hasCompleteKimchiScope(variables)
        && filter?.price?.gte === 10;
    })).toBe(false);
    await expect(cards).toHaveCount(2);

    await filterSheet.getByRole('button', { name: /apply filters/i }).click();

    await expect(cards).toHaveCount(1);
    await expect.poll(() => productQueries.some((variables) => {
      const filter = variables.filter as Record<string, any> | undefined;
      return hasCompleteKimchiScope(variables)
        && filter?.price?.gte === 10;
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
    await expect(megaMenu.getByRole('link', { name: /^kimchi and pickles$/i })).toBeVisible();
    await expect(megaMenu.getByRole('link', { name: /^noodles and rice$/i })).toBeVisible();
    await expect(megaMenu.getByTestId('category-mega-menu-promo')).toBeVisible();

    await megaMenu.getByRole('link', { name: /^kimchi and pickles$/i }).click();
    await expect(page).toHaveURL(/\/en\/categories\/kimchi-i-kiszonki$/);
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
