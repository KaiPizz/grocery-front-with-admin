import { expect, test } from '@playwright/test';
import type { BrowserContext, Page, Route } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

interface Scenario {
  locale: 'pl' | 'en';
  project: 'pixel-7' | 'customer-account-desktop';
  viewport: 'mobile' | 'desktop';
  labels: {
    security: string;
    methods: string;
    currentPassword: string;
    setupAction: string;
    setupSent: string;
    verifyFirst: string;
    providerPassword: string;
    disconnect: string;
    confirmDisconnect: string;
    connectFacebook: string;
  };
}

const SCENARIOS: Scenario[] = [
  {
    locale: 'pl',
    project: 'pixel-7',
    viewport: 'mobile',
    labels: {
      security: 'Bezpieczeństwo',
      methods: 'Metody logowania',
      currentPassword: 'Aktualne hasło',
      setupAction: 'Wyślij link do ustawienia hasła',
      setupSent: 'Link został wysłany. Sprawdź skrzynkę odbiorczą i spam, aby utworzyć hasło.',
      verifyFirst: 'Przed utworzeniem hasła potwierdź adres e-mail za pomocą banera powyżej.',
      providerPassword: 'Aktualne hasło do zmiany metod logowania',
      disconnect: 'Odłącz',
      confirmDisconnect: 'Odłącz i wyloguj',
      connectFacebook: 'Połącz Facebook',
    },
  },
  {
    locale: 'en',
    project: 'pixel-7',
    viewport: 'mobile',
    labels: {
      security: 'Security',
      methods: 'Sign-in methods',
      currentPassword: 'Current password',
      setupAction: 'Send password setup link',
      setupSent: 'Link sent. Check your inbox and spam folder to create a password.',
      verifyFirst: 'Verify your email using the banner above before creating a password.',
      providerPassword: 'Current password for sign-in changes',
      disconnect: 'Disconnect',
      confirmDisconnect: 'Disconnect and sign out',
      connectFacebook: 'Connect Facebook',
    },
  },
  {
    locale: 'pl',
    project: 'customer-account-desktop',
    viewport: 'desktop',
    labels: {
      security: 'Bezpieczeństwo',
      methods: 'Metody logowania',
      currentPassword: 'Aktualne hasło',
      setupAction: 'Wyślij link do ustawienia hasła',
      setupSent: 'Link został wysłany. Sprawdź skrzynkę odbiorczą i spam, aby utworzyć hasło.',
      verifyFirst: 'Przed utworzeniem hasła potwierdź adres e-mail za pomocą banera powyżej.',
      providerPassword: 'Aktualne hasło do zmiany metod logowania',
      disconnect: 'Odłącz',
      confirmDisconnect: 'Odłącz i wyloguj',
      connectFacebook: 'Połącz Facebook',
    },
  },
  {
    locale: 'en',
    project: 'customer-account-desktop',
    viewport: 'desktop',
    labels: {
      security: 'Security',
      methods: 'Sign-in methods',
      currentPassword: 'Current password',
      setupAction: 'Send password setup link',
      setupSent: 'Link sent. Check your inbox and spam folder to create a password.',
      verifyFirst: 'Verify your email using the banner above before creating a password.',
      providerPassword: 'Current password for sign-in changes',
      disconnect: 'Disconnect',
      confirmDisconnect: 'Disconnect and sign out',
      connectFacebook: 'Connect Facebook',
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
      value: 'opaque-account-capability-session',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'grocery_customer_refresh',
      value: 'opaque-account-capability-refresh',
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

for (const scenario of SCENARIOS) {
  test(`${scenario.viewport} ${scenario.locale}: social-only password setup requires verified email`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== scenario.project, `Covered by ${scenario.project}`);

    let provider: 'google' | 'facebook' = 'google';
    const forgotBodies: Array<Record<string, unknown>> = [];
    const authorizationLeaks: string[] = [];

    await mockMobileStorefront(page, { wishlist: 'empty' });
    await page.route('**/api/auth/**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (request.headers().authorization) authorizationLeaks.push(pathname);

      if (pathname === '/api/auth/session') {
        const isGoogle = provider === 'google';
        await fulfillJson(route, {
          authenticated: true,
          customer: {
            id: `${provider}-customer-1`,
            email: `${provider}-shopper@example.test`,
            fullName: `${isGoogle ? 'Google' : 'Facebook'} Shopper`,
            phone: null,
            emailVerified: isGoogle,
            createdAt: '2026-07-15T00:00:00.000Z',
            hasPassword: false,
            linkedProviders: [provider],
          },
        });
        return;
      }

      if (pathname === '/api/auth/forgot-password') {
        forgotBodies.push(JSON.parse(request.postData() ?? '{}') as Record<string, unknown>);
        await fulfillJson(route, {
          success: true,
          message: 'Enumeration-safe response.',
        });
        return;
      }

      if (pathname === '/api/auth/refresh') {
        await fulfillJson(route, { success: true });
        return;
      }

      await route.fallback();
    });

    await setSessionCookies(page.context());
    await page.goto(`/${scenario.locale}/account#security`);
    await page.getByRole('tab', { name: scenario.labels.security }).click();

    const panel = page.locator('#panel-security');
    await expect(panel.getByRole('heading', { name: scenario.labels.methods, exact: true })).toBeVisible();
    await expect(panel.getByText('Google', { exact: true })).toBeVisible();
    await expect(panel.getByRole('button', { name: scenario.labels.disconnect })).toBeDisabled();
    await expect(panel.getByLabel(scenario.labels.currentPassword, { exact: true })).toHaveCount(0);

    const setupButton = panel.getByRole('button', {
      name: scenario.labels.setupAction,
    });
    await expect(setupButton).toBeVisible();
    const setupButtonBox = await setupButton.boundingBox();
    expect(setupButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await setupButton.click();
    await expect(panel.getByRole('status')).toContainText(scenario.labels.setupSent);
    expect(forgotBodies).toEqual([
      {
        email: 'google-shopper@example.test',
        locale: scenario.locale,
      },
    ]);

    provider = 'facebook';
    await page.reload();
    await page.getByRole('tab', { name: scenario.labels.security }).click();
    const reloadedPanel = page.locator('#panel-security');
    await expect(reloadedPanel.getByText('Facebook', { exact: true })).toBeVisible();
    await expect(reloadedPanel.getByText(scenario.labels.verifyFirst)).toBeVisible();
    await expect(
      reloadedPanel.getByLabel(scenario.labels.currentPassword, {
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(reloadedPanel.getByRole('button', { name: scenario.labels.setupAction })).toHaveCount(0);
    expect(forgotBodies).toHaveLength(1);

    const browserState = await page.evaluate(() => ({
      localStorage: { ...window.localStorage },
      sessionStorage: { ...window.sessionStorage },
      readableCookies: document.cookie,
    }));
    const serializedBrowserState = JSON.stringify(browserState);
    expect(serializedBrowserState).not.toContain('opaque-account-capability');
    expect(browserState.readableCookies).not.toContain('grocery_customer_');
    expect(authorizationLeaks).toEqual([]);
  });

  test(`${scenario.viewport} ${scenario.locale}: password-confirmed provider disconnect revokes the browser session`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== scenario.project, `Covered by ${scenario.project}`);

    const unlinkBodies: Array<Record<string, unknown>> = [];
    const authorizationLeaks: string[] = [];
    let googleLinkStarts = 0;

    await mockMobileStorefront(page, { wishlist: 'empty' });
    await page.route('**/api/auth/**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (request.headers().authorization) authorizationLeaks.push(pathname);

      if (pathname === '/api/auth/session') {
        await fulfillJson(route, {
          authenticated: true,
          customer: {
            id: 'provider-management-customer-1',
            email: 'provider-manager@example.test',
            fullName: 'Provider Manager',
            phone: null,
            emailVerified: true,
            createdAt: '2026-07-15T00:00:00.000Z',
            hasPassword: true,
            linkedProviders: ['password', 'facebook'],
          },
        });
        return;
      }

      if (pathname === '/api/auth/provider/unlink') {
        unlinkBodies.push(JSON.parse(request.postData() ?? '{}') as Record<string, unknown>);
        await fulfillJson(route, {
          success: true,
          message: 'Provider disconnected and sessions revoked.',
        });
        return;
      }

      if (pathname === '/api/auth/google/link/start') {
        googleLinkStarts += 1;
        await fulfillJson(route, { enabled: false });
        return;
      }

      if (pathname === '/api/auth/refresh') {
        await fulfillJson(route, { success: true });
        return;
      }

      await route.fallback();
    });

    await setSessionCookies(page.context());
    await page.goto(`/${scenario.locale}/account#security`);
    await page.getByRole('tab', { name: scenario.labels.security }).click();

    const panel = page.locator('#panel-security');
    const passwordInput = panel.getByLabel(scenario.labels.providerPassword, { exact: true });
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('correct-provider-password');
    await expect.poll(() => googleLinkStarts).toBe(1);
    await page.waitForTimeout(200);
    expect(googleLinkStarts).toBe(1);

    const disconnectButton = panel.getByRole('button', { name: scenario.labels.disconnect });
    await expect(disconnectButton).toBeEnabled();
    const disconnectButtonBox = await disconnectButton.boundingBox();
    expect(disconnectButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await disconnectButton.click();

    const confirmButton = panel.getByRole('button', { name: scenario.labels.confirmDisconnect });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    await expect(page).toHaveURL(/\/login\?returnTo=%2Faccount%23security$/);
    expect(unlinkBodies).toEqual([{
      provider: 'facebook',
      currentPassword: 'correct-provider-password',
    }]);
    expect(authorizationLeaks).toEqual([]);

    const browserState = await page.evaluate(() => ({
      localStorage: { ...window.localStorage },
      sessionStorage: { ...window.sessionStorage },
      readableCookies: document.cookie,
    }));
    expect(JSON.stringify(browserState)).not.toContain('opaque-account-capability');
    expect(browserState.readableCookies).not.toContain('grocery_customer_');
  });

  test(`${scenario.viewport} ${scenario.locale}: Facebook link is click-gated and revokes the browser session`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== scenario.project, `Covered by ${scenario.project}`);

    const facebookToken = `provider-link-facebook-${scenario.locale}`;
    const linkBodies: Array<Record<string, unknown>> = [];
    const authorizationLeaks: string[] = [];
    const browserLogs: string[] = [];
    let facebookSdkRequests = 0;

    page.on('console', (message) => browserLogs.push(message.text()));
    page.on('request', (request) => {
      const pathname = new URL(request.url()).pathname;
      if (request.method() === 'POST' && pathname === '/api/auth/facebook/link') {
        linkBodies.push(JSON.parse(request.postData() ?? '{}') as Record<string, unknown>);
      }
    });
    await page.route('https://connect.facebook.net/**/sdk.js', async (route) => {
      facebookSdkRequests += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `(() => {
          window.FB = {
            init() {},
            login(callback) {
              callback({
                status: 'connected',
                authResponse: { accessToken: '${facebookToken}' },
              });
            },
          };
        })();`,
      });
    });

    await mockMobileStorefront(page, { wishlist: 'empty' });
    await page.route('**/api/auth/**', async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      if (request.headers().authorization) authorizationLeaks.push(pathname);

      if (pathname === '/api/auth/session') {
        await fulfillJson(route, {
          authenticated: true,
          customer: {
            id: 'provider-link-customer-1',
            email: 'provider-linker@example.test',
            fullName: 'Provider Linker',
            phone: null,
            emailVerified: true,
            createdAt: '2026-07-15T00:00:00.000Z',
            hasPassword: true,
            linkedProviders: ['password'],
          },
        });
        return;
      }

      if (pathname === '/api/auth/google/link/start') {
        await fulfillJson(route, { enabled: false });
        return;
      }

      if (pathname === '/api/auth/refresh') {
        await fulfillJson(route, { success: true });
        return;
      }

      await route.fallback();
    });

    await setSessionCookies(page.context());
    await page.goto(`/${scenario.locale}/account#security`);
    await page.getByRole('tab', { name: scenario.labels.security }).click();
    const panel = page.locator('#panel-security');
    await panel.getByLabel(scenario.labels.providerPassword, { exact: true }).fill('correct-link-password');

    const connectButton = panel.getByRole('button', { name: scenario.labels.connectFacebook });
    await expect(connectButton).toBeEnabled();
    const connectButtonBox = await connectButton.boundingBox();
    expect(connectButtonBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(facebookSdkRequests).toBe(0);
    await expect(page.locator('script[data-facebook-customer-link]')).toHaveCount(0);

    await connectButton.click();
    await expect(page).toHaveURL(/\/login\?returnTo=%2Faccount%23security$/);
    expect(facebookSdkRequests).toBe(1);
    expect(linkBodies).toHaveLength(1);
    expect(linkBodies[0]).toEqual({
      accessToken: facebookToken,
      currentPassword: 'correct-link-password',
      state: linkBodies[0].state,
    });
    expect(linkBodies[0].state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(authorizationLeaks).toEqual([]);
    expect(browserLogs.join('\n')).not.toContain(facebookToken);

    const browserState = await page.evaluate(() => ({
      localStorage: { ...window.localStorage },
      sessionStorage: { ...window.sessionStorage },
      readableCookies: document.cookie,
    }));
    expect(JSON.stringify(browserState)).not.toContain(facebookToken);
    expect(JSON.stringify(browserState)).not.toContain('opaque-account-capability');
    expect(browserState.readableCookies).not.toContain('grocery_customer_');
    const remainingAuthCookies = (await page.context().cookies()).filter((cookie) => (
      cookie.name.startsWith('grocery_customer_')
      || cookie.name.startsWith('grocery_facebook_link_')
    ));
    expect(remainingAuthCookies).toEqual([]);
  });
}
