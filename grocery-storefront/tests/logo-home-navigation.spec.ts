import { expect, test, type Page } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// Owner requirement (2026-10-22): either brand logo opens the landing page at
// its beginning, including when already on the home route.
async function scrollAwayFromTop(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(30);
  // Reveal the auto-hiding mobile header without returning to the top.
  await page.evaluate(() => window.scrollBy({ top: -Math.min(120, window.scrollY / 4), behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(30);
}

for (const width of [1440, 390]) {
  test.describe(`home logo at ${width}px`, () => {
    test.use({ viewport: { width, height: 844 } });
    for (const locale of ['pl', 'en']) {
      const home = locale === 'pl' ? '/' : '/en';
      for (const location of ['banner', 'contentinfo'] as const) {
        test(`${locale} ${location} logo returns to top while already at home`, async ({ page }) => {
          await mockMobileStorefront(page);
          await page.goto(home);
          await page.waitForLoadState('networkidle');
          await scrollAwayFromTop(page);
          const logo = page.getByRole(location).getByRole('link', { name: / (Home|Strona główna)$/i });
          await logo.click();
          await expect(page).toHaveURL(new RegExp(`${home}/?$`));
          await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
        });
      }
      test(`${locale} header logo opens home from another route at the top`, async ({ page }) => {
        await mockMobileStorefront(page);
        await page.goto(home);
        await page.waitForLoadState('networkidle');
        await scrollAwayFromTop(page);
        await page.goto(`${locale === 'pl' ? '' : '/en'}/products`);
        await page.waitForLoadState('networkidle');
        await scrollAwayFromTop(page);
        await page.getByRole('banner').getByRole('link', { name: / (Home|Strona główna)$/i }).click();
        await expect(page).toHaveURL(new RegExp(`${home}/?$`));
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      });
    }
  });
}
