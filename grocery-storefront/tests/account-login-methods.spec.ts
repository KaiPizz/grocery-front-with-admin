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
    await expect(panel.getByText(scenario.labels.methods)).toBeVisible();
    await expect(panel.getByText('Google', { exact: true })).toBeVisible();
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
}
