import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCES:
// - PRD section 3.2: mobile shoppers need to browse quickly on the go.
// - PRD section 5.1: mobile-first, fast storefront experience.
// - `.claude/docs/progress.md`: accessibility is partial; full audit pending.
// - Page-by-page audit plan: homepage is the first purchase-flow entry point.

test.use({
  hasTouch: false,
  isMobile: false,
  viewport: { width: 390, height: 844 },
});

test.describe('homepage accessibility', () => {
  test('lets keyboard shoppers skip the repeated homepage header', async ({ page }) => {
    await mockMobileStorefront(page);
    await page.goto('/en');

    await page.keyboard.press('Tab');

    const skipControl = page.getByRole('button', { name: /skip to content/i });
    await expect(skipControl).toBeFocused();
    await expect(skipControl).toBeInViewport();

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });
});
