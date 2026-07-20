import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

const CUSTOMER = {
  id: 'bootstrap-customer-1',
  email: 'bootstrap@example.test',
  fullName: 'Bootstrap Shopper',
  phone: null,
  emailVerified: true,
  createdAt: '2026-07-20T00:00:00.000Z',
  hasPassword: true,
  linkedProviders: ['password'],
};

async function fulfillJson(route: Route, body: Record<string, unknown>, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installRecoverableSession(page: Page, mode: 'refresh' | 'legacy') {
  let recovered = false;
  const calls = { session: 0, refresh: 0, legacy: 0 };

  await page.route('**/api/auth/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;

    if (pathname === '/api/auth/session') {
      calls.session += 1;
      if (recovered) {
        await fulfillJson(route, { authenticated: true, customer: CUSTOMER });
      } else if (mode === 'refresh') {
        await fulfillJson(route, {
          authenticated: false,
          customer: null,
          code: 'NO_ACCESS_COOKIE',
        }, 401);
      } else {
        await fulfillJson(route, {
          authenticated: false,
          customer: null,
          code: 'NO_SESSION_COOKIE',
        });
      }
      return;
    }

    if (pathname === '/api/auth/refresh') {
      calls.refresh += 1;
      recovered = true;
      await fulfillJson(route, { success: true });
      return;
    }

    if (pathname === '/api/auth/legacy-migrate') {
      calls.legacy += 1;
      recovered = true;
      await fulfillJson(route, { success: true });
      return;
    }

    await route.fallback();
  });

  return calls;
}

// Regression: AUTH-003 — a clean guest generated two expected 401 console errors on every page load.
// Found by /qa on 2026-07-20.
// Report: .gstack/qa-reports/auth-customer-qa-2026-07-20.md
test('clean guests get a normal session response and never attempt refresh', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'pixel-7', 'One browser covers guest bootstrap');

  await mockMobileStorefront(page, { wishlist: 'empty' });

  const directResponse = await page.request.get('/api/auth/session');
  expect(directResponse.status()).toBe(200);
  expect(await directResponse.json()).toEqual({
    authenticated: false,
    customer: null,
    code: 'NO_SESSION_COOKIE',
  });
  expect(directResponse.headers()['cache-control']).toContain('no-store');

  const authResponses: Array<{ pathname: string; status: number }> = [];
  const consoleErrors: string[] = [];
  page.on('response', (response) => {
    const pathname = new URL(response.url()).pathname;
    if (pathname === '/api/auth/session' || pathname === '/api/auth/refresh') {
      authResponses.push({ pathname, status: response.status() });
    }
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/en/login');
  await expect(page.locator('#auth-email')).toBeVisible();
  await expect.poll(() => authResponses.filter(({ pathname }) => pathname === '/api/auth/session').length).toBeGreaterThan(0);

  expect(authResponses.filter(({ pathname }) => pathname === '/api/auth/refresh')).toEqual([]);
  expect(authResponses.filter(({ pathname }) => pathname === '/api/auth/session').every(({ status }) => status === 200)).toBe(true);
  expect(consoleErrors.filter((message) => message.includes('401'))).toEqual([]);
});

test('an expired access session still recovers through its refresh cookie', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'pixel-7', 'One browser covers refresh recovery');

  await mockMobileStorefront(page, { wishlist: 'empty' });
  const calls = await installRecoverableSession(page, 'refresh');

  await page.goto('/en/login?returnTo=/wishlist');
  await expect(page).toHaveURL(/\/en\/wishlist$/);
  expect(calls).toEqual({ session: 2, refresh: 1, legacy: 0 });
});

test('a legacy browser token migrates from the new guest state without refresh noise', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'pixel-7', 'One browser covers legacy migration');

  await mockMobileStorefront(page, { wishlist: 'empty' });
  await page.addInitScript(() => {
    window.localStorage.setItem('grocery_auth_token', 'legacy-access-token');
    window.localStorage.setItem('grocery_refresh_token', 'legacy-refresh-token');
  });
  const calls = await installRecoverableSession(page, 'legacy');

  await page.goto('/en/login?returnTo=/wishlist');
  await expect(page).toHaveURL(/\/en\/wishlist$/);
  expect(calls).toEqual({ session: 2, refresh: 0, legacy: 1 });
  await expect.poll(() => page.evaluate(() => ({
    access: window.localStorage.getItem('grocery_auth_token'),
    refresh: window.localStorage.getItem('grocery_refresh_token'),
  }))).toEqual({ access: null, refresh: null });
});
