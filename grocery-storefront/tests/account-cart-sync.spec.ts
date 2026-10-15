import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { P24_ACTION_URL, mockMobileStorefront, mockStorefrontConfigWithLegalIdentity } from './mobile-fixtures';

// Owner requirement: independent devices discover and update one saved cart;
// focus revalidation must refresh an already-mounted cart without a reload.
test('two independent browser contexts share account quantities and refresh on focus', async ({ page, browser, baseURL }) => {
  let quantity = 0;
  let revision = 0;
  let syncCalls = 0;
  let guestCreates = 0;
  const customer = { id: 'account-cart-A', email: 'cart-A@example.test', fullName: 'Cart Shopper', emailVerified: true };
  function cart() {
    return {
      id: 'canonical-account-cart-A',
      lines: quantity ? [{ id: 'account-line', merchandiseId: 'variant-apples', quantity, cost: {
        amountPerQuantity: { amount: 12.99, currency: 'PLN' }, totalAmount: { amount: 12.99 * quantity, currency: 'PLN' },
      } }] : [],
      buyerIdentity: null,
      cost: { subtotalAmount: { amount: 12.99 * quantity, currency: 'PLN' }, totalAmount: { amount: 12.99 * quantity, currency: 'PLN' } },
      updatedAt: new Date(1_700_000_000_000 + revision).toISOString(),
    };
  }
  async function configure(target: Page) {
    await mockMobileStorefront(target, { graphqlResponses: { CustomerAddresses: { customerAddresses: [] } } });
    await target.route('**/api/auth/session', (route) => route.fulfill({ json: { authenticated: true, customer } }));
    await target.route('**/api/graphql*', async (route) => {
      const body = route.request().postDataJSON() as { query?: string; variables?: { lines?: Array<{ quantity: number }> } };
      const name = /(?:mutation|query)\s+(\w+)/.exec(body.query ?? '')?.[1];
      if (name === 'CartCreate') guestCreates++;
      if (name === 'AccountCartSync') {
        syncCalls++;
        await route.fulfill({ json: { data: { accountCartSync: { cart: cart(), userErrors: [] } } } });
      } else if (name === 'CartLinesAdd' || name === 'CartLinesUpdate') {
        const count = body.variables?.lines?.[0]?.quantity ?? 0;
        quantity = name === 'CartLinesAdd' ? quantity + count : count;
        revision++;
        await route.fulfill({ json: { data: { [name === 'CartLinesAdd' ? 'cartLinesAdd' : 'cartLinesUpdate']: { cart: cart(), userErrors: [] } } } });
      } else {
        await route.fallback();
      }
    });
  }
  await configure(page);
  await page.goto('/en/products/organic-gala-apples');
  await expect.poll(() => syncCalls).toBeGreaterThan(0);
  await page.getByTestId('product-detail-add').click();
  await expect.poll(() => quantity).toBe(1);
  await page.goto('/en/cart');
  const firstQuantity = page.getByTestId('cart-item-controls').locator('[aria-live="polite"]');
  await expect(firstQuantity).toHaveText('1');
  const secondContext = await browser.newContext({ baseURL });
  try {
    const second = await secondContext.newPage();
    await configure(second);
    await second.goto('/en/cart');
    await expect(second.getByTestId('cart-item-controls').locator('[aria-live="polite"]')).toHaveText('1');
    await second.getByRole('button', { name: /^increase .+ quantity$/i }).click();
    await expect.poll(() => quantity).toBe(2);
    const syncBeforeFocus = syncCalls;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => syncCalls).toBeGreaterThan(syncBeforeFocus);
    await expect(firstQuantity).toHaveText('2');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('grocery-cart') ?? '{}').state?.cartId)).toBe('canonical-account-cart-A');
    expect(guestCreates).toBe(0);
    await page.screenshot({ path: test.info().outputPath('account-cart-device-one.png'), fullPage: true });
    await second.screenshot({ path: test.info().outputPath('account-cart-device-two.png'), fullPage: true });
  } finally {
    await secondContext.close();
  }
});

for (const cartChanged of [false, true]) {
  test(`account checkout ${cartChanged ? 'preserves a conflicting cart without offering duplicate restore' : 'closes its source and preserves recovery lines'} through P24 retry`, async ({ page, baseURL }) => {
  const sourceId = 'account-checkout-source';
  const sourceRevision = '2026-10-15T12:00:00.000Z';
  let closed = false;
  const completes: Array<Record<string, unknown>> = [];
  const payments: Array<Record<string, unknown>> = [];
  const source = {
    id: sourceId,
    lines: [{ id: 'account-line', merchandiseId: 'variant-apples', quantity: 1 }],
    buyerIdentity: { email: 'cart-A@example.test', phone: null, countryCode: 'PL' },
    cost: { subtotalAmount: { amount: 12.99, currency: 'PLN' }, totalAmount: { amount: 12.99, currency: 'PLN' } },
    updatedAt: sourceRevision,
  };
  await mockStorefrontConfigWithLegalIdentity(page);
  await mockMobileStorefront(page, {
    cart: 'single-item', checkoutProfile: 'delivery-p24', p24PaymentCreate: 'fail-once',
    graphqlResponses: { CustomerAddresses: { customerAddresses: [] } },
    onGraphqlOperation: (name, query, variables) => {
      const operation = name || /(?:mutation|query)\s+(\w+)/.exec(query)?.[1];
      if (operation === 'CheckoutComplete') completes.push((variables?.input ?? {}) as Record<string, unknown>);
      if (operation === 'CheckoutPaymentCreate') payments.push((variables?.input ?? {}) as Record<string, unknown>);
    },
  });
  await page.route('**/api/auth/session', (route) => route.fulfill({ json: {
    authenticated: true,
    customer: { id: 'account-cart-A', email: 'cart-A@example.test', fullName: 'Cart Shopper', emailVerified: true, phone: null },
  } }));
  await page.route('**/api/graphql*', async (route) => {
    const body = route.request().postDataJSON() as { query?: string; variables?: { input?: Record<string, unknown> } };
    const name = /(?:mutation|query)\s+(\w+)/.exec(body.query ?? '')?.[1];
    if (name === 'AccountCartSync') {
      await route.fulfill({ json: { data: { accountCartSync: {
        cart: closed ? { ...source, id: 'account-replacement', lines: [] } : source, userErrors: [],
      } } } });
    } else if (name === 'CartBuyerIdentityUpdate' || name === 'CartNoteUpdate' || name === 'CartSelectedDeliveryOptionsUpdate') {
      const fields = { CartBuyerIdentityUpdate: 'cartBuyerIdentityUpdate', CartNoteUpdate: 'cartNoteUpdate', CartSelectedDeliveryOptionsUpdate: 'cartSelectedDeliveryOptionsUpdate' };
      await route.fulfill({ json: { data: { [fields[name]]: { cart: source, userErrors: [] } } } });
    } else if (name === 'CheckoutComplete') {
      completes.push(body.variables?.input ?? {});
      closed = !cartChanged;
      if (cartChanged) source.lines[0].quantity = 2;
      await route.fulfill({ json: { data: { checkoutComplete: {
        order: { id: 'order-1', number: '1001', status: 'UNFULFILLED', total: { gross: { amount: 12.99, currency: 'PLN' } } },
        cartChanged, errors: [],
      } } } });
    } else {
      await route.fallback();
    }
  });
  await page.route(`${P24_ACTION_URL}*`, async (route) => {
    await route.fulfill({ contentType: 'text/html', body: '<h1>P24 sandbox</h1>' });
  });
  await page.goto('/en/checkout');
  await expect(page.locator('#checkout-firstName')).toHaveValue('Cart');
  await page.locator('#checkout-phone').fill('+48111222333');
  await page.getByLabel(/^address/i).fill('Testowa 1');
  await page.getByLabel(/^city/i).fill('Warsaw');
  await page.getByLabel(/postal code/i).fill('00-001');
  await page.getByTestId('checkout-block-delivery').getByRole('radio', { name: /standard courier/i }).click();
  await page.getByTestId('checkout-block-payment').getByRole('radio', { name: /przelewy24/i }).click();
  await page.locator('#checkout-terms').check();
  await page.getByRole('button', { name: /order and pay/i }).click();
  await expect(page.getByRole('button', { name: /retry payment/i })).toBeVisible();
  expect(completes).toHaveLength(1);
  expect(completes[0]).toMatchObject({ sourceCartId: sourceId, sourceCartUpdatedAt: sourceRevision });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('grocery-cart') ?? '{}').state?.cartId)).toBe(cartChanged ? sourceId : 'account-replacement');
  await page.getByRole('button', { name: /retry payment/i }).click();
  await page.waitForURL((url) => url.href.startsWith(P24_ACTION_URL));
  expect(completes).toHaveLength(1);
  expect(payments).toHaveLength(2);
  expect(payments.every((input) => input.orderId === 'order-1')).toBe(true);
  // Navigation has committed: inspect the shop's storage without evaluating
  // JavaScript in a document that is waiting for this route to finish.
  const storage = await page.context().storageState();
  const snapshot = storage.origins.find((origin) => origin.origin === new URL(baseURL!).origin)
    ?.localStorage.find((entry) => entry.name === 'adg-p24-cart-snapshot')?.value;
  const recoveryLines = snapshot ? JSON.parse(snapshot).lines : undefined;
  expect(recoveryLines).toEqual(cartChanged ? undefined : [{ merchandiseId: 'variant-apples', quantity: 1 }]);
});
}
