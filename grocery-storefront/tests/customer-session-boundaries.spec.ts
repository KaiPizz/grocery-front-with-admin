import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

// Owner requirement: account switches/logout must not expose the previous
// customer's checkout details, including an already-mounted or restored tab.
const OWNER_KEY = 'grocery-customer-state-owner';
const CUSTOMER_A = { id: 'privacy-A', email: 'privacy-A@example.test', fullName: 'A Shopper', phone: null };
const CUSTOMER_B = { id: 'privacy-B', email: 'privacy-B@example.test', fullName: 'B Shopper', phone: null };

async function openAccountMenu(page: Page) {
  if ((page.viewportSize()?.width ?? 1280) >= 1024) {
    await page.locator('header').getByRole('button', { name: 'A Shopper', exact: true }).click();
  } else {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Logout', exact: true })).toBeVisible();
}

test('logout clears mounted checkout immediately and private details stay gone after reload', async ({ page, context }) => {
  let authenticated = true;
  let finishLogout: () => void = () => {};
  const logoutGate = new Promise<void>((resolve) => { finishLogout = resolve; });
  await context.route('**/api/auth/session', (route) => route.fulfill({ json: {
    authenticated, customer: authenticated ? CUSTOMER_A : null,
    ...(authenticated ? {} : { code: 'NO_SESSION_COOKIE' }),
  } }));
  await context.route('**/api/auth/logout', async (route) => {
    await logoutGate;
    authenticated = false;
    await route.fulfill({ json: { success: true } });
  });
  await seedCartStorage(page);
  await mockMobileStorefront(page, { cart: 'single-item', graphqlResponses: { CustomerAddresses: { customerAddresses: [] } } });
  await page.goto('/en/checkout');
  await expect(page.locator('#checkout-firstName')).toHaveValue('A');
  await page.locator('#checkout-firstName').fill('PrivateA');
  await page.locator('#checkout-phone').fill('+48111111111');
  await page.screenshot({ path: test.info().outputPath('checkout-account-A.png'), fullPage: true });
  await page.evaluate(() => {
    localStorage.setItem('adg-checkout-contact', JSON.stringify({ firstName: 'PrivateA', phone: '+48111111111' }));
    sessionStorage.setItem('adg-last-order', JSON.stringify({ email: 'privacy-A@example.test' }));
  });
  await openAccountMenu(page);
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page.locator('#checkout-firstName')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => ({
    contact: localStorage.getItem('adg-checkout-contact'),
    order: sessionStorage.getItem('adg-last-order'),
    owner: localStorage.getItem('grocery-customer-state-owner'),
  }))).toEqual({ contact: null, order: null, owner: CUSTOMER_A.id });
  expect(await page.evaluate(() => sessionStorage.getItem('oms-checkout-draft-v2'))).not.toContain('PrivateA');
  finishLogout();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), OWNER_KEY)).toBeNull();
  await page.goto('/en/checkout');
  await expect(page.locator('#checkout-firstName')).toHaveValue('');
  await page.reload();
  await expect(page.locator('#checkout-firstName')).toHaveValue('');
  await page.screenshot({ path: test.info().outputPath('checkout-after-logout.png'), fullPage: true });
  expect(await page.evaluate(() => sessionStorage.getItem('oms-checkout-draft-v2'))).not.toContain('PrivateA');
});

test('another tab switching A to B reloads mounted checkout without erasing B shared state', async ({ page, context }) => {
  let customer = CUSTOMER_A;
  await context.route('**/api/auth/session', (route) => route.fulfill({ json: { authenticated: true, customer } }));
  await page.addInitScript(() => {
    // A receiver reload must rehydrate B's shared cart, never reseed A's cart.
    if (sessionStorage.getItem('privacy-test-cart-seeded')) return;
    localStorage.setItem('grocery-cart', JSON.stringify({ state: { cartId: 'cart-A' }, version: 1 }));
    sessionStorage.setItem('privacy-test-cart-seeded', '1');
  });
  await mockMobileStorefront(page, { cart: 'single-item', graphqlResponses: { CustomerAddresses: { customerAddresses: [] } } });
  await page.route('**/api/graphql*', async (route) => {
    const body = route.request().postDataJSON() as { query?: string; variables?: { id?: string } };
    if (!body.query?.includes('query GetCart')) return route.fallback();
    // Keep the requested cart identity while using the existing product fixture.
    await route.fulfill({ json: { data: { cart: {
      id: body.variables?.id,
      lines: [{ id: 'line-1', merchandiseId: 'variant-apples', quantity: 1 }],
      buyerIdentity: null,
      cost: { subtotalAmount: { amount: 12.99, currency: 'PLN' }, totalAmount: { amount: 12.99, currency: 'PLN' } },
    } } } });
  });
  await page.goto('/en/checkout');
  await expect(page.locator('#checkout-firstName')).toHaveValue('A');
  await page.locator('#checkout-firstName').fill('PrivateA');
  const otherTab = await context.newPage();
  await mockMobileStorefront(otherTab, { cart: 'single-item' });
  await otherTab.goto('/en');
  await openAccountMenu(otherTab);
  await expect.poll(() => otherTab.evaluate(() => JSON.parse(localStorage.getItem('grocery-cart') ?? '{}').state?.cartId)).toBe('cart-1');
  customer = CUSTOMER_B;
  await otherTab.evaluate((key) => {
    // These are the new account's shared values. A stale peer must not clear them.
    localStorage.setItem('adg-checkout-contact', JSON.stringify({ firstName: 'PrivateB' }));
    localStorage.setItem('grocery-cart', JSON.stringify({ state: { cartId: 'cart-B' }, version: 1 }));
    localStorage.setItem(key, 'privacy-B');
  }, OWNER_KEY);
  await expect(page.locator('#checkout-firstName')).toHaveValue('B');
  expect(await page.evaluate(() => localStorage.getItem('adg-checkout-contact'))).toContain('PrivateB');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('grocery-cart') ?? '{}').state?.cartId)).toBe('cart-B');
  expect(await page.evaluate(() => sessionStorage.getItem('oms-checkout-draft-v2'))).not.toContain('PrivateA');
  await page.reload();
  await expect(page.locator('#checkout-firstName')).toHaveValue('B');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('grocery-cart') ?? '{}').state?.cartId)).toBe('cart-B');
  await page.screenshot({ path: test.info().outputPath('checkout-account-B.png'), fullPage: true });
  await otherTab.close();
});
