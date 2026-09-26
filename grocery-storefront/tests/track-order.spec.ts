import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCES:
// - docs/superpowers/plans/2026-09-26-guest-order-tracking.md, Task 4:
//   guest lookup by order number + e-mail; statuses rendered as labels, never raw
//   enum codes; "not found" never says which half was wrong; 429 explains itself;
//   the page is reachable from the footer and from the order confirmation page.

const FOUND = {
  guestOrder: {
    number: 'ORD-2026-00033',
    created: '2026-09-26T11:01:00Z',
    status: 'UNCONFIRMED',
    paymentStatus: 'FULLY_CHARGED',
    paymentMethod: 'P24',
    isPaid: true,
    shippingMethodName: 'Odbiór osobisty',
    total: { gross: { amount: 4.6, currency: 'PLN' } },
    lines: [{ productName: 'Chipsy Nori Kimchi 4,5g', quantity: 1, totalPrice: { gross: { amount: 4.6, currency: 'PLN' } } }],
  },
};

async function mockGuestOrder(page: Page, handler: (variables: any) => { status?: number; body: unknown }) {
  await mockMobileStorefront(page, {});
  // Registered after the fixture so it wins for GuestOrder and falls back for everything else.
  await page.route('**/api/graphql', async (route) => {
    const body = route.request().postDataJSON() as { query?: string; operationName?: string; variables?: any };
    const name = body.operationName || /(?:query|mutation)\s+(\w+)/.exec(body.query ?? '')?.[1];
    if (name !== 'GuestOrder') return route.fallback();
    const response = handler(body.variables);
    await route.fulfill({ status: response.status ?? 200, contentType: 'application/json', body: JSON.stringify(response.body) });
  });
}

test.describe('Track order (guest)', () => {
  test('shows the order with translated statuses when number and email match', async ({ page }) => {
    const seen: any[] = [];
    await mockGuestOrder(page, (variables) => {
      seen.push(variables);
      return { body: variables.input.orderNumber === 'ord-2026-00033' ? { data: FOUND } : { data: { guestOrder: null } } };
    });
    await page.goto('/pl/track-order');
    await expect(page.getByTestId('track-order-form')).toHaveAttribute('data-ready', 'true');
    await page.getByLabel('Numer zamówienia').fill('ord-2026-00033');
    await page.getByLabel('E-mail').fill('paulviet.dinh@gmail.com');
    await page.getByRole('button', { name: 'Sprawdź' }).click();

    const result = page.getByTestId('track-order-result');
    await expect(result).toContainText('Zamówienie #ORD-2026-00033');
    await expect(result).toContainText('Przyjęte, czeka na potwierdzenie');
    await expect(result).toContainText('Opłacone');
    await expect(result).toContainText('Przelewy24');
    await expect(result).toContainText('Chipsy Nori Kimchi 4,5g');
    await expect(result).not.toContainText('FULLY_CHARGED');
    await expect(result).not.toContainText('UNCONFIRMED');
    expect(seen[0].input).toEqual({ orderNumber: 'ord-2026-00033', email: 'paulviet.dinh@gmail.com' });
    expect(typeof seen[0].channel).toBe('string');
  });

  test('prefills from the query string and reports not found without leaking why', async ({ page }) => {
    await mockGuestOrder(page, () => ({ body: { data: { guestOrder: null } } }));
    await page.goto('/pl/track-order?order=ORD-2026-00001&email=someone%40example.test');
    await expect(page.getByTestId('track-order-form')).toHaveAttribute('data-ready', 'true');
    await expect(page.getByLabel('Numer zamówienia')).toHaveValue('ORD-2026-00001');
    await expect(page.getByLabel('E-mail')).toHaveValue('someone@example.test');
    await page.getByRole('button', { name: 'Sprawdź' }).click();
    await expect(page.getByTestId('track-order-alert')).toContainText('Nie znaleźliśmy zamówienia');
    await expect(page.getByTestId('track-order-result')).toHaveCount(0);
  });

  test('explains rate limiting on 429', async ({ page }) => {
    await mockGuestOrder(page, () => ({ status: 429, body: { errors: [{ message: 'ThrottlerException: Too Many Requests' }] } }));
    await page.goto('/pl/track-order');
    await expect(page.getByTestId('track-order-form')).toHaveAttribute('data-ready', 'true');
    await page.getByLabel('Numer zamówienia').fill('ORD-2026-00033');
    await page.getByLabel('E-mail').fill('a@b.pl');
    await page.getByRole('button', { name: 'Sprawdź' }).click();
    await expect(page.getByTestId('track-order-alert')).toContainText('Zbyt wiele prób');
  });

  test('unknown status codes fall back to a label with the raw code instead of breaking', async ({ page }) => {
    await mockGuestOrder(page, () => ({
      body: { data: { guestOrder: { ...FOUND.guestOrder, status: 'SOMETHING_NEW', paymentStatus: 'WEIRD', paymentMethod: 'BLIK' } } },
    }));
    await page.goto('/pl/track-order');
    await expect(page.getByTestId('track-order-form')).toHaveAttribute('data-ready', 'true');
    await page.getByLabel('Numer zamówienia').fill('ORD-2026-00033');
    await page.getByLabel('E-mail').fill('a@b.pl');
    await page.getByRole('button', { name: 'Sprawdź' }).click();
    const result = page.getByTestId('track-order-result');
    await expect(result).toContainText('Status: SOMETHING_NEW');
    await expect(result).toContainText('Płatność: WEIRD');
    await expect(result).toContainText('BLIK');
  });

  test('footer, confirmation page and payment return page link to the tracking page', async ({ page }) => {
    await page.route('**/api/v1/payments/p24/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'pending' }) })
    );
    await mockMobileStorefront(page, {});
    await page.goto('/pl/products');
    await expect(page.locator('footer').getByRole('link', { name: 'Sprawdź zamówienie' })).toHaveAttribute('href', '/track-order');

    await page.goto('/pl/checkout/confirmation?order=ORD-2026-00033&email=paulviet.dinh%40gmail.com');
    await expect(page.getByRole('link', { name: 'Sprawdź status zamówienia' })).toHaveAttribute(
      'href',
      '/track-order?order=ORD-2026-00033&email=paulviet.dinh%40gmail.com'
    );

    const paymentId = '11111111-1111-4111-8111-111111111111';
    await page.addInitScript(
      ({ id }) => {
        window.sessionStorage.setItem(
          'adg-p24-pending',
          JSON.stringify({ paymentId: id, orderId: 'order-1', orderNumber: 'ORD-2026-00033', email: 'paulviet.dinh@gmail.com', registeredAt: new Date().toISOString() })
        );
      },
      { id: paymentId }
    );
    await page.goto(`/pl/checkout/payment-return?payment_id=${paymentId}`);
    await expect(page.getByTestId('payment-return-track')).toHaveAttribute(
      'href',
      '/track-order?order=ORD-2026-00033&email=paulviet.dinh%40gmail.com'
    );
  });
});
