import { expect, test } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

// Facebook remains configured in playwright.config.ts. Product visibility must
// stay off even when its underlying OAuth integration is available for later.
for (const locale of ['pl', 'en'] as const) {
  for (const mode of ['login', 'register'] as const) {
    test(`${locale} ${mode}: Facebook stays hidden while Google and email remain usable`, async ({ page }) => {
      await mockMobileStorefront(page, { wishlist: 'empty' });
      const facebookRequests: string[] = [];
      page.on('request', (request) => {
        if (/\/api\/auth\/facebook(?:\/|$)|connect\.facebook\.net/.test(request.url())) {
          facebookRequests.push(request.url());
        }
      });
      await page.route('https://accounts.google.com/gsi/client*', (route) => route.fulfill({
        contentType: 'application/javascript',
        body: `window.google = { accounts: { id: {
          initialize() {}, cancel() {},
          renderButton(node) {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = 'Google';
            node.appendChild(button);
          }
        } } };`,
      }));

      const path = `${locale === 'en' ? '/en' : ''}/${mode}`;
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      expect(await response!.text()).not.toContain('data-testid="facebook-auth-section"');
      await expect(page.getByTestId('google-auth-section').getByRole('button', { name: 'Google' }))
        .toBeVisible();
      await expect(page.getByTestId('facebook-auth-section')).toHaveCount(0);
      await expect(page.getByRole('button', { name: /facebook/i })).toHaveCount(0);
      await expect(page.locator('script[data-facebook-customer-auth]')).toHaveCount(0);
      await expect(page.getByRole('separator')).toHaveCount(1);
      await page.locator('#auth-email').fill('shopper@example.test');
      await expect(page.locator('#auth-email')).toHaveValue('shopper@example.test');
      await expect(page.locator('form button[type="submit"]')).toBeEnabled();
      expect(facebookRequests).toEqual([]);
    });
  }
}
