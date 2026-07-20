import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import {
  getCatalogCategoryDisplay,
  getLocalizedCountryOrigin,
  getLocalizedUnitLabel,
} from '../src/lib/catalog-display-localization';
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
