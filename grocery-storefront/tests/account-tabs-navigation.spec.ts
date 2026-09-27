import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// Regression: the header profile menu links are soft navigations that only change the
// URL, and the account page used to read its tab from `location.hash` on mount plus
// `hashchange` — which never fires for a router navigation. Switching from
// /account#orders to Adresy or Bezpieczeństwo left the old panel on screen.

const EMPTY_ORDERS = {
  orders: { totalCount: 0, pageInfo: { hasNextPage: false, endCursor: null }, edges: [] },
};

async function mockSignedInCustomer(page: Page) {
  await page.context().addCookies([
    { name: 'grocery_customer_access', value: 'opaque-test-session', domain: '127.0.0.1', path: '/', httpOnly: true, secure: false, sameSite: 'Lax' },
  ]);
  await page.route('**/api/auth/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/session') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          customer: { id: 'customer-account-1', email: 'shopper@example.test', fullName: 'Test Shopper', phone: null, createdAt: '2026-01-10T10:00:00.000Z' },
        }),
      });
      return;
    }
    if (pathname === '/api/auth/refresh') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
      return;
    }
    await route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ success: false }) });
  });
}

test.describe('account tabs follow header navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockMobileStorefront(page, {
      wishlist: 'empty',
      graphqlResponses: { CustomerOrders: EMPTY_ORDERS, CustomerAddresses: { customerAddresses: [] } },
    });
    await mockSignedInCustomer(page);
  });

  test('profile menu links switch the panel while already on the account page', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'customer-account-desktop', 'The hover profile menu only exists on desktop');

    await page.goto('/pl/account?tab=orders');
    await expect(page.getByRole('tab', { name: 'Zamówienia' })).toHaveAttribute('aria-selected', 'true');

    const accountButton = page.getByRole('button', { name: 'Test Shopper' });
    await accountButton.hover();
    await page.getByRole('link', { name: 'Adresy' }).click();
    await expect(page).toHaveURL(/\/account\?tab=addresses$/);
    await expect(page.getByRole('tab', { name: 'Adresy' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Zamówienia' })).toHaveAttribute('aria-selected', 'false');
    await expect(page.getByRole('heading', { name: 'Adresy' })).toBeVisible();

    await accountButton.hover();
    await page.getByRole('link', { name: 'Bezpieczeństwo' }).click();
    await expect(page).toHaveURL(/\/account\?tab=security$/);
    await expect(page.getByRole('tab', { name: 'Bezpieczeństwo' })).toHaveAttribute('aria-selected', 'true');
  });

  test('clicking a tab updates the URL and legacy hash links still open the right tab', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'customer-account-desktop', 'One project is enough for URL contract coverage');

    await page.goto('/pl/account#security');
    await expect(page.getByRole('tab', { name: 'Bezpieczeństwo' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Adresy' }).click();
    await expect(page).toHaveURL(/\/account\?tab=addresses$/);
    await expect(page.getByRole('tab', { name: 'Adresy' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Adresy' })).toBeVisible();
  });
});
