import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// The header menus render the same 2-level tree as the /categories hub:
// one block per group with its leaves (desktop mega menu), one accordion
// row per group in the mobile drawer.

test.describe('category menus (tree) — desktop mega menu', () => {
  test.use({
    viewport: { width: 1280, height: 900 },
    isMobile: false,
    hasTouch: false,
  });

  test('lists one block per group with its leaves and no promo tile', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/pl');

    const mainNavigation = page.getByRole('navigation', { name: 'Main navigation' });
    await mainNavigation.getByRole('link', { name: /^kategorie$/i }).hover();

    const menu = page.getByTestId('category-mega-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByTestId('category-mega-menu-promo')).toHaveCount(0);
    // 4 tree groups + fruit, bakery, frozen and the empty household group.
    await expect(menu.getByTestId('category-mega-menu-group')).toHaveCount(8);

    const kimchi = menu.getByTestId('category-mega-menu-group').filter({ hasText: 'Kimchi i kiszonki' });
    await expect(kimchi.getByTestId('category-mega-menu-group-link')).toHaveAttribute('href', '/categories/kimchi-i-kiszonki');
    await expect(kimchi.getByTestId('category-mega-menu-leaf')).toHaveCount(2);
    await expect(kimchi.getByTestId('category-mega-menu-leaf').first()).toHaveAttribute('href', '/categories/kimchi');
    await expect(kimchi.getByTestId('category-mega-menu-more')).toHaveCount(0);

    const household = menu.getByTestId('category-mega-menu-group').filter({ hasText: 'Household' });
    await expect(household.getByTestId('category-mega-menu-group-link')).toHaveAttribute('href', '/categories/household');
    await expect(household.getByTestId('category-mega-menu-leaf')).toHaveCount(0);

    await kimchi.getByTestId('category-mega-menu-leaf').first().click();
    await expect(page).toHaveURL(/\/categories\/kimchi$/);
    await expect(menu).toBeHidden();
  });
});

test.describe('category menus (tree) — mobile drawer accordion', () => {
  test('expands one group at a time and closes the drawer on navigation', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en');

    // WebKit exposes the SSR trigger before hydration: retry the click until the drawer is open.
    // Click only while the dialog is closed: once open, Radix aria-hides the trigger, so a
    // second click (drawer open, accordion still painting on a loaded box) waits forever.
    await expect(async () => {
      if (!(await page.locator('#mobile-nav').isVisible())) {
        await page.getByRole('button', { name: /open menu/i }).first().click({ timeout: 2_000 });
      }
      await expect(page.getByTestId('mobile-category-accordion')).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    const accordion = page.getByTestId('mobile-category-accordion');
    const toggles = accordion.getByTestId('mobile-category-group');
    // Groups with leaves: noodles, kimchi, cooking, cosmetics.
    await expect(toggles).toHaveCount(4);
    await expect(accordion.getByTestId('mobile-category-leaves')).toHaveCount(0);

    const kimchiToggle = accordion.getByRole('button', { name: /^expand kimchi/i });
    await kimchiToggle.click();
    await expect(kimchiToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(accordion.getByTestId('mobile-category-leaves')).toHaveCount(1);
    await expect(accordion.getByTestId('mobile-category-leaf')).toHaveCount(2);

    const noodlesToggle = accordion.getByRole('button', { name: /^expand noodles/i });
    await noodlesToggle.click();
    await expect(kimchiToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(noodlesToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(accordion.getByTestId('mobile-category-leaves')).toHaveCount(1);

    // A leafless group is a plain link, not a toggle.
    const householdLink = accordion.getByTestId('mobile-category-group-link').filter({ hasText: 'Household' });
    await expect(householdLink).toHaveAttribute('href', '/en/categories/household');

    await accordion.getByTestId('mobile-category-leaf').first().click();
    await expect(page).toHaveURL(/\/en\/categories\//);
    await expect(accordion).toBeHidden();
  });
});
