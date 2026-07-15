import { expect, test } from '@playwright/test';
import type { BrowserContext, Page, Route } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

interface Scenario {
  locale: 'pl' | 'en';
  viewport: 'mobile' | 'desktop';
  project: 'pixel-7' | 'customer-account-desktop';
  labels: {
    security: string;
    dangerZone: string;
    retention: string;
    action: string;
    socialOnly: string;
    confirmationTitle: string;
    email: string;
    password: string;
    confirm: string;
    emailMismatch: string;
    failed: string;
    retryLater: string;
    temporarilyUnavailable: string;
  };
}

const ACCOUNT_EMAIL = 'delete-shopper@example.test';

const SCENARIOS: Scenario[] = [
  {
    locale: 'pl',
    viewport: 'mobile',
    project: 'pixel-7',
    labels: {
      security: 'Bezpieczeństwo',
      dangerZone: 'Strefa niebezpieczna',
      retention: 'Zapisane dane profilu i adresy zostaną usunięte lub zanonimizowane. Dokumentacja zamówień i księgowa wymagana prawem może zostać zachowana.',
      action: 'Usuń konto',
      socialOnly: 'Dodaj hasło za pomocą bezpiecznego procesu powyżej, zanim usuniesz to konto.',
      confirmationTitle: 'Potwierdź usunięcie konta',
      email: 'Adres e-mail konta',
      password: 'Aktualne hasło',
      confirm: 'Trwale usuń konto',
      emailMismatch: 'Wpisz adres e-mail dokładnie tak, jak pokazano powyżej.',
      failed: 'Nie udało się usunąć konta. Sprawdź hasło i spróbuj ponownie.',
      retryLater: 'Odczekaj chwilę przed ponowną próbą usunięcia konta.',
      temporarilyUnavailable: 'Usuwanie konta jest chwilowo niedostępne. Spróbuj ponownie później.',
    },
  },
  {
    locale: 'en',
    viewport: 'mobile',
    project: 'pixel-7',
    labels: {
      security: 'Security',
      dangerZone: 'Danger zone',
      retention: 'Your saved profile and address data will be removed or anonymized. Order and accounting records required by law may be retained.',
      action: 'Delete account',
      socialOnly: 'Add a password using the secure setup flow above before deleting this account.',
      confirmationTitle: 'Confirm account deletion',
      email: 'Account email',
      password: 'Current password',
      confirm: 'Permanently delete account',
      emailMismatch: 'Enter the email address exactly as shown above.',
      failed: 'We could not delete the account. Check your password and try again.',
      retryLater: 'Wait a moment before trying to delete the account again.',
      temporarilyUnavailable: 'Account deletion is temporarily unavailable. Try again later.',
    },
  },
  {
    locale: 'pl',
    viewport: 'desktop',
    project: 'customer-account-desktop',
    labels: {
      security: 'Bezpieczeństwo',
      dangerZone: 'Strefa niebezpieczna',
      retention: 'Zapisane dane profilu i adresy zostaną usunięte lub zanonimizowane. Dokumentacja zamówień i księgowa wymagana prawem może zostać zachowana.',
      action: 'Usuń konto',
      socialOnly: 'Dodaj hasło za pomocą bezpiecznego procesu powyżej, zanim usuniesz to konto.',
      confirmationTitle: 'Potwierdź usunięcie konta',
      email: 'Adres e-mail konta',
      password: 'Aktualne hasło',
      confirm: 'Trwale usuń konto',
      emailMismatch: 'Wpisz adres e-mail dokładnie tak, jak pokazano powyżej.',
      failed: 'Nie udało się usunąć konta. Sprawdź hasło i spróbuj ponownie.',
      retryLater: 'Odczekaj chwilę przed ponowną próbą usunięcia konta.',
      temporarilyUnavailable: 'Usuwanie konta jest chwilowo niedostępne. Spróbuj ponownie później.',
    },
  },
  {
    locale: 'en',
    viewport: 'desktop',
    project: 'customer-account-desktop',
    labels: {
      security: 'Security',
      dangerZone: 'Danger zone',
      retention: 'Your saved profile and address data will be removed or anonymized. Order and accounting records required by law may be retained.',
      action: 'Delete account',
      socialOnly: 'Add a password using the secure setup flow above before deleting this account.',
      confirmationTitle: 'Confirm account deletion',
      email: 'Account email',
      password: 'Current password',
      confirm: 'Permanently delete account',
      emailMismatch: 'Enter the email address exactly as shown above.',
      failed: 'We could not delete the account. Check your password and try again.',
      retryLater: 'Wait a moment before trying to delete the account again.',
      temporarilyUnavailable: 'Account deletion is temporarily unavailable. Try again later.',
    },
  },
];

async function fulfillJson(route: Route, body: Record<string, unknown>, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function setDeleteSessionCookies(context: BrowserContext) {
  await context.addCookies([
    {
      name: 'grocery_customer_access',
      value: 'playwright-delete-expired-access',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'grocery_customer_refresh',
      value: 'playwright-delete-refresh',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'grocery_token',
      value: 'legacy-delete-access',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'grocery_refresh_token',
      value: 'legacy-delete-refresh',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

async function persistedCustomerState(page: Page) {
  return page.evaluate(() => {
    const cart = JSON.parse(window.localStorage.getItem('grocery-cart') ?? '{}');
    const wishlist = JSON.parse(window.localStorage.getItem('grocery-wishlist') ?? '{}');
    return {
      cartId: cart.state?.cartId ?? null,
      wishlistIds: (wishlist.state?.guestItems ?? []).map((item: { productId: string }) => item.productId),
    };
  });
}

for (const scenario of SCENARIOS) {
  test(`${scenario.viewport} ${scenario.locale}: account deletion is confirmed, retried and cleared safely`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== scenario.project, `Covered by ${scenario.project}`);

    let hasPassword = false;
    let deleteRequests = 0;
    const authorizationLeaks: string[] = [];

    await mockMobileStorefront(page, { wishlist: 'empty' });
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('grocery-cart')) {
        window.localStorage.setItem('grocery-cart', JSON.stringify({
          state: { cartId: 'customer-delete-cart', metadataByMerchandiseId: {} },
          version: 1,
        }));
      }
      if (!window.localStorage.getItem('grocery-wishlist')) {
        window.localStorage.setItem('grocery-wishlist', JSON.stringify({
          state: {
            guestItems: [{ productId: 'customer-delete-wishlist-item', addedAt: '2026-07-15T00:00:00.000Z' }],
            pendingSyncProductIds: ['customer-delete-wishlist-item'],
          },
          version: 0,
        }));
      }
    });
    await page.route('**/api/auth/**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (request.headers().authorization) authorizationLeaks.push(pathname);

      if (pathname === '/api/auth/session') {
        if (!request.headers().cookie?.includes('grocery_customer_access=')) {
          await fulfillJson(route, {
            authenticated: false,
            customer: null,
            code: 'NO_ACCESS_COOKIE',
          }, 401);
          return;
        }
        await fulfillJson(route, {
          authenticated: true,
          customer: {
            id: 'delete-customer-1',
            email: ACCOUNT_EMAIL,
            fullName: 'Delete Shopper',
            phone: null,
            emailVerified: true,
            createdAt: '2026-07-15T00:00:00.000Z',
            hasPassword,
            linkedProviders: hasPassword ? ['password', 'google'] : ['google'],
          },
        });
        return;
      }

      if (pathname === '/api/auth/delete-account') {
        deleteRequests += 1;
        await route.fallback();
        return;
      }

      if (pathname === '/api/auth/refresh') {
        if (!request.headers().cookie?.includes('grocery_customer_refresh=')) {
          await fulfillJson(route, { success: false, code: 'NO_REFRESH_COOKIE' }, 401);
          return;
        }
        await route.fallback();
        return;
      }

      if (pathname === '/api/auth/legacy-migrate') {
        await fulfillJson(route, { success: false }, 401);
        return;
      }

      await route.fallback();
    });

    await setDeleteSessionCookies(page.context());
    await page.goto(`/${scenario.locale}/account#security`);
    await page.getByRole('tab', { name: scenario.labels.security }).click();

    const panel = page.locator('#panel-security');
    await expect(panel.getByRole('heading', { name: scenario.labels.dangerZone })).toBeVisible();
    await expect(panel.getByText(scenario.labels.retention)).toBeVisible();
    await expect(panel.getByText(scenario.labels.socialOnly)).toBeVisible();
    await expect(panel.getByRole('button', { name: scenario.labels.action })).toHaveCount(0);

    hasPassword = true;
    await page.reload();
    await page.getByRole('tab', { name: scenario.labels.security }).click();
    const passwordPanel = page.locator('#panel-security');
    const action = passwordPanel.getByRole('button', { name: scenario.labels.action, exact: true });
    await expect(action).toBeVisible();
    const actionBox = await action.boundingBox();
    expect(actionBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await action.click();

    const confirmation = passwordPanel.locator('#delete-account-confirmation');
    await expect(confirmation.getByRole('heading', { name: scenario.labels.confirmationTitle })).toBeVisible();
    await confirmation.getByLabel(scenario.labels.email, { exact: true }).fill('wrong@example.test');
    await confirmation.getByLabel(scenario.labels.password, { exact: true }).fill('not-sent-password');
    await confirmation.getByRole('button', { name: scenario.labels.confirm }).click();
    await expect(confirmation.getByRole('alert')).toContainText(scenario.labels.emailMismatch);
    expect(deleteRequests).toBe(0);

    const stateBeforeFailedDeletion = await persistedCustomerState(page);
    await confirmation.getByLabel(scenario.labels.email, { exact: true }).fill(ACCOUNT_EMAIL.toUpperCase());
    await confirmation.getByLabel(scenario.labels.password, { exact: true }).fill('disconnect-after-refresh-delete-password');
    const unavailableResponsePromise = page.waitForResponse((response) => (
      new URL(response.url()).pathname === '/api/auth/delete-account'
      && response.request().method() === 'POST'
    ));
    await confirmation.getByRole('button', { name: scenario.labels.confirm }).click();
    expect((await unavailableResponsePromise).status()).toBe(502);
    await expect(confirmation.getByRole('alert')).toContainText(scenario.labels.temporarilyUnavailable);
    expect(deleteRequests).toBe(1);
    expect(await persistedCustomerState(page)).toEqual(stateBeforeFailedDeletion);
    const cookiesAfterTransientFailure = await page.context().cookies();
    expect(cookiesAfterTransientFailure.find((cookie) => cookie.name === 'grocery_customer_access')?.value).toBe('playwright-delete-renewed-access');
    expect(cookiesAfterTransientFailure.find((cookie) => cookie.name === 'grocery_customer_refresh')?.value).toBe('playwright-delete-renewed-refresh');

    await confirmation.getByLabel(scenario.labels.password, { exact: true }).fill('wrong-delete-password');
    await confirmation.getByRole('button', { name: scenario.labels.confirm }).click();
    await expect(confirmation.getByRole('alert')).toContainText(scenario.labels.failed);
    expect(deleteRequests).toBe(2);
    expect(await persistedCustomerState(page)).toEqual(stateBeforeFailedDeletion);
    const renewedCookies = await page.context().cookies();
    expect(renewedCookies.find((cookie) => cookie.name === 'grocery_customer_access')?.value).toBe('playwright-delete-renewed-access');
    expect(renewedCookies.find((cookie) => cookie.name === 'grocery_customer_refresh')?.value).toBe('playwright-delete-renewed-refresh');

    await confirmation.getByLabel(scenario.labels.password, { exact: true }).fill('rate-limited-by-status-delete-password');
    const statusRateLimitedResponsePromise = page.waitForResponse((response) => (
      new URL(response.url()).pathname === '/api/auth/delete-account'
      && response.request().method() === 'POST'
    ));
    await confirmation.getByRole('button', { name: scenario.labels.confirm }).click();
    expect((await statusRateLimitedResponsePromise).status()).toBe(429);
    await expect(confirmation.getByRole('alert')).toContainText(scenario.labels.retryLater);
    expect(deleteRequests).toBe(3);
    expect(await persistedCustomerState(page)).toEqual(stateBeforeFailedDeletion);

    await confirmation.getByLabel(scenario.labels.password, { exact: true }).fill('rate-limited-by-code-delete-password');
    const codeRateLimitedResponsePromise = page.waitForResponse((response) => (
      new URL(response.url()).pathname === '/api/auth/delete-account'
      && response.request().method() === 'POST'
    ));
    await confirmation.getByRole('button', { name: scenario.labels.confirm }).click();
    expect((await codeRateLimitedResponsePromise).status()).toBe(429);
    await expect(confirmation.getByRole('alert')).toContainText(scenario.labels.retryLater);
    expect(deleteRequests).toBe(4);
    expect(await persistedCustomerState(page)).toEqual(stateBeforeFailedDeletion);

    await confirmation.getByLabel(scenario.labels.password, { exact: true }).fill('rate-limited-by-http-delete-password');
    const httpRateLimitedResponsePromise = page.waitForResponse((response) => (
      new URL(response.url()).pathname === '/api/auth/delete-account'
      && response.request().method() === 'POST'
    ));
    await confirmation.getByRole('button', { name: scenario.labels.confirm }).click();
    expect((await httpRateLimitedResponsePromise).status()).toBe(429);
    await expect(confirmation.getByRole('alert')).toContainText(scenario.labels.retryLater);
    expect(deleteRequests).toBe(5);
    expect(await persistedCustomerState(page)).toEqual(stateBeforeFailedDeletion);

    await confirmation.getByLabel(scenario.labels.password, { exact: true }).fill('correct-delete-password');
    const expectedHomePath = scenario.locale === 'pl' ? '/' : '/en';
    const homeDocumentPromise = page.waitForRequest((request) => (
      request.resourceType() === 'document'
      && new URL(request.url()).pathname === expectedHomePath
    ));
    await confirmation.getByRole('button', { name: scenario.labels.confirm }).click();
    await homeDocumentPromise;
    await expect.poll(() => new URL(page.url()).pathname).toBe(expectedHomePath);
    expect(deleteRequests).toBe(6);
    expect((await page.context().cookies()).filter((cookie) => [
      'grocery_customer_access',
      'grocery_customer_refresh',
      'grocery_token',
      'grocery_refresh_token',
    ].includes(cookie.name))).toEqual([]);
    await expect.poll(() => persistedCustomerState(page)).toEqual({ cartId: null, wishlistIds: [] });

    const browserState = await page.evaluate(() => ({
      localStorage: { ...window.localStorage },
      sessionStorage: { ...window.sessionStorage },
      readableCookies: document.cookie,
    }));
    const serializedBrowserState = JSON.stringify(browserState);
    expect(serializedBrowserState).not.toContain('wrong-delete-password');
    expect(serializedBrowserState).not.toContain('correct-delete-password');
    expect(serializedBrowserState).not.toContain(ACCOUNT_EMAIL.toUpperCase());
    expect(browserState.readableCookies).not.toContain('grocery_customer_');
    expect(authorizationLeaks).toEqual([]);
  });
}
