import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { P24_ACTION_URL, mockMobileStorefront, mockStorefrontConfigWithLegalIdentity, seedCartStorage } from './mobile-fixtures';

// SPEC SOURCES:
// - docs/superpowers/plans/2026-09-25-asiadeligo-p24-design.md: order → payment → redirect;
//   Terms acceptance is mandatory and server-validated; the return page never
//   claims success from URL parameters.

const PAYMENT_ID = '11111111-1111-4111-8111-111111111111';

interface RecordedOperation {
  name: string;
  variables: Record<string, any>;
}

async function openP24Checkout(page: Page, operations: RecordedOperation[]) {
  await seedCartStorage(page);
  // Online payment is only offered once the seller identity is published.
  await mockStorefrontConfigWithLegalIdentity(page);
  await mockMobileStorefront(page, {
    cart: 'single-item',
    checkoutProfile: 'delivery-p24',
    onGraphqlOperation: (name, query, variables) => {
      // The client does not always send operationName; derive it from the document.
      const derived = name || /(?:mutation|query)\s+(\w+)/.exec(query)?.[1] || '';
      operations.push({ name: derived, variables: variables ?? {} });
    },
  });
  await page.goto('/en/checkout');
  await expect(page.getByRole('heading', { name: /checkout/i })).toBeVisible();
}

async function fillDeliveryForm(page: Page) {
  await page.getByLabel(/first name/i).fill('Marta');
  await page.getByLabel(/last name/i).fill('Nowak');
  await page.getByLabel(/^email/i).fill('marta@example.com');
  await page.getByLabel(/phone/i).fill('+48123123123');
  await page.getByLabel(/address/i).fill('Marszalkowska 1');
  await page.getByLabel(/city/i).fill('Warsaw');
  await page.getByLabel(/postal code/i).fill('00-001');
}

test.describe('Przelewy24 checkout', () => {
  test('completes the order before registering the P24 session and requires Terms acceptance', async ({ page }) => {
    const operations: RecordedOperation[] = [];
    await page.route(`${P24_ACTION_URL}*`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body><h1>P24 sandbox</h1></body></html>' })
    );
    await openP24Checkout(page, operations);
    await fillDeliveryForm(page);

    await page.getByTestId('checkout-block-delivery').getByRole('radio', { name: /standard courier/i }).press('Enter');

    const p24 = page.getByTestId('checkout-block-payment').getByRole('radio', { name: /przelewy24/i });
    await expect(p24).toBeEnabled();
    await p24.click();
    await expect(p24).toHaveAttribute('aria-checked', 'true');
    // Selecting the method is local state only; no payment session before the order exists.
    expect(operations.map((operation) => operation.name)).not.toContain('CheckoutPaymentCreate');

    const placeOrder = page.getByRole('button', { name: /order and pay/i });
    const terms = page.locator('#checkout-terms');
    await expect(terms).not.toBeChecked();

    await placeOrder.click();
    // WebKit emulation does not report programmatic focus on checkboxes, so the
    // error association is asserted instead of document.activeElement.
    await expect(terms).toHaveAttribute('aria-invalid', 'true');
    await expect(terms).toHaveAttribute('aria-describedby', 'checkout-terms-error');
    await expect(page.locator('#checkout-terms-error')).toHaveText(/accept the terms/i);
    expect(operations.map((operation) => operation.name)).not.toContain('CheckoutComplete');

    await terms.check();
    await placeOrder.dispatchEvent('click');
    await page.waitForURL((url) => url.href.startsWith(P24_ACTION_URL));

    const names = operations.map((operation) => operation.name);
    const completeIndex = names.indexOf('CheckoutComplete');
    const createIndex = names.indexOf('CheckoutPaymentCreate');
    expect(completeIndex).toBeGreaterThan(-1);
    expect(createIndex).toBeGreaterThan(completeIndex);

    expect(operations[completeIndex].variables.input).toMatchObject({ paymentData: 'p24', termsAccepted: true });
    expect(operations[createIndex].variables.input).toMatchObject({ gateway: 'p24', orderId: 'order-1' });
  });
});

test.describe('Przelewy24 checkout retry', () => {
  test('a failed registration keeps the order and retries the payment for the same order', async ({ page }) => {
    const operations: RecordedOperation[] = [];
    await page.route(`${P24_ACTION_URL}*`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body><h1>P24 sandbox</h1></body></html>' })
    );
    await seedCartStorage(page);
    await mockStorefrontConfigWithLegalIdentity(page);
    await mockMobileStorefront(page, {
      cart: 'single-item',
      checkoutProfile: 'delivery-p24',
      p24PaymentCreate: 'fail-once',
      onGraphqlOperation: (name, query, variables) => {
        const derived = name || /(?:mutation|query)\s+(\w+)/.exec(query)?.[1] || '';
        operations.push({ name: derived, variables: variables ?? {} });
      },
    });
    await page.goto('/en/checkout');
    await fillDeliveryForm(page);
    await page.getByTestId('checkout-block-delivery').getByRole('radio', { name: /standard courier/i }).press('Enter');
    await page.getByTestId('checkout-block-payment').getByRole('radio', { name: /przelewy24/i }).click();
    await page.locator('#checkout-terms').check();

    const placeOrder = page.getByRole('button', { name: /order and pay/i });
    await placeOrder.click();
    await expect(page.locator('#main-content').getByRole('alert')).toContainText(/could not start the payment/i);
    const retry = page.getByRole('button', { name: /retry payment/i });
    await expect(retry).toBeVisible();

    await retry.dispatchEvent('click');
    await page.waitForURL((url) => url.href.startsWith(P24_ACTION_URL));

    const completes = operations.filter((operation) => operation.name === 'CheckoutComplete');
    const creates = operations.filter((operation) => operation.name === 'CheckoutPaymentCreate');
    expect(completes).toHaveLength(1);
    expect(creates).toHaveLength(2);
    for (const create of creates) {
      expect(create.variables.input).toMatchObject({ gateway: 'p24', orderId: 'order-1' });
    }
  });
});

test.describe('Przelewy24 return page', () => {
  test('offers a way back to Przelewy24 while the registered session is still valid', async ({ page }) => {
    await page.route('**/api/v1/payments/p24/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'pending' }) })
    );
    await mockMobileStorefront(page, {});
    await page.addInitScript(
      ({ paymentId, actionUrl }) => {
        window.sessionStorage.setItem(
          'adg-p24-pending',
          JSON.stringify({ paymentId, orderId: 'order-1', orderNumber: '1001', actionUrl, registeredAt: new Date().toISOString() })
        );
      },
      { paymentId: PAYMENT_ID, actionUrl: P24_ACTION_URL }
    );
    await page.goto(`/en/checkout/payment-return?payment_id=${PAYMENT_ID}`);
    await expect(page.getByTestId('payment-return-status')).toHaveAttribute('data-state', 'pending');
    await expect(page.getByTestId('payment-return-resume')).toHaveAttribute('href', P24_ACTION_URL);
    await expect(page.getByText('#1001')).toBeVisible();
  });

  test('keeps polling through a transient backend error', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/v1/payments/p24/status*', (route) => {
      calls += 1;
      if (calls === 1) {
        return route.fulfill({ status: 502, contentType: 'text/plain', body: 'bad gateway' });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'paid' }) });
    });
    await mockMobileStorefront(page, {});
    await page.clock.install();
    await page.goto(`/en/checkout/payment-return?payment_id=${PAYMENT_ID}`);
    await page.clock.runFor(30_500);
    await expect(page.getByTestId('payment-return-status')).toHaveAttribute('data-state', 'paid');
  });

  test('shows pending until the backend reports paid and ignores the status query parameter', async ({ page }) => {
    // The backend is the only source of truth: it reports pending until the
    // (mocked) webhook settles, regardless of `status=paid` in the URL.
    let settled = false;
    let calls = 0;
    await page.route('**/api/v1/payments/p24/status*', async (route) => {
      calls += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: settled ? 'paid' : 'pending' }),
      });
    });
    await mockMobileStorefront(page, {});
    await page.clock.install();

    await page.goto(`/en/checkout/payment-return?payment_id=${PAYMENT_ID}&status=paid`);
    const status = page.getByTestId('payment-return-status');
    await expect(status).toHaveAttribute('data-state', 'pending');
    await expect(status).toHaveText(/waiting for przelewy24/i);
    const callsWhilePending = calls;
    expect(callsWhilePending).toBeGreaterThan(0);

    // Cadence: 0, 15, 30, 45 s then every 30 s — never more than the public
    // endpoint's five requests per minute (React StrictMode adds one at 0 s in dev).
    await page.clock.runFor(59_000);
    await expect.poll(() => calls).toBeGreaterThanOrEqual(callsWhilePending + 3);
    expect(calls).toBeLessThanOrEqual(5);
    const callsAfterFirstMinute = calls;
    await page.clock.runFor(30_500);
    await expect.poll(() => calls).toBe(callsAfterFirstMinute + 1);

    settled = true;
    await page.clock.runFor(30_500);
    await expect(status).toHaveAttribute('data-state', 'paid');
    await expect(status).toHaveText(/payment confirmed/i);
  });

  test('reports a failed payment from the backend', async ({ page }) => {
    await page.route('**/api/v1/payments/p24/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'failed' }) })
    );
    await mockMobileStorefront(page, {});
    await page.goto(`/en/checkout/payment-return?payment_id=${PAYMENT_ID}`);
    await expect(page.getByTestId('payment-return-status')).toHaveText(/was not completed/i);
  });

  test('refuses a malformed payment id without calling the backend', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/v1/payments/p24/status*', (route) => {
      calls += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'paid' }) });
    });
    await mockMobileStorefront(page, {});
    await page.goto('/en/checkout/payment-return?payment_id=not-a-uuid&status=paid');
    await expect(page.getByTestId('payment-return-status')).toHaveText(/missing payment identifier/i);
    expect(calls).toBe(0);
  });
});

// Back from P24 and the cart: the cart is emptied when the shopper is sent to
// P24 (a paid order must not stay in it). Back must then resume the SAME P24
// session instead of showing an empty checkout that invites a second order, and
// the cart comes back only once the backend reports the payment as failed.
test.describe('Przelewy24 back button and cart', () => {
  test('Back from P24 shows the payment status with the way back to the same session', async ({ page }) => {
    const operations: RecordedOperation[] = [];
    await page.route(`${P24_ACTION_URL}*`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body><h1>P24 sandbox</h1></body></html>' })
    );
    await page.route('**/api/v1/payments/p24/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'pending' }) })
    );
    // Seed the cart once: seedCartStorage re-seeds on every navigation, which
    // would refill the cart that checkout emptied before the redirect.
    await page.addInitScript(() => {
      if (window.sessionStorage.getItem('test-cart-seeded')) return;
      window.sessionStorage.setItem('test-cart-seeded', '1');
      window.localStorage.setItem('grocery-cart', JSON.stringify({ state: { cartId: 'cart-1' }, version: 1 }));
    });
    await mockStorefrontConfigWithLegalIdentity(page);
    await mockMobileStorefront(page, {
      cart: 'single-item',
      checkoutProfile: 'delivery-p24',
      onGraphqlOperation: (name, query, variables) => {
        const derived = name || /(?:mutation|query)\s+(\w+)/.exec(query)?.[1] || '';
        operations.push({ name: derived, variables: variables ?? {} });
      },
    });
    await page.goto('/en/checkout');
    await fillDeliveryForm(page);
    await page.getByTestId('checkout-block-delivery').getByRole('radio', { name: /standard courier/i }).press('Enter');
    await page.getByTestId('checkout-block-payment').getByRole('radio', { name: /przelewy24/i }).click();
    await page.locator('#checkout-terms').check();
    await page.getByRole('button', { name: /order and pay/i }).dispatchEvent('click');
    await page.waitForURL((url) => url.href.startsWith(P24_ACTION_URL));

    await page.goBack();
    await page.waitForURL(/\/checkout\/payment-return\?payment_id=/);
    // Read back on the shop origin: the cart paid for was kept aside.
    const snapshot = await page.evaluate(() => window.localStorage.getItem('adg-p24-cart-snapshot'));
    expect(JSON.parse(snapshot ?? '{}')).toMatchObject({
      paymentId: PAYMENT_ID,
      lines: [expect.objectContaining({ quantity: expect.any(Number) })],
    });
    await expect(page.getByTestId('payment-return-status')).toHaveAttribute('data-state', 'pending');
    await expect(page.getByTestId('payment-return-resume')).toHaveAttribute('href', P24_ACTION_URL);
    // No second order and no second P24 registration.
    expect(operations.filter((operation) => operation.name === 'CheckoutComplete')).toHaveLength(1);
    expect(operations.filter((operation) => operation.name === 'CheckoutPaymentCreate')).toHaveLength(1);
  });

  test('a stale pending payment does not hold the checkout hostage', async ({ page }) => {
    await page.addInitScript((paymentId) => {
      window.sessionStorage.setItem(
        'adg-p24-pending',
        JSON.stringify({ paymentId, registeredAt: new Date(Date.now() - 31 * 60 * 1000).toISOString() })
      );
    }, PAYMENT_ID);
    await openP24Checkout(page, []);
    await expect(page).toHaveURL(/\/en\/checkout$/);
  });

  test('a failed payment offers to restore the cart and clears the pending payment', async ({ page }) => {
    const operations: RecordedOperation[] = [];
    await page.route('**/api/v1/payments/p24/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'failed' }) })
    );
    await mockMobileStorefront(page, {
      cart: 'single-item',
      onGraphqlOperation: (name, query, variables) => {
        const derived = name || /(?:mutation|query)\s+(\w+)/.exec(query)?.[1] || '';
        operations.push({ name: derived, variables: variables ?? {} });
      },
    });
    await page.addInitScript((paymentId) => {
      window.sessionStorage.setItem(
        'adg-p24-pending',
        JSON.stringify({ paymentId, orderNumber: '1001', registeredAt: new Date().toISOString() })
      );
      window.localStorage.setItem(
        'adg-p24-cart-snapshot',
        JSON.stringify({ paymentId, lines: [{ merchandiseId: 'variant-1', quantity: 2 }], savedAt: new Date().toISOString() })
      );
    }, PAYMENT_ID);
    await page.goto(`/en/checkout/payment-return?payment_id=${PAYMENT_ID}`);
    await expect(page.getByTestId('payment-return-status')).toHaveAttribute('data-state', 'failed');

    await page.getByTestId('payment-return-restore-cart').click();
    await page.waitForURL(/\/en\/checkout$/);
    // An empty cart is recreated with the lines (CartCreate); an existing one gets them added.
    const restored = operations.find((operation) => operation.name === 'CartCreate' || operation.name === 'CartLinesAdd');
    expect(restored?.variables.input?.lines ?? restored?.variables.lines).toEqual([{ merchandiseId: 'variant-1', quantity: 2 }]);
    const storage = await page.evaluate(() => ({
      pending: window.sessionStorage.getItem('adg-p24-pending'),
      snapshot: window.localStorage.getItem('adg-p24-cart-snapshot'),
    }));
    expect(storage).toEqual({ pending: null, snapshot: null });
  });

  test('too late to resume: says when the payment closes, keeps polling, then offers the cart back', async ({ page }) => {
    let failed = false;
    let calls = 0;
    await page.route('**/api/v1/payments/p24/status*', (route) => {
      calls += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: failed ? 'failed' : 'pending' }),
      });
    });
    await mockMobileStorefront(page, {});
    await page.clock.install();
    const registeredAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    await page.addInitScript(
      ({ paymentId, actionUrl, registeredAt }) => {
        window.sessionStorage.setItem(
          'adg-p24-pending',
          JSON.stringify({ paymentId, orderNumber: '1001', actionUrl, registeredAt })
        );
        window.localStorage.setItem(
          'adg-p24-cart-snapshot',
          JSON.stringify({ paymentId, lines: [{ merchandiseId: 'variant-1', quantity: 1 }], savedAt: registeredAt })
        );
      },
      { paymentId: PAYMENT_ID, actionUrl: P24_ACTION_URL, registeredAt }
    );
    await page.goto(`/en/checkout/payment-return?payment_id=${PAYMENT_ID}`);
    await expect(page.getByTestId('payment-return-status')).toHaveAttribute('data-state', 'pending');
    await expect(page.getByTestId('payment-return-closes-at')).toBeVisible();
    // The 15-minute P24 session is over, and a late BLIK may still land: no
    // resume link and no restore yet.
    await expect(page.getByTestId('payment-return-resume')).toHaveCount(0);
    await expect(page.getByTestId('payment-return-restore-cart')).toHaveCount(0);

    // Still polling past the usual ten minutes, up to the backend closing it.
    await page.clock.runFor(11 * 60_000);
    const callsAfterTenMinutes = calls;
    await page.clock.runFor(61_000);
    await expect.poll(() => calls).toBeGreaterThan(callsAfterTenMinutes);

    failed = true;
    await page.clock.runFor(31_000);
    await expect(page.getByTestId('payment-return-status')).toHaveAttribute('data-state', 'failed');
    await expect(page.getByTestId('payment-return-restore-cart')).toBeVisible();
  });

  test('a paid payment clears the pending payment and the cart snapshot, with no restore offer', async ({ page }) => {
    await page.route('**/api/v1/payments/p24/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'paid' }) })
    );
    await mockMobileStorefront(page, {});
    await page.addInitScript((paymentId) => {
      window.sessionStorage.setItem('adg-p24-pending', JSON.stringify({ paymentId, registeredAt: new Date().toISOString() }));
      window.localStorage.setItem(
        'adg-p24-cart-snapshot',
        JSON.stringify({ paymentId, lines: [{ merchandiseId: 'variant-1', quantity: 1 }], savedAt: new Date().toISOString() })
      );
    }, PAYMENT_ID);
    await page.goto(`/en/checkout/payment-return?payment_id=${PAYMENT_ID}`);
    await expect(page.getByTestId('payment-return-status')).toHaveAttribute('data-state', 'paid');
    await expect(page.getByTestId('payment-return-restore-cart')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => [window.sessionStorage.getItem('adg-p24-pending'), window.localStorage.getItem('adg-p24-cart-snapshot')])
      )
      .toEqual([null, null]);
  });

  test('money that reached P24 but not the order says the store will contact, with no restore offer', async ({ page }) => {
    await page.route('**/api/v1/payments/p24/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'review' }) })
    );
    await mockMobileStorefront(page, {});
    await page.addInitScript((paymentId) => {
      window.sessionStorage.setItem('adg-p24-pending', JSON.stringify({ paymentId, registeredAt: new Date().toISOString() }));
      window.localStorage.setItem(
        'adg-p24-cart-snapshot',
        JSON.stringify({ paymentId, lines: [{ merchandiseId: 'variant-1', quantity: 1 }], savedAt: new Date().toISOString() })
      );
    }, PAYMENT_ID);
    await page.goto(`/en/checkout/payment-return?payment_id=${PAYMENT_ID}`);
    const status = page.getByTestId('payment-return-status');
    await expect(status).toHaveAttribute('data-state', 'review');
    await expect(status).toContainText('Do not pay again');
    await expect(page.getByTestId('payment-return-restore-cart')).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(() => [window.sessionStorage.getItem('adg-p24-pending'), window.localStorage.getItem('adg-p24-cart-snapshot')])
      )
      .toEqual([null, null]);
  });
});
