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
  await page.getByLabel(/country/i).fill('PL');
}

test.describe('Przelewy24 checkout', () => {
  test('completes the order before registering the P24 session and requires Terms acceptance', async ({ page }) => {
    const operations: RecordedOperation[] = [];
    await page.route(`${P24_ACTION_URL}*`, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body><h1>P24 sandbox</h1></body></html>' })
    );
    await openP24Checkout(page, operations);
    await fillDeliveryForm(page);
    await page.getByRole('button', { name: /continue/i }).click();

    await page.locator('#checkout-panel-shipping').getByRole('button', { name: /standard courier/i }).press('Enter');

    const p24 = page.locator('#checkout-panel-payment').getByRole('button', { name: /przelewy24/i });
    await expect(p24).toBeEnabled();
    await p24.click();
    await expect(page.getByTestId('checkout-section-review').getByRole('button', { name: /review/i })).toHaveAttribute('aria-expanded', 'true');
    // Selecting the method is local state only; no payment session before the order exists.
    expect(operations.map((operation) => operation.name)).not.toContain('CheckoutPaymentCreate');

    const placeOrder = page.getByRole('button', { name: /order with obligation to pay/i });
    const terms = page.locator('#checkout-terms');
    await expect(terms).not.toBeChecked();

    // The fixed mobile summary bar overlaps the button's centre on iPhone viewports,
    // so a pointer click lands on the bar; dispatch the click on the button itself.
    await placeOrder.dispatchEvent('click');
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
    await page.getByRole('button', { name: /continue/i }).click();
    await page.locator('#checkout-panel-shipping').getByRole('button', { name: /standard courier/i }).press('Enter');
    await page.locator('#checkout-panel-payment').getByRole('button', { name: /przelewy24/i }).click();
    await page.locator('#checkout-terms').check();

    const placeOrder = page.getByRole('button', { name: /order with obligation to pay/i });
    await placeOrder.dispatchEvent('click');
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
