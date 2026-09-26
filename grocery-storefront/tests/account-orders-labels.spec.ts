import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCE: docs/superpowers/plans/2026-09-26-guest-order-tracking.md, Task 3 —
// the signed-in orders panel shows order status, payment status and payment method
// as translated labels, never as raw enum codes.

const ORDERS = {
  orders: {
    totalCount: 1,
    pageInfo: { hasNextPage: false, endCursor: null },
    edges: [
      {
        node: {
          id: 'order-1',
          number: 'ORD-2026-00033',
          status: 'UNCONFIRMED',
          paymentStatus: 'FULLY_CHARGED',
          paymentMethod: 'P24',
          created: '2026-09-26T11:01:00Z',
          total: { gross: { amount: 4.6, currency: 'PLN' } },
          lines: [{ productName: 'Chipsy Nori Kimchi 4,5g', quantity: 1, totalPrice: { gross: { amount: 4.6, currency: 'PLN' } }, thumbnail: null }],
        },
      },
    ],
  },
};

async function mockSignedInCustomer(page: Page) {
  // The proxy gates /account on the access cookie before the client ever asks /api/auth/session.
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

test('orders panel shows translated order and payment labels instead of enum codes', async ({ page }) => {
  // Later routes win in Playwright: the shared fixture registers its own auth stub, so the signed-in stub goes after it.
  await mockMobileStorefront(page, { wishlist: 'empty', graphqlResponses: { CustomerOrders: ORDERS } });
  await mockSignedInCustomer(page);

  await page.goto('/pl/account#orders');
  const panel = page.getByTestId('orders-panel');
  await expect(panel).toContainText('#ORD-2026-00033');
  await expect(panel).toContainText('Przyjęte, czeka na potwierdzenie');
  await expect(panel).toContainText('Opłacone');
  await expect(panel).toContainText('Przelewy24');
  await expect(panel).not.toContainText('UNCONFIRMED');
  await expect(panel).not.toContainText('FULLY_CHARGED');
});
