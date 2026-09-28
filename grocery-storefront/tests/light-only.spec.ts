import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// The shop has no dark design: a phone in dark mode (or Chrome's auto-dark)
// must still get the light page.
test('stays light when the device prefers dark', async ({ page }) => {
  await mockMobileStorefront(page);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/pl/products');

  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'only light');
  const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
  expect(scheme.split(' ').sort()).toEqual(['light', 'only']); // serialised as "light only"
});
