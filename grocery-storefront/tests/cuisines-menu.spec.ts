import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

type ProductVariables = Record<string, any>;

function countriesOf(variables: ProductVariables): unknown {
  return (variables.filter as Record<string, any> | undefined)?.countryOfOrigin;
}

function isExactly(countries: unknown, expected: string[]): boolean {
  return Array.isArray(countries)
    && countries.length === expected.length
    && countries.every((value, index) => value === expected[index]);
}

test.describe('cuisines menu', () => {
  test('desktop: hovering "Kuchnie" reveals five cuisines and a click filters the listing by country', async ({ page }) => {
    const productQueries: ProductVariables[] = [];
    await mockMobileStorefront(page, {
      catalogLabels: 'polish-source',
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl');

    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    const trigger = navigation.getByTestId('cuisine-menu-trigger');
    await expect(trigger).toHaveText(/kuchnie/i);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.hover();
    const menu = page.getByTestId('cuisine-menu');
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.getByRole('link')).toHaveCount(5);
    await expect(menu.getByRole('link')).toHaveText([
      /^kuchnia japońska$/i,
      /^kuchnia koreańska$/i,
      /^kuchnia chińska$/i,
      /^kuchnia tajska$/i,
      /^kuchnia wietnamska$/i,
    ]);
    const japanLink = menu.getByRole('link', { name: /^kuchnia japońska$/i });
    await expect(japanLink).toHaveAttribute('href', '/products?country=Japonia');

    await japanLink.click();
    await expect(page).toHaveURL(/\/products\?country=Japonia$/);
    await expect(menu).toHaveCount(0);
    await expect.poll(() => productQueries.some((variables) => isExactly(countriesOf(variables), ['Japonia']))).toBe(true);
    await expect(page.getByTestId('product-card')).toHaveCount(1);

    const filterPanel = page.getByRole('region', { name: /^filtry$/i });
    await expect(filterPanel.getByTestId('filter-country').getByRole('button', { name: /^japonia$/i }))
      .toHaveAttribute('aria-pressed', 'true');
  });

  test('desktop: clicking the hovered trigger keeps the menu open; the next click closes it', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl');

    const trigger = page.getByTestId('cuisine-menu-trigger');
    const menu = page.getByTestId('cuisine-menu');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await trigger.hover();
    await expect(menu).toBeVisible();

    // A mouse user hovers first and then clicks the button; the click must not
    // close what the hover just opened (the pointer is still inside, so no
    // mouseenter would ever reopen it).
    await trigger.click();
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await trigger.click();
    await expect(menu).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('desktop: switching cuisine on the listing replaces the country', async ({ page }) => {
    const productQueries: ProductVariables[] = [];
    await mockMobileStorefront(page, {
      catalogLabels: 'polish-source',
      onProductsQuery: (variables) => {
        productQueries.push(JSON.parse(JSON.stringify(variables)));
      },
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl/products?country=Japonia');

    const countryGroup = page.getByRole('region', { name: /^filtry$/i }).getByTestId('filter-country');
    const japanChip = countryGroup.getByRole('button', { name: /^japonia$/i });
    const koreaChip = countryGroup.getByRole('button', { name: /^korea południowa$/i });
    await expect(japanChip).toHaveAttribute('aria-pressed', 'true');

    const trigger = page.getByTestId('cuisine-menu-trigger');
    await trigger.hover();
    const menu = page.getByTestId('cuisine-menu');
    await expect(menu.getByRole('link', { name: /^kuchnia japońska$/i })).toHaveAttribute('aria-current', 'page');
    await expect(menu.getByRole('link', { name: /^kuchnia koreańska$/i })).not.toHaveAttribute('aria-current', 'page');

    await menu.getByRole('link', { name: /^kuchnia koreańska$/i }).click();
    await expect(page).toHaveURL(/\/products\?country=Korea%20Po%C5%82udniowa$/);
    await expect.poll(() => productQueries.some((variables) => isExactly(countriesOf(variables), ['Korea Południowa']))).toBe(true);
    await expect(koreaChip).toHaveAttribute('aria-pressed', 'true');
    await expect(japanChip).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('product-card')).toHaveCount(1);

    await trigger.hover();
    await expect(menu.getByRole('link', { name: /^kuchnia koreańska$/i })).toHaveAttribute('aria-current', 'page');
    await expect(menu.getByRole('link', { name: /^kuchnia japońska$/i })).not.toHaveAttribute('aria-current', 'page');
  });

  test('keyboard: Enter opens the menu, Escape closes it and returns focus to the trigger', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/pl');

    const trigger = page.getByTestId('cuisine-menu-trigger');
    const menu = page.getByTestId('cuisine-menu');

    await expect(menu).toHaveCount(0);

    await expect.poll(async () => {
      // WebKit can expose the server-rendered button before React has attached
      // its handlers. Refocus and re-press until hydration is complete so the
      // test exercises keyboard behavior, not hydration speed.
      await trigger.focus();
      await page.keyboard.press('Enter');
      return trigger.getAttribute('aria-expanded');
    }, { timeout: 15_000 }).toBe('true');
    await expect(menu).toBeVisible();
    await expect(trigger).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(menu.getByRole('link').first()).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('mobile: the drawer lists the cuisines under their own heading', async ({ page }) => {
    await mockMobileStorefront(page, { catalogLabels: 'polish-source' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en');

    await page.getByRole('button', { name: /open menu/i }).click();
    const drawer = page.getByRole('dialog');
    const cuisines = drawer.getByTestId('mobile-cuisine-links');
    await expect(cuisines).toContainText(/cuisines/i);
    await expect(cuisines.getByRole('link')).toHaveCount(5);

    const japanLink = cuisines.getByRole('link', { name: /^japanese cuisine$/i });
    await expect(japanLink).toHaveAttribute('href', '/en/products?country=Japonia');
    await japanLink.click();

    await expect(page).toHaveURL(/\/en\/products\?country=Japonia$/);
    await expect(drawer).toHaveCount(0);
    await expect(page.getByTestId('mobile-product-card')).toHaveCount(1);
  });
});
