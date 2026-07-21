import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import {
  getCatalogCategoryDisplay,
  getLocalizedCountryOrigin,
  getLocalizedUnitLabel,
} from '../src/lib/catalog-display-localization';
import {
  getLocaleNeutralConfiguredHref,
  localizeConfiguredStorefront,
} from '../src/lib/configured-content-localization';
import type { StorefrontConfig } from '../src/types/storefront-config';
import asiaDeliGoConfigEnvelope from '../public/config/asiandeligo.json';
import { mockMobileStorefront } from './mobile-fixtures';

const POLISH_TO_ENGLISH_COUNTRY_ORIGINS = [
  ['Japonia', 'Japan'],
  ['Korea Południowa', 'South Korea'],
  ['Chiny', 'China'],
  ['Tajlandia', 'Thailand'],
  ['Wietnam', 'Vietnam'],
  ['Indonezja', 'Indonesia'],
  ['Polska', 'Poland'],
  ['Tajwan', 'Taiwan'],
  ['Francja', 'France'],
  ['Hiszpania', 'Spain'],
  ['Holandia', 'Netherlands'],
  ['Unia Europejska', 'European Union'],
  ['Filipiny', 'Philippines'],
  ['Indie', 'India'],
  ['Turcja', 'Turkey'],
  ['Niemcy', 'Germany'],
  ['Singapur', 'Singapore'],
  ['Hong Kong', 'Hong Kong'],
  ['Wielka Brytania', 'United Kingdom'],
  ['Włochy', 'Italy'],
  ['Belgia', 'Belgium'],
  ['Pakistan', 'Pakistan'],
  ['USA', 'United States'],
  ['Sri Lanka', 'Sri Lanka'],
  ['Zjednoczone Emiraty Arabskie', 'United Arab Emirates'],
  ['Kambodża', 'Cambodia'],
  ['Tunezja', 'Tunisia'],
  ['Brazylia', 'Brazil'],
  ['Dania', 'Denmark'],
  ['Kanada', 'Canada'],
  ['Malezja', 'Malaysia'],
  ['Mauritius', 'Mauritius'],
  ['Paragwaj', 'Paraguay'],
] as const;

function isRawPolandFilter(variables: Record<string, unknown>) {
  const filter = variables.filter as Record<string, unknown> | undefined;
  const origins = filter?.countryOfOrigin;

  return Array.isArray(origins) && origins.length === 1 && origins[0] === 'Polska';
}

async function mockPickupCategoryHomepageConfig(page: Page) {
  await page.route('**/api/config/**', async (route) => {
    const response = await route.fetch();
    const envelope = await response.json() as Record<string, any>;

    await route.fulfill({
      response,
      contentType: 'application/json',
      body: JSON.stringify({
        ...envelope,
        config: {
          ...envelope.config,
          homepage: {
            ...envelope.config?.homepage,
            sections: [{ id: 'shopByZone', enabled: true, order: 0 }],
          },
          general: {
            ...envelope.config?.general,
            fulfillment: {
              mode: 'pickup',
              paymentPromise: 'bank_transfer',
              stockDisplayMode: 'availability_only',
              pickupInstructions: null,
              bankTransferInstructions: null,
            },
          },
        },
      }),
    });
  });
}

function cloneAsiaDeliGoConfig(): StorefrontConfig {
  return JSON.parse(JSON.stringify(asiaDeliGoConfigEnvelope.config)) as StorefrontConfig;
}

async function mockAsiaDeliGoProductionConfig(page: Page) {
  await page.route('http://127.0.0.1:4199/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        slug: 'asiandeligo',
        config: cloneAsiaDeliGoConfig(),
        version: 36,
        updatedAt: '2026-07-20T08:08:19.952Z',
      }),
    });
  });
}

test.describe('catalog display localization', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'pixel-7', 'Run this focused regression once.');
  });

  test('covers every current nonblank production country origin with exact locale-safe fallbacks', () => {
    expect(POLISH_TO_ENGLISH_COUNTRY_ORIGINS).toHaveLength(33);

    for (const [polishLabel, englishLabel] of POLISH_TO_ENGLISH_COUNTRY_ORIGINS) {
      expect(getLocalizedCountryOrigin(polishLabel, 'en')).toBe(englishLabel);
      expect(getLocalizedCountryOrigin(polishLabel, 'en-GB')).toBe(englishLabel);
      expect(getLocalizedCountryOrigin(polishLabel, 'pl')).toBe(polishLabel);
    }

    expect(getLocalizedCountryOrigin(' Nieznany region ', 'en')).toBe('Nieznany region');
    expect(getLocalizedCountryOrigin(' Nieznany region ', 'pl')).toBe('Nieznany region');
    expect(getLocalizedCountryOrigin('   ', 'en')).toBeNull();
    expect(getLocalizedCountryOrigin(null, 'en')).toBeNull();

    expect(getCatalogCategoryDisplay({
      id: 'cat-ready-meals',
      name: 'Dania gotowe',
      slug: 'dania-gotowe',
    }, 'en-GB')).toMatchObject({
      name: 'Ready meals',
      slug: 'dania-gotowe',
      isCurated: true,
    });
    expect(getCatalogCategoryDisplay({
      id: 'cat-unknown',
      name: 'Nieznana kategoria',
      slug: 'nieznana-kategoria',
    }, 'en')).toMatchObject({
      name: 'Nieznana kategoria',
      slug: 'nieznana-kategoria',
      isCurated: false,
    });

    expect(getLocalizedUnitLabel('PIECE', 'en')).toBe('pcs');
    expect(getLocalizedUnitLabel('PIECE', 'pl')).toBe('szt.');
    expect(getLocalizedUnitLabel('KG', 'en')).toBe('kg');
    expect(getLocalizedUnitLabel('custom', 'en')).toBe('custom');
  });

  test('localizes only verified Asia Deli Go configured content without mutating Polish source data', () => {
    const source = cloneAsiaDeliGoConfig();
    const sourceSnapshot = JSON.stringify(source);

    const polish = localizeConfiguredStorefront(source, 'pl');
    expect(polish).not.toBe(source);
    expect(polish).not.toBeNull();

    const english = localizeConfiguredStorefront(source, 'en-GB');
    expect(english).not.toBe(source);
    expect(english).not.toBeNull();
    expect(JSON.stringify(source)).toBe(sourceSnapshot);

    expect(english?.homepage.hero).toMatchObject({
      headline: 'Asian groceries for everyday shopping',
      subtitle: 'Kimchi, rice, sauces, noodles, drinks, and snacks. Order online and collect in store.',
      ctaText: 'Browse products',
    });
    expect(english?.seo).toMatchObject({
      defaultTitle: 'Asia Deli Go - Asian groceries',
      defaultDescription: 'Asia Deli Go: kimchi, rice, sauces, noodles, drinks, snacks, and ready meals for in-store collection.',
      canonical: 'https://asiandeligo.eshoper.pro/en',
    });

    const englishGridItems = english?.homepage.blocks.flatMap((block) => (
      block.type === 'grid' || block.type === 'round_grid' ? block.items : []
    ));
    expect(englishGridItems).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'asiandeligo-grid-korean-pantry', title: 'Sauces and pastes' }),
      expect.objectContaining({ id: 'asiandeligo-grid-drinks', title: 'Drinks' }),
      expect.objectContaining({ id: 'asiandeligo-grid-ready-meals', title: 'Ready meals' }),
      expect.objectContaining({ id: 'asiandeligo-grid-kimchi', title: 'Kimchi and pickles' }),
      expect.objectContaining({ id: 'asiandeligo-grid-noodles-rice', title: 'Noodles and rice' }),
      expect.objectContaining({ id: 'asiandeligo-grid-snacks-sweets', title: 'Snacks and sweets' }),
      expect.objectContaining({ id: 'asiandeligo-round-sushi-algae', title: 'Sushi and seaweed' }),
      expect.objectContaining({ id: 'asiandeligo-round-mushrooms-tofu', title: 'Mushrooms and tofu' }),
      expect.objectContaining({ id: 'asiandeligo-round-kitchen-tools', title: 'Kitchen accessories' }),
    ]));
    expect(english?.homepage.blocks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'asiandeligo-horizontal-quick-lunch-20260618',
        title: 'Ramen and ready meals for a quick lunch',
        ctaText: 'Browse ready meals',
      }),
      expect.objectContaining({
        id: 'asiandeligo-horizontal-snacks-drinks-20260624',
        title: 'Snacks and drinks for your basket',
        ctaText: 'Browse snacks',
      }),
    ]));
    expect(english?.commercial.quickLinks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'quick-korean-pantry',
        label: 'Korean pantry',
        description: 'Korean cooking essentials',
      }),
    ]));
    expect(english?.commercial.collections).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slug: 'korean-pantry',
        title: 'Korean pantry',
        subtitle: 'Rice, sauces, noodles, and Korean cooking essentials.',
        tiles: expect.arrayContaining([
          expect.objectContaining({ id: 'tile-sauces', title: 'Sauces and pastes' }),
          expect.objectContaining({ id: 'tile-noodles', title: 'Noodles and rice' }),
        ]),
      }),
    ]));

    expect(english?.homepage.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      enabled: block.enabled,
      order: block.order,
    }))).toEqual(source.homepage.blocks.map((block) => ({
      id: block.id,
      type: block.type,
      enabled: block.enabled,
      order: block.order,
    })));
    const sourceHero = source.homepage.blocks.find((block) => block.type === 'hero');
    const polishHero = polish?.homepage.blocks.find((block) => block.type === 'hero');
    const englishHero = english?.homepage.blocks.find((block) => block.type === 'hero');
    expect(sourceHero?.type === 'hero' ? sourceHero.slides : []).toHaveLength(6);
    expect(polishHero?.type === 'hero' ? polishHero.slides.map((slide) => slide.id) : []).toEqual([
      'asiandeligo-drive-hero-slide-1',
      'asiandeligo-drive-hero-slide-6',
    ]);
    const expectedEnglishHeroSlides = sourceHero?.type === 'hero'
      ? sourceHero.slides.filter((slide) => [
        'asiandeligo-drive-hero-slide-4',
        'asiandeligo-drive-hero-slide-5',
      ].includes(slide.id))
      : [];
    expect(englishHero?.type === 'hero' ? englishHero.slides : []).toEqual(expectedEnglishHeroSlides);
    expect(english?.homepage.blocks.flatMap((block) => {
      if (block.type === 'grid' || block.type === 'round_grid') {
        return block.items.map((item) => ({
          id: item.id,
          imageUrl: item.imageUrl,
          href: item.href,
          enabled: item.enabled,
        }));
      }
      return [];
    })).toEqual(source.homepage.blocks.flatMap((block) => {
      if (block.type === 'grid' || block.type === 'round_grid') {
        return block.items.map((item) => ({
          id: item.id,
          imageUrl: item.imageUrl,
          href: item.href,
          enabled: item.enabled,
        }));
      }
      return [];
    }));

    const differentTenant = cloneAsiaDeliGoConfig();
    differentTenant.branding.storeName = 'Another Grocery';
    expect(localizeConfiguredStorefront(differentTenant, 'en')).toBe(differentTenant);
    expect(getLocaleNeutralConfiguredHref(
      '/pl/categories/dania-gotowe',
      'asiandeligo-grid-ready-meals',
    )).toBe('/categories/dania-gotowe');
    expect(getLocaleNeutralConfiguredHref(
      '/en/products?search=ramen',
      'asiandeligo-drive-hero-slide-1',
    )).toBe('/products?search=ramen');
    expect(getLocaleNeutralConfiguredHref(
      'https://example.com/pl/products',
      'asiandeligo-grid-ready-meals',
    )).toBe('https://example.com/pl/products');
    expect(getLocaleNeutralConfiguredHref(
      '/pl/categories/dania-gotowe',
      'another-tenant-cross-locale-link',
    )).toBe('/pl/categories/dania-gotowe');
  });

  test('renders the verified production homepage copy and links fully in English', async ({ page }, testInfo) => {
    await mockMobileStorefront(page, { catalogLabels: 'polish-source' });
    await mockAsiaDeliGoProductionConfig(page);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/en');

    const body = page.locator('body');
    await expect(body).toContainText('Sauces and pastes');
    await expect(page.locator('h1.sr-only')).toHaveText('Asian groceries for everyday shopping');
    await expect(page.locator('[data-testid="desktop-home-hero"] img')).toHaveCount(2);
    await expect(page.locator('[data-testid="desktop-home-hero"] img').first()).toHaveAttribute(
      'alt',
      /Asian groceries for everyday shopping/i,
    );
    await expect(page.locator('[data-testid="desktop-home-hero"] img').first()).toHaveAttribute(
      'src',
      /asia-deli-go-hero-04\.webp/,
    );
    await expect(page.locator('[data-testid="desktop-home-hero"] source').first()).toHaveAttribute(
      'srcset',
      /asia-deli-go-hero-04-mobile\.webp/,
    );
    await expect(page.locator('a[href^="/pl/"]')).toHaveCount(0);

    const englishCopy = [
      'Drinks',
      'Ready meals',
      'Kimchi and pickles',
      'Noodles and rice',
      'Snacks and sweets',
      'Ramen and ready meals for a quick lunch',
      'Browse ready meals',
      'Sushi and seaweed',
      'Mushrooms and tofu',
      'Kitchen accessories',
      'Korean pantry',
    ];
    const visibleText = await body.innerText();
    for (const copy of englishCopy) {
      expect(visibleText).toContain(copy);
    }

    const polishCopy = [
      'Sosy i pasty',
      'Napoje',
      'Dania gotowe',
      'Kimchi i kiszonki',
      'Makaron i ryż',
      'Przekąski i słodycze',
      'Zobacz dania gotowe',
      'Sushi i algi',
      'Grzyby i tofu',
      'Akcesoria kuchenne',
      'Koreańska spiżarnia',
      'Podstawy kuchni koreańskiej',
    ];
    for (const copy of polishCopy) {
      expect(visibleText).not.toContain(copy);
    }

    const readyMealsLink = page.locator('a[href="/en/categories/dania-gotowe"]:visible').filter({
      hasText: 'Ready meals',
    }).first();
    await expect(readyMealsLink).toBeVisible();

    await page.setViewportSize({ width: 412, height: 915 });
    await expect(page.locator('[data-testid="mobile-home-hero"]')).toBeVisible();
    await expect(page.locator('[data-testid="mobile-home-hero"] img')).toHaveCount(2);
    await expect.poll(async () => (
      page.locator('[data-testid="mobile-home-hero"] img').first().evaluate((image) => (
        (image as HTMLImageElement).currentSrc
      ))
    )).toContain('asia-deli-go-hero-04-mobile.webp');
    await page.setViewportSize({ width: 1280, height: 1000 });
    await expect(readyMealsLink).toBeVisible();

    await page.screenshot({
      path: testInfo.outputPath('asiandeligo-homepage-en.png'),
      fullPage: true,
    });

    await readyMealsLink.click();
    await expect(page).toHaveURL(/\/en\/categories\/dania-gotowe$/);
  });

  test('keeps the same production homepage content in Polish at the default locale', async ({ page }) => {
    await mockMobileStorefront(page, { catalogLabels: 'polish-source' });
    await mockAsiaDeliGoProductionConfig(page);
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/');

    const body = page.locator('body');
    await expect(body).toContainText('Sosy i pasty');
    await expect(page.locator('h1.sr-only')).toHaveText('Azjatyckie produkty spożywcze na co dzień');
    await expect(body).toContainText('Ramen i gotowe dania na szybki obiad');
    await expect(body).toContainText('Koreańska spiżarnia');
    await expect(body).not.toContainText('Asian groceries for everyday shopping');

    const readyMealsLink = page.locator('a[href="/categories/dania-gotowe"]:visible').filter({
      hasText: 'Dania gotowe',
    }).first();
    await expect(readyMealsLink).toBeVisible();

    await expect(page.locator('[data-testid="desktop-home-hero"] img')).toHaveCount(2);
    await page.getByRole('button', { name: /przejdź do slajdu 2/i }).click();
    await page.locator('button[aria-haspopup="listbox"]:visible').click();
    await page.getByRole('option', { name: /English/ }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1.sr-only')).toHaveText('Asian groceries for everyday shopping');
    await expect(page.locator('[data-testid="desktop-home-hero"] img')).toHaveCount(2);

    await page.locator('button[aria-haspopup="listbox"]:visible').click();
    await page.getByRole('option', { name: /Polski/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'pl');
    await expect(page.locator('h1.sr-only')).toHaveText('Azjatyckie produkty spożywcze na co dzień');
    await expect(page.locator('[data-testid="desktop-home-hero"] img')).toHaveCount(2);
  });

  test('shows English catalog labels while keeping the raw Polish country filter value', async ({ page }) => {
    const productQueries: Array<Record<string, unknown>> = [];

    await mockMobileStorefront(page, {
      catalogLabels: 'polish-source',
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)) as Record<string, unknown>);
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/products');

    const appleCard = page.getByTestId('product-card').filter({ hasText: /organic gala apples/i });
    await expect(appleCard.getByTestId('product-card-facts')).toContainText('Ready meals');
    await expect(appleCard.getByTestId('product-card-facts')).toContainText('Poland');
    await expect(appleCard.getByTestId('product-card-facts')).not.toContainText(/Dania gotowe|Polska/);

    const breadCard = page.getByTestId('product-card').filter({ hasText: /sourdough sandwich bread/i });
    await expect(breadCard.getByTestId('unit-price')).toContainText(/\/ pcs$/);
    await expect(breadCard.getByTestId('unit-price')).not.toContainText('szt.');

    await appleCard.getByRole('button', { name: /nutrition.*organic gala apples/i }).click();
    const nutritionDialog = page.getByRole('dialog', { name: /organic gala apples/i });
    await expect(nutritionDialog).toContainText('Mąka pszenna, woda, sól');
    await expect(nutritionDialog).toContainText('Poland');
    await expect(nutritionDialog.getByTestId('nutrition-original-label-language')).toContainText(/original Polish catalog language.*not been machine translated/i);
    await nutritionDialog.getByRole('button', { name: /close/i }).click();

    const filterPanel = page.getByRole('region', { name: /^filters$/i });
    await expect(filterPanel.getByRole('button', { name: /Ready meals/i })).toHaveCount(0);
    const polandFilter = filterPanel.getByRole('button', { name: /^Poland$/i });
    await expect(polandFilter).toBeVisible({ timeout: 15_000 });
    await expect(filterPanel.getByRole('button', { name: /^Nieznany region$/i })).toBeVisible();
    await polandFilter.click();

    await expect.poll(() => productQueries.some(isRawPolandFilter), { timeout: 15_000 }).toBe(true);
    const filterSummary = page.getByTestId('product-filter-summary');
    await expect(filterSummary.getByRole('button', { name: /remove Poland filter/i })).toBeVisible();
    await expect(filterSummary).not.toContainText('Polska');
  });

  test('uses canonical English homepage and PDP labels without translating source label text', async ({ page }) => {
    await mockPickupCategoryHomepageConfig(page);
    await mockMobileStorefront(page, { catalogLabels: 'polish-source' });
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.goto('/en');
    const homepageShortcuts = page.locator('[data-testid="home-category-shortcuts"]:visible').first();
    const readyMealsLink = homepageShortcuts.getByTestId('home-category-chip').filter({ hasText: /Ready meals/i });
    await expect(readyMealsLink).toBeVisible();
    await expect(readyMealsLink).toHaveAttribute('href', '/en/categories/dania-gotowe');
    await expect(homepageShortcuts).not.toContainText('Dania gotowe');

    await page.goto('/en/products/organic-gala-apples');
    await expect(page.getByTestId('pdp-purchase-panel')).toContainText('Ready meals');
    await expect(page.getByTestId('pdp-purchase-facts')).toContainText('Poland');
    await expect(page.getByTestId('pdp-purchase-facts')).not.toContainText(/Dania gotowe|Polska/);
    await expect(page.getByTestId('pdp-food-label-sections')).toContainText('Mąka pszenna, woda, sól');
    await expect(page.getByTestId('pdp-food-label-sections')).toContainText('1 szt.');
    await expect(page.getByTestId('pdp-original-label-language')).toContainText(/original Polish catalog language.*not been machine translated/i);
  });

  test('keeps Polish category, country, unit, and free-text display unchanged', async ({ page }) => {
    await mockMobileStorefront(page, { catalogLabels: 'polish-source' });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/products');

    const appleCard = page.getByTestId('product-card').filter({ hasText: /organic gala apples/i });
    await expect(appleCard.getByTestId('product-card-facts')).toContainText('Dania gotowe');
    await expect(appleCard.getByTestId('product-card-facts')).toContainText('Polska');

    const breadCard = page.getByTestId('product-card').filter({ hasText: /sourdough sandwich bread/i });
    await expect(breadCard.getByTestId('unit-price')).toContainText(/\/ szt\.$/);
    await expect(breadCard.getByTestId('unit-price')).not.toContainText(/\/ pcs$/);

    const filterPanel = page.getByRole('region', { name: /^filtry$/i });
    await expect(filterPanel.getByRole('button', { name: /^Polska$/i })).toBeVisible({ timeout: 15_000 });
    await expect(filterPanel.getByRole('button', { name: /^Nieznany region$/i })).toBeVisible();

    await page.goto('/pl/products/organic-gala-apples');
    await expect(page.getByTestId('pdp-purchase-panel')).toContainText('Dania gotowe');
    await expect(page.getByTestId('pdp-purchase-facts')).toContainText('Polska');
    await expect(page.getByTestId('pdp-food-label-sections')).toContainText('Mąka pszenna, woda, sól');
    await expect(page.getByTestId('pdp-original-label-language')).toHaveCount(0);
  });
});
