import { expect, test } from '@playwright/test';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

// Owner requirement: account switches/logout must not expose the previous
// customer's checkout details, including an already-mounted or restored tab.
test.use({ viewport: { width: 1440, height: 1000 } });

const OWNER_KEY = 'grocery-customer-state-owner';
const CUSTOMER_A = { id: 'privacy-A', email: 'privacy-A@example.test', fullName: 'A Shopper', phone: null };
const CUSTOMER_B = { id: 'privacy-B', email: 'privacy-B@example.test', fullName: 'B Shopper', phone: null };

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
  await mockMobileStorefront(page, { cart: 'single-item' });
  await page.goto('/en/checkout');
  await expect(page.locator('#checkout-firstName')).toHaveValue('A');
  await page.locator('#checkout-firstName').fill('PrivateA');
  await page.locator('#checkout-phone').fill('+48111111111');
  await page.evaluate(() => {
    localStorage.setItem('adg-checkout-contact', JSON.stringify({ firstName: 'PrivateA', phone: '+48111111111' }));
    sessionStorage.setItem('adg-last-order', JSON.stringify({ email: 'privacy-A@example.test' }));
  });
  await page.locator('header').getByRole('button', { name: 'A Shopper', exact: true }).click();
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
  expect(await page.evaluate(() => sessionStorage.getItem('oms-checkout-draft-v2'))).not.toContain('PrivateA');
});

test('another tab switching A to B reloads mounted checkout without erasing B shared state', async ({ page, context }) => {
  let customer = CUSTOMER_A;
  await context.route('**/api/auth/session', (route) => route.fulfill({ json: { authenticated: true, customer } }));
  await seedCartStorage(page);
  await mockMobileStorefront(page, { cart: 'single-item' });
  await page.goto('/en/checkout');
  await expect(page.locator('#checkout-firstName')).toHaveValue('A');
  await page.locator('#checkout-firstName').fill('PrivateA');
  const otherTab = await context.newPage();
  await mockMobileStorefront(otherTab, { cart: 'single-item' });
  await otherTab.goto('/en');
  await expect(otherTab.locator('header').getByRole('button', { name: 'A Shopper', exact: true })).toBeVisible();
  customer = CUSTOMER_B;
  await otherTab.evaluate((key) => {
    // These are the new account's shared values. A stale peer must not clear them.
    localStorage.setItem('adg-checkout-contact', JSON.stringify({ firstName: 'PrivateB' }));
    localStorage.setItem('grocery-cart', JSON.stringify({ state: { cartId: 'cart-B' }, version: 1 }));
    localStorage.setItem(key, 'privacy-B');
  }, OWNER_KEY);
  await expect(page.locator('#checkout-firstName')).toHaveValue('B');
  expect(await page.evaluate(() => localStorage.getItem('adg-checkout-contact'))).toContain('PrivateB');
  expect(await page.evaluate(() => localStorage.getItem('grocery-cart'))).not.toContain('"cartId":null');
  expect(await page.evaluate(() => sessionStorage.getItem('oms-checkout-draft-v2'))).not.toContain('PrivateA');
  await page.reload();
  await expect(page.locator('#checkout-firstName')).toHaveValue('B');
  await otherTab.close();
});
