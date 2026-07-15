import { expect, test } from '@playwright/test';
import type { BrowserContext, Page, Route } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

interface Labels {
  email: string;
  forgotLink: string;
  forgotTitle: string;
  forgotButton: string;
  forgotSent: string;
  newPassword: string;
  confirmPassword: string;
  resetButton: string;
  resetSuccess: string;
  verifySuccess: string;
  accountTitle: string;
  securityTab: string;
  currentPassword: string;
  confirmNewPassword: string;
  changeButton: string;
  changeFailed: string;
  loginTitle: string;
}

interface Scenario {
  locale: 'pl' | 'en';
  viewport: 'mobile' | 'desktop';
  project: 'pixel-7' | 'customer-account-desktop';
  labels: Labels;
}

interface PasswordFlowState {
  authenticated: boolean;
  forgotBodies: Array<Record<string, unknown>>;
  resetBodies: Array<Record<string, unknown>>;
  changeBodies: Array<Record<string, unknown>>;
  verifyBodies: Array<Record<string, unknown>>;
  registerBodies: Array<Record<string, unknown>>;
  authorizationLeaks: string[];
}

const SCENARIOS: Scenario[] = [
  {
    locale: 'pl',
    viewport: 'mobile',
    project: 'pixel-7',
    labels: {
      email: 'E-mail',
      forgotLink: 'Nie pamiętasz hasła?',
      forgotTitle: 'Nie pamiętasz hasła?',
      forgotButton: 'Wyślij link',
      forgotSent: 'Jeśli konto z tym adresem e-mail istnieje, wysłaliśmy link do zmiany hasła.',
      newPassword: 'Nowe hasło',
      confirmPassword: 'Potwierdź hasło',
      resetButton: 'Zmień hasło',
      resetSuccess: 'Hasło zostało zmienione. Zaloguj się ponownie na tym urządzeniu.',
      verifySuccess: 'Adres e-mail został potwierdzony. Ze względów bezpieczeństwa ustaw nowe hasło przed logowaniem.',
      accountTitle: 'Moje konto',
      securityTab: 'Bezpieczeństwo',
      currentPassword: 'Aktualne hasło',
      confirmNewPassword: 'Potwierdź nowe hasło',
      changeButton: 'Zmień hasło',
      changeFailed: 'Nie udało się zmienić hasła. Sprawdź aktualne hasło i spróbuj ponownie.',
      loginTitle: 'Witaj ponownie',
    },
  },
  {
    locale: 'en',
    viewport: 'mobile',
    project: 'pixel-7',
    labels: {
      email: 'Email',
      forgotLink: 'Forgot your password?',
      forgotTitle: 'Forgot your password?',
      forgotButton: 'Send reset link',
      forgotSent: 'If an account exists for this email, we sent a password reset link.',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      resetButton: 'Change password',
      resetSuccess: 'Your password has been changed. Sign in again on this device.',
      verifySuccess: 'Your email is verified. For security, choose a new password before signing in.',
      accountTitle: 'My account',
      securityTab: 'Security',
      currentPassword: 'Current password',
      confirmNewPassword: 'Confirm new password',
      changeButton: 'Change password',
      changeFailed: 'Could not change password. Check your current password and try again.',
      loginTitle: 'Welcome back',
    },
  },
  {
    locale: 'pl',
    viewport: 'desktop',
    project: 'customer-account-desktop',
    labels: {
      email: 'E-mail',
      forgotLink: 'Nie pamiętasz hasła?',
      forgotTitle: 'Nie pamiętasz hasła?',
      forgotButton: 'Wyślij link',
      forgotSent: 'Jeśli konto z tym adresem e-mail istnieje, wysłaliśmy link do zmiany hasła.',
      newPassword: 'Nowe hasło',
      confirmPassword: 'Potwierdź hasło',
      resetButton: 'Zmień hasło',
      resetSuccess: 'Hasło zostało zmienione. Zaloguj się ponownie na tym urządzeniu.',
      verifySuccess: 'Adres e-mail został potwierdzony. Ze względów bezpieczeństwa ustaw nowe hasło przed logowaniem.',
      accountTitle: 'Moje konto',
      securityTab: 'Bezpieczeństwo',
      currentPassword: 'Aktualne hasło',
      confirmNewPassword: 'Potwierdź nowe hasło',
      changeButton: 'Zmień hasło',
      changeFailed: 'Nie udało się zmienić hasła. Sprawdź aktualne hasło i spróbuj ponownie.',
      loginTitle: 'Witaj ponownie',
    },
  },
  {
    locale: 'en',
    viewport: 'desktop',
    project: 'customer-account-desktop',
    labels: {
      email: 'Email',
      forgotLink: 'Forgot your password?',
      forgotTitle: 'Forgot your password?',
      forgotButton: 'Send reset link',
      forgotSent: 'If an account exists for this email, we sent a password reset link.',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      resetButton: 'Change password',
      resetSuccess: 'Your password has been changed. Sign in again on this device.',
      verifySuccess: 'Your email is verified. For security, choose a new password before signing in.',
      accountTitle: 'My account',
      securityTab: 'Security',
      currentPassword: 'Current password',
      confirmNewPassword: 'Confirm new password',
      changeButton: 'Change password',
      changeFailed: 'Could not change password. Check your current password and try again.',
      loginTitle: 'Welcome back',
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

async function setSessionCookies(context: BrowserContext) {
  await context.addCookies([
    {
      name: 'grocery_customer_access',
      value: 'opaque-access-session',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'grocery_customer_refresh',
      value: 'opaque-refresh-session',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

async function clearSessionCookies(context: BrowserContext) {
  await context.clearCookies({ name: 'grocery_customer_access' });
  await context.clearCookies({ name: 'grocery_customer_refresh' });
}

async function installPasswordApi(page: Page, state: PasswordFlowState) {
  await mockMobileStorefront(page, { wishlist: 'empty' });

  await page.route('**/api/auth/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const authorization = request.headers().authorization;
    if (authorization) state.authorizationLeaks.push(pathname);

    if (pathname === '/api/auth/session') {
      await fulfillJson(route, state.authenticated
        ? {
            authenticated: true,
            customer: {
              id: 'password-customer-1',
              email: 'shopper@example.test',
              fullName: 'Password Shopper',
              phone: '+48111111111',
              createdAt: '2026-01-10T10:00:00.000Z',
              hasPassword: true,
              linkedProviders: ['password'],
            },
          }
        : { authenticated: false, customer: null }, state.authenticated ? 200 : 401);
      return;
    }

    if (pathname === '/api/auth/register') {
      const body = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      state.registerBodies.push(body);
      state.authenticated = true;
      await fulfillJson(route, {
        success: true,
        message: null,
        customer: {
          id: 'registered-customer-1',
          email: body.email,
          fullName: body.fullName,
          phone: null,
          createdAt: '2026-07-15T00:00:00.000Z',
          hasPassword: true,
          linkedProviders: ['password'],
        },
        errors: [],
      });
      return;
    }

    if (pathname === '/api/auth/refresh') {
      await fulfillJson(route, state.authenticated
        ? { success: true }
        : { success: false, code: 'NO_REFRESH_COOKIE' }, state.authenticated ? 200 : 401);
      return;
    }

    if (pathname === '/api/auth/legacy-migrate') {
      await fulfillJson(route, { success: false }, 401);
      return;
    }

    if (pathname === '/api/auth/forgot-password') {
      state.forgotBodies.push(JSON.parse(request.postData() ?? '{}') as Record<string, unknown>);
      await fulfillJson(route, { success: true, message: 'Enumeration-safe response.' });
      return;
    }

    if (pathname === '/api/auth/reset-password') {
      state.resetBodies.push(JSON.parse(request.postData() ?? '{}') as Record<string, unknown>);
      state.authenticated = false;
      await clearSessionCookies(page.context());
      await fulfillJson(route, { success: true, message: null, errors: [] });
      return;
    }

    if (pathname === '/api/auth/verify-email') {
      state.verifyBodies.push(JSON.parse(request.postData() ?? '{}') as Record<string, unknown>);
      await fulfillJson(route, { success: true, message: null, requiresPasswordReset: true });
      return;
    }

    if (pathname === '/api/auth/change-password') {
      const body = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      state.changeBodies.push(body);
      if (body.currentPassword !== 'correct-current-password') {
        await fulfillJson(route, {
          success: false,
          message: 'Backend current password mismatch.',
          errors: [{ field: 'currentPassword', message: 'Mismatch' }],
        }, 400);
        return;
      }

      state.authenticated = false;
      await clearSessionCookies(page.context());
      await fulfillJson(route, { success: true, message: null, errors: [] });
      return;
    }

    await route.fallback();
  });
}

for (const scenario of SCENARIOS) {
  test(`${scenario.viewport} ${scenario.locale}: forgot, reset and change password stay BFF-only`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== scenario.project, `Covered by ${scenario.project}`);

    const state: PasswordFlowState = {
      authenticated: false,
      forgotBodies: [],
      resetBodies: [],
      changeBodies: [],
      verifyBodies: [],
      registerBodies: [],
      authorizationLeaks: [],
    };
    await installPasswordApi(page, state);

    await page.goto(`/${scenario.locale}/login`);
    await page.getByRole('link', { name: scenario.labels.forgotLink }).click();
    await expect(page.getByRole('heading', { name: scenario.labels.forgotTitle })).toBeVisible();
    await page.getByLabel(scenario.labels.email, { exact: true }).fill('shopper@example.test');
    await page.getByRole('button', { name: scenario.labels.forgotButton }).click();
    await expect(page.getByText(scenario.labels.forgotSent)).toBeVisible();
    expect(state.forgotBodies).toEqual([{ email: 'shopper@example.test', locale: scenario.locale }]);

    const verificationToken = 'one-time-verification-token';
    await page.goto(`/${scenario.locale}/verify-email#token=${verificationToken}`);
    await expect.poll(() => new URL(page.url()).hash).toBe('');
    await expect(page.getByText(scenario.labels.verifySuccess)).toBeVisible();
    expect(state.verifyBodies).toEqual([{ token: verificationToken }]);

    await setSessionCookies(page.context());
    const resetToken = 'one-time-reset-token';
    const resetUrl = scenario.viewport === 'mobile'
      ? `/${scenario.locale}/reset-password#token=${resetToken}`
      : `/${scenario.locale}/reset-password?token=${encodeURIComponent(resetToken)}`;
    await page.goto(resetUrl);
    await expect.poll(() => new URL(page.url()).hash).toBe('');
    await expect.poll(() => new URL(page.url()).searchParams.has('token')).toBe(false);
    await page.getByLabel(scenario.labels.newPassword, { exact: true }).fill('new-password-123');
    await page.getByLabel(scenario.labels.confirmPassword, { exact: true }).fill('new-password-123');
    await page.getByRole('button', { name: scenario.labels.resetButton }).click();
    await expect(page.getByText(scenario.labels.resetSuccess)).toBeVisible();
    expect(state.resetBodies).toEqual([{ token: resetToken, newPassword: 'new-password-123' }]);
    expect((await page.context().cookies()).filter((cookie) => cookie.name.startsWith('grocery_customer_'))).toEqual([]);

    state.authenticated = true;
    await setSessionCookies(page.context());
    await page.goto(`/${scenario.locale}/account#security`);
    await expect(page.getByRole('heading', { name: scenario.labels.accountTitle })).toBeVisible();
    await page.getByRole('tab', { name: scenario.labels.securityTab }).click();
    await page.getByLabel(scenario.labels.currentPassword, { exact: true }).fill('wrong-current-password');
    await page.getByLabel(scenario.labels.newPassword, { exact: true }).fill('new-password-456');
    await page.getByLabel(scenario.labels.confirmNewPassword, { exact: true }).fill('new-password-456');
    await page.getByRole('button', { name: scenario.labels.changeButton }).click();
    await expect(page.locator('#panel-security').getByRole('alert')).toContainText(scenario.labels.changeFailed);

    await page.getByLabel(scenario.labels.currentPassword, { exact: true }).fill('correct-current-password');
    await page.getByRole('button', { name: scenario.labels.changeButton }).click();
    await expect(page).toHaveURL(/\/login\?returnTo=/);
    await expect(page.getByRole('heading', { name: scenario.labels.loginTitle })).toBeVisible();
    expect(state.changeBodies).toEqual([
      { currentPassword: 'wrong-current-password', newPassword: 'new-password-456' },
      { currentPassword: 'correct-current-password', newPassword: 'new-password-456' },
    ]);
    expect((await page.context().cookies()).filter((cookie) => cookie.name.startsWith('grocery_customer_'))).toEqual([]);

    const browserSecrets = await page.evaluate(() => ({
      local: Object.values(window.localStorage),
      session: Object.values(window.sessionStorage),
      readableCookies: document.cookie,
    }));
    expect(JSON.stringify(browserSecrets)).not.toContain('new-password-123');
    expect(JSON.stringify(browserSecrets)).not.toContain('new-password-456');
    expect(browserSecrets.readableCookies).not.toContain('grocery_customer_');
    expect(state.authorizationLeaks).toEqual([]);
  });
}

test('English registration forwards the page locale through the browser BFF request', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'customer-account-desktop', 'One browser project covers request plumbing');

  const state: PasswordFlowState = {
    authenticated: false,
    forgotBodies: [],
    resetBodies: [],
    changeBodies: [],
    verifyBodies: [],
    registerBodies: [],
    authorizationLeaks: [],
  };
  await installPasswordApi(page, state);

  await page.goto('/en/register');
  await page.locator('#auth-full-name').fill('English Shopper');
  await page.locator('#auth-email').fill('english-shopper@example.test');
  await page.locator('#auth-register-password').fill('strong-password-123');
  await page.locator('#auth-confirm-password').fill('strong-password-123');
  await page.locator('form button[type="submit"]').click();

  await expect.poll(() => state.registerBodies).toEqual([{
    fullName: 'English Shopper',
    email: 'english-shopper@example.test',
    password: 'strong-password-123',
    locale: 'en',
  }]);
});

test('guest and transient startup preserve persisted state while rejected credentials clear it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'customer-account-desktop', 'One browser project covers persistence semantics');

  await mockMobileStorefront(page, { wishlist: 'empty' });
  await page.route('**/api/graphql*', async (route) => {
    const query = route.request().postData() ?? '';
    if (query.includes('query GetCart')) {
      await fulfillJson(route, {
        data: null,
        errors: [{ message: 'Cart service temporarily unavailable.' }],
      });
      return;
    }
    await route.fallback();
  });
  let sessionMode: 'missing' | 'transient' | 'invalid' = 'missing';

  await page.route('**/api/auth/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/session') {
      await fulfillJson(
        route,
        sessionMode === 'missing'
          ? { authenticated: false, customer: null, code: 'NO_ACCESS_COOKIE' }
          : { authenticated: false, customer: null },
        sessionMode === 'transient' ? 502 : 401,
      );
      return;
    }
    if (pathname === '/api/auth/refresh') {
      await fulfillJson(route, { success: false, code: 'NO_REFRESH_COOKIE' }, 401);
      return;
    }
    if (pathname === '/api/auth/legacy-migrate') {
      await fulfillJson(route, { success: false }, 401);
      return;
    }
    await route.fallback();
  });

  await page.addInitScript(() => {
    if (window.localStorage.getItem('customer-state-seeded')) return;
    window.localStorage.setItem('customer-state-seeded', '1');
    window.localStorage.setItem('grocery-cart', JSON.stringify({
      state: { cartId: 'previous-customer-cart', metadataByMerchandiseId: {} },
      version: 1,
    }));
    window.localStorage.setItem('grocery-wishlist', JSON.stringify({
      state: {
        guestItems: [{ productId: 'previous-customer-product', addedAt: '2026-01-01T00:00:00.000Z' }],
        pendingSyncProductIds: ['previous-customer-product'],
      },
      version: 0,
    }));
  });

  const persistedCustomerState = () => page.evaluate(() => {
    const cart = JSON.parse(window.localStorage.getItem('grocery-cart') ?? '{}');
    const wishlist = JSON.parse(window.localStorage.getItem('grocery-wishlist') ?? '{}');
    return {
      cartId: cart.state?.cartId ?? null,
      wishlistIds: (wishlist.state?.guestItems ?? []).map((item: { productId: string }) => item.productId),
    };
  });

  await page.goto('/en/login');
  await expect.poll(persistedCustomerState).toEqual({
    cartId: 'previous-customer-cart',
    wishlistIds: ['previous-customer-product'],
  });

  sessionMode = 'transient';
  await page.reload();
  await expect.poll(persistedCustomerState).toEqual({
    cartId: 'previous-customer-cart',
    wishlistIds: ['previous-customer-product'],
  });

  sessionMode = 'invalid';
  await page.reload();
  await expect.poll(persistedCustomerState).toEqual({ cartId: null, wishlistIds: [] });
});
