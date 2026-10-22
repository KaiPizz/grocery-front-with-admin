import { expect, test, type Locator, type Page } from '@playwright/test';
import asiaDeliGoConfig from '../public/config/asiandeligo.json';
import { mockMobileStorefront, PRIMARY_PRODUCT } from './mobile-fixtures';

// Owner-approved catalog correction, 22 October 2026: cuisines contain food;
// cosmetics and kitchenware have independent entries and product information.
// Filter before pagination and facet aggregation; country alone still means all goods.
interface CategoryFixture {
  id: string;
  slug: string;
  name: string;
  parent: { id: string; slug: string; name: string } | null;
  level: number;
  displayOrder: number;
  description: null;
  translation: null;
  products: { totalCount: number };
}

interface QueryVariables {
  filter?: { categories?: string[]; countryOfOrigin?: string[] };
  categoryIds?: string[] | null;
  countryOfOrigin?: string[] | null;
  first?: number;
  last?: number;
  after?: string | null;
  before?: string | null;
  slug?: string;
}

interface ObservedQuery {
  operation: string;
  variables: QueryVariables;
}

const FOOD_ROOTS = [
  'makaron-i-ryz', 'sosy-i-oleje', 'pasty-przyprawy-i-buliony',
  'kimchi-i-kiszonki', 'przekaski-i-slodycze', 'napoje-herbaty-i-kawy',
  'dania-gotowe', 'do-gotowania-i-sushi',
];
const NON_FOOD_ROOTS = ['kosmetyki-koreanskie', 'akcesoria-kuchenne'];
const COUNTRY = 'Korea Południowa';
const FOOD_LEAF_ID = 'fixture-food-leaf';
const FOOD_IDS = [...FOOD_ROOTS.map((_, i) => `fixture-root-${i}`), FOOD_LEAF_ID].sort();
const COUNTRY_NAMES = ['Japonia', COUNTRY, 'Chiny', 'Tajlandia', 'Wietnam'];

function categoryFixture(slug: string, index: number): CategoryFixture {
  return {
    id: `fixture-root-${index}`, slug, name: slug,
    parent: null, level: 0, displayOrder: index, description: null,
    translation: null, products: { totalCount: 1 },
  };
}

const CATEGORIES: CategoryFixture[] = [
  ...[...FOOD_ROOTS, ...NON_FOOD_ROOTS, 'unclassified-catalog'].map(categoryFixture),
  {
    ...categoryFixture('ramen-fixture', 11), id: FOOD_LEAF_ID,
    parent: { id: 'fixture-root-0', slug: 'makaron-i-ryz', name: 'Makaron i ryż' },
    level: 1, products: { totalCount: 27 },
  },
  {
    ...categoryFixture('facial-care-fixture', 12),
    parent: { id: 'fixture-root-8', slug: 'kosmetyki-koreanskie', name: 'Kosmetyki' },
    level: 1,
  },
  {
    ...categoryFixture('bowls-fixture', 13),
    parent: { id: 'fixture-root-9', slug: 'akcesoria-kuchenne', name: 'Akcesoria' },
    level: 1,
  },
];

function fixtureProduct(id: string, name: string, category: CategoryFixture) {
  return {
    ...PRIMARY_PRODUCT, id, slug: id, name, countryOfOrigin: COUNTRY,
    category, media: [],
    variants: PRIMARY_PRODUCT.variants.map((variant) => ({
      ...variant, id: `${id}-variant`, sku: id,
    })),
  };
}

const FOOD_PRODUCTS = Array.from({ length: 27 }, (_, i) => (
  fixtureProduct(`korean-food-${String(i + 1).padStart(2, '0')}`, `Korean ramen food ${i + 1}`, CATEGORIES[11])
));
const COSMETIC = {
  ...fixtureProduct('aloe-cleanser-fixture', 'Aloe facial cleansing foam fixture', CATEGORIES[12]),
  ingredients: 'Aqua, Glycerin, Aloe Barbadensis Leaf Extract',
  // Deliberate bad imported food fields: category identity must win.
  allergens: ['milk'], dietaryTags: ['vegan'], isAlcohol: true, spiceLevel: 3,
};
const KITCHENWARE = {
  ...fixtureProduct('ceramic-bowl-fixture', 'Ceramic ramen bowl fixture', CATEGORIES[13]),
  ingredients: 'Glazed ceramic', allergens: ['milk'], dietaryTags: ['vegan'],
};
const UNKNOWN = {
  ...fixtureProduct('unknown-catalog-fixture', 'Unclassified catalog fixture', CATEGORIES[10]),
  ingredients: 'Aqua, Glycerin',
};
const MISSING_LABEL_FOOD = {
  ...FOOD_PRODUCTS[0], ingredients: null, nutritionFacts: null,
  allergens: [], dietaryTags: [], countryOfOrigin: null,
};
// Non-food deliberately precedes food: filtering only the current client page
// would show a short first page and a wrong count instead of 24 + 3 food items.
const PRODUCTS = [COSMETIC, KITCHENWARE, UNKNOWN, ...FOOD_PRODUCTS];

function sorted(ids: string[] | null | undefined): string[] {
  return [...(ids ?? [])].sort();
}

function visibleCards(page: Page, mobile: boolean): Locator {
  return page.getByTestId(mobile ? 'mobile-product-card' : 'product-card');
}

async function mockCatalogKinds(page: Page): Promise<ObservedQuery[]> {
  await mockMobileStorefront(page);
  await page.route('**/api/config/**', (route) => route.fulfill({ json: asiaDeliGoConfig }));
  const observed: ObservedQuery[] = [];
  await page.route('**/api/graphql*', async (route) => {
    const requestUrl = new URL(route.request().url());
    const body = route.request().postDataJSON() ?? {
      query: requestUrl.searchParams.get('query'),
      variables: JSON.parse(requestUrl.searchParams.get('variables') ?? '{}'),
    };
    const query = String(body.query ?? '');
    const operation = body.operationName || query.match(/\bquery\s+(\w+)/)?.[1] || '';
    const variables: QueryVariables = body.variables ?? {};
    observed.push({ operation, variables: structuredClone(variables) });
    if (['Categories', 'PublicCategories', 'PublicCategoryNavigation'].includes(operation)) {
      await route.fulfill({ json: { data: { categories: {
        edges: CATEGORIES.map((node, i) => ({ node, cursor: `category-${i}` })),
        pageInfo: { hasNextPage: false, endCursor: null }, totalCount: CATEGORIES.length,
      } } } });
      return;
    }
    if (operation === 'GroceryProduct') {
      const product = variables.slug === MISSING_LABEL_FOOD.slug
        ? MISSING_LABEL_FOOD
        : PRODUCTS.find((item) => item.slug === variables.slug) ?? null;
      await route.fulfill({ json: { data: { product } } });
      return;
    }
    if (['GroceryProducts', 'GroceryProductListing'].includes(operation)) {
      const categories = variables.filter?.categories ?? [];
      const countries = variables.filter?.countryOfOrigin ?? [];
      const matching = PRODUCTS.filter((product) => (
        (!categories.length || categories.includes(product.category.id))
        && (!countries.length || countries.includes(product.countryOfOrigin))
      ));
      const pageSize = variables.first ?? variables.last ?? 24;
      const decoded = variables.after ? Buffer.from(variables.after, 'base64').toString() : '';
      const offsetMatch = decoded.match(/^offset:(\d+)$/);
      const start = offsetMatch ? Number(offsetMatch[1]) + 1 : variables.after ? 24 : 0;
      const items = matching.slice(start, start + pageSize);
      await route.fulfill({ json: { data: { products: {
        edges: items.map((node, i) => ({ node, cursor: Buffer.from(`offset:${start + i}`).toString('base64') })),
        totalCount: matching.length,
        pageInfo: {
          hasNextPage: start + items.length < matching.length, hasPreviousPage: start > 0,
          startCursor: items.length ? Buffer.from(`offset:${start}`).toString('base64') : null,
          endCursor: items.length ? Buffer.from(`offset:${start + items.length - 1}`).toString('base64') : null,
        },
      } } } });
      return;
    }
    if (operation === 'ProductCountryOrigins' || operation === 'ProductBrands') {
      const scoped = PRODUCTS.filter((product) => (
        !variables.categoryIds?.length || variables.categoryIds.includes(product.category.id)
      ));
      const data = operation === 'ProductCountryOrigins'
        ? { productCountryOrigins: [{ value: COUNTRY, count: scoped.length }] }
        : { productBrands: [{ value: 'Fixture brand', count: scoped.length }] };
      await route.fulfill({ json: { data } });
      return;
    }
    await route.fallback();
  });
  return observed;
}

async function expectNoFoodDetails(section: Locator) {
  await expect(section.getByRole('heading', { name: /allergens|alergeny|nutrition facts|wartości odżywcze/i })).toHaveCount(0);
  await expect(section.getByTestId('pdp-food-compliance-notice')).toHaveCount(0);
  await expect(section.getByTestId('pdp-missing-catalog-data')).toHaveCount(0);
  await expect(section).not.toContainText(/before eating|przed spożyciem|Annex II|załącznik.*II/i);
  await expect(section.getByTestId('pdp-compliance-summary')).not.toContainText(/best before|data ważności|storage zone|strefa przechowywania/i);
}

for (const locale of ['pl', 'en'] as const) {
  for (const mobile of [false, true]) {
    test.describe(`${locale} ${mobile ? 'mobile' : 'desktop'} catalog product kinds`, () => {
      test.use({ viewport: { width: mobile ? 390 : 1440, height: 900 }, isMobile: mobile, hasTouch: mobile });

      test('cuisine filters food before pagination and scopes country/brand facets', async ({ page }) => {
        const queries = await mockCatalogKinds(page);
        await page.goto(`/${locale}/products?country=${encodeURIComponent(COUNTRY)}&type=food`);
        const cards = visibleCards(page, mobile);
        await expect(cards).toHaveCount(24);
        await expect(cards.filter({ hasText: /Aloe facial|Ceramic ramen|Unclassified catalog/ })).toHaveCount(0);
        const pagination = page.getByTestId('product-pagination');
        await expect(pagination).toContainText('27');
        const productQueries = () => queries.filter((item) => ['GroceryProducts', 'GroceryProductListing'].includes(item.operation));
        await expect.poll(() => productQueries().length).toBeGreaterThan(0);
        for (const request of productQueries()) {
          expect(sorted(request.variables.filter?.categories)).toEqual(FOOD_IDS);
          expect(request.variables.filter?.countryOfOrigin).toEqual([COUNTRY]);
        }
        for (const operation of ['ProductCountryOrigins', 'ProductBrands']) {
          await expect.poll(() => queries.some((item) => item.operation === operation)).toBe(true);
          for (const request of queries.filter((item) => item.operation === operation)) {
            expect(sorted(request.variables.categoryIds)).toEqual(FOOD_IDS);
          }
        }
        await pagination.getByRole('button', { name: '2', exact: true }).click();
        await expect(cards).toHaveCount(3);
        await expect(cards.first()).toContainText('Korean ramen food 25');
        await expect(pagination).toContainText('27');
        expect(productQueries().some((item) => Boolean(item.variables.after))).toBe(true);
        expect(sorted(productQueries().at(-1)?.variables.filter?.categories)).toEqual(FOOD_IDS);
      });

      test('country filtering without a cuisine keeps cosmetics, kitchenware and unknown goods', async ({ page }) => {
        const queries = await mockCatalogKinds(page);
        await page.goto(`/${locale}/products?country=${encodeURIComponent(COUNTRY)}`);
        const cards = visibleCards(page, mobile);
        await expect(cards).toHaveCount(24);
        for (const name of [COSMETIC.name, KITCHENWARE.name, UNKNOWN.name]) {
          await expect(cards.filter({ hasText: name })).toHaveCount(1);
        }
        await expect(page.getByTestId('product-pagination')).toContainText('30');
        const requests = queries.filter((item) => ['GroceryProducts', 'GroceryProductListing'].includes(item.operation));
        expect(requests.length).toBeGreaterThan(0);
        expect(requests.every((item) => !item.variables.filter?.categories?.length)).toBe(true);
        // Unknown INCI-like metadata must not make a card edible or expose nutrition.
        if (!mobile) {
          for (const name of [COSMETIC.name, KITCHENWARE.name, UNKNOWN.name]) {
            await expect(cards.filter({ hasText: name }).getByRole('button', { name: /nutrition|odżywcz/i })).toHaveCount(0);
          }
        }
      });

      test('all five cuisine entries stay food-only and separate non-food links fit navigation', async ({ page }) => {
        await mockCatalogKinds(page);
        if (mobile) await page.setViewportSize({ width: 320, height: 900 });
        await page.goto(`/${locale}`);
        const homeCards = page.getByTestId('showcase-cuisine-card');
        await expect(homeCards).toHaveCount(5);
        for (const link of await homeCards.getByRole('link').all()) {
          const href = new URL((await link.getAttribute('href'))!, 'http://catalog.test');
          expect(href.searchParams.get('type')).toBe('food');
          expect(COUNTRY_NAMES).toContain(href.searchParams.get('country'));
        }
        if (mobile) {
          await page.getByRole('button', { name: /otwórz menu|open menu/i }).click();
        } else {
          await page.getByTestId('cuisine-menu-trigger').hover();
        }
        const navigation = mobile ? page.locator('#mobile-nav') : page.getByRole('navigation', { name: 'Main navigation' });
        const cuisineLinks = mobile ? page.getByTestId('mobile-cuisine-links') : page.getByTestId('cuisine-menu');
        await expect(cuisineLinks.getByRole('link')).toHaveCount(5);
        const menuCountries: string[] = [];
        for (const link of await cuisineLinks.getByRole('link').all()) {
          const href = new URL((await link.getAttribute('href'))!, 'http://catalog.test');
          expect(href.searchParams.get('type')).toBe('food');
          menuCountries.push(href.searchParams.get('country')!);
        }
        expect(menuCountries.sort()).toEqual([...COUNTRY_NAMES].sort());
        if (!mobile) await page.keyboard.press('Escape');
        const cosmetics = navigation.getByRole('link', { name: /^(?:kosmetyki|beauty)$/i });
        const kitchenware = navigation.getByRole('link', { name: /^(?:akcesoria|kitchenware)$/i });
        await expect(cosmetics).toBeVisible();
        await expect(kitchenware).toBeVisible();
        await expect(cosmetics).toHaveAttribute('href', /\/categories\/kosmetyki-koreanskie$/);
        await expect(kitchenware).toHaveAttribute('href', /\/categories\/akcesoria-kuchenne$/);
        const layout = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
        expect(layout.scroll).toBeLessThanOrEqual(layout.client);
        await cosmetics.click();
        await expect(page).toHaveURL(/\/categories\/kosmetyki-koreanskie$/);
      });

      for (const kind of ['cosmetics', 'kitchenware', 'unknown', 'food'] as const) {
        test(`${kind} product information follows category identity even with misleading or missing food metadata`, async ({ page }) => {
          await mockCatalogKinds(page);
          const product = kind === 'cosmetics' ? COSMETIC : kind === 'kitchenware' ? KITCHENWARE : kind === 'unknown' ? UNKNOWN : MISSING_LABEL_FOOD;
          await page.goto(`/${locale}/products/${product.slug}`);
          await expect(page.getByRole('heading', { level: 1, name: product.name })).toBeVisible();
          if (kind === 'food') {
            const section = page.getByTestId('pdp-food-label-sections');
            await expect(section).toBeVisible();
            await expect(section.getByRole('heading', { name: /nutrition facts|wartości odżywcze/i })).toBeVisible();
            await expect(section.getByRole('heading', { name: /allergens|alergeny/i })).toBeVisible();
            await expect(section.getByTestId('pdp-missing-catalog-data')).toBeVisible();
          } else {
            const section = page.getByTestId('pdp-product-information-sections');
            await expect(section).toHaveAttribute('data-product-kind', kind);
            await expectNoFoodDetails(section);
            await expect(page.getByTestId('pdp-food-label-sections')).toHaveCount(0);
            await expect(page.getByRole('button', { name: /nutrition facts|wartości odżywcze/i })).toHaveCount(0);
            if (kind === 'cosmetics') {
              await expect(section.getByText(/^(?:INCI ingredients|Skład INCI)$/i)).toBeVisible();
              await expect(section).toContainText(COSMETIC.ingredients);
              await expect(section.getByRole('heading', { name: /description and directions|opis i sposób użycia/i })).toBeVisible();
            } else {
              await expect(section.getByRole('heading', { name: /INCI|ingredients|składniki/i })).toHaveCount(0);
            }
          }
        });
      }
    });
  }
}
