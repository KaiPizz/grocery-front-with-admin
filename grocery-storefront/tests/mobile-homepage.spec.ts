import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

test.describe('mobile homepage', () => {
  test('uses a compact Stitch-inspired landing page layout for fast shopping', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/en');

    const hero = page.getByTestId('mobile-home-hero');
    const categories = page.getByTestId('mobile-home-quick-categories');
    const categoryTrack = page.getByTestId('mobile-home-quick-categories-track');
    const deals = page.getByTestId('mobile-home-deals');
    const freshPicks = page.getByTestId('mobile-home-fresh-picks');

    await expect(hero).toBeVisible();
    await expect(categories).toBeVisible();
    await expect(deals).toBeVisible();
    await expect(freshPicks).toBeVisible();
    await expect(page.getByTestId('mobile-home-deal-card')).toHaveCount(4);
    const firstDealCard = page.getByTestId('mobile-home-deal-card').first();
    const firstFreshCard = freshPicks.getByTestId('mobile-home-product-card').first();

    await expect(firstDealCard.getByTestId('mobile-product-card-media')).toBeVisible();
    await expect(firstDealCard.getByTestId('mobile-product-card-stepper')).toBeVisible();
    await expect(firstDealCard.getByTestId('mobile-product-card-wishlist')).toBeVisible();
    await expect(firstFreshCard.getByTestId('mobile-product-card-media')).toBeVisible();
    await expect(firstFreshCard.getByTestId('mobile-product-card-stepper')).toBeVisible();
    await expect(hero.getByRole('link', { name: /shop now|products/i })).toBeVisible();

    const isScrollable = await categoryTrack.evaluate((element) => element.scrollWidth > element.clientWidth);
    expect(isScrollable).toBe(true);

    const heroBox = await hero.boundingBox();
    expect(heroBox).not.toBeNull();
    expect(heroBox!.height).toBeLessThan(430);
  });

  test('keeps the Stitch-inspired redesign scoped to mobile and preserves the desktop homepage layout', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en');

    await expect(page.getByTestId('mobile-home-hero')).toBeHidden();
    await expect(page.getByTestId('desktop-home-hero')).toBeVisible();
    await expect(page.getByTestId('desktop-home-zone-grid')).toBeVisible();

    const columnCount = await page.getByTestId('desktop-home-zone-grid').evaluate((element) => {
      return getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length;
    });

    expect(columnCount).toBe(3);
  });

  test('serves a favicon instead of returning 404', async ({ page }) => {
    const response = await page.request.get('/favicon.ico');

    expect(response.ok()).toBeTruthy();
  });
});
