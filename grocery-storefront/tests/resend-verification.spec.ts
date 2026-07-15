import { expect, test } from '@playwright/test';
import type { BrowserContext, Page, Route } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

interface Scenario {
  locale: 'pl' | 'en';
  viewport: 'mobile' | 'desktop';
  project: 'pixel-7' | 'customer-account-desktop';
  labels: {
    title: string;
    action: string;
    sent: string;
  };
}

const SCENARIOS: Scenario[] = [
  {
    locale: 'pl',
    viewport: 'mobile',
    project: 'pixel-7',
    labels: {
      title: 'Potwierdź adres e-mail',
      action: 'Wyślij nowy link weryfikacyjny',
      sent: 'Nowy link weryfikacyjny został wysłany. Sprawdź skrzynkę odbiorczą i folder spam.',
    },
  },
  {
    locale: 'en',
    viewport: 'mobile',
    project: 'pixel-7',
    labels: {
      title: 'Verify your email address',
      action: 'Send a new verification link',
      sent: 'A new verification link has been sent. Check your inbox and spam folder.',
    },
  },
  {
    locale: 'pl',
    viewport: 'desktop',
    project: 'customer-account-desktop',
    labels: {
      title: 'Potwierdź adres e-mail',
      action: 'Wyślij nowy link weryfikacyjny',
      sent: 'Nowy link weryfikacyjny został wysłany. Sprawdź skrzynkę odbiorczą i folder spam.',
    },
  },
  {
    locale: 'en',
    viewport: 'desktop',
    project: 'customer-account-desktop',
    labels: {
      title: 'Verify your email address',
      action: 'Send a new verification link',
      sent: 'A new verification link has been sent. Check your inbox and spam folder.',
    },
  },
];

async function fulfillJson(
  route: Route,
  body: Record<string, unknown>,
  status = 200,
) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function setAuthCookies(
  context: BrowserContext,
  accessToken: string,
  refreshToken: string,
) {
  await context.addCookies([
    {
      name: 'grocery_customer_access',
      value: accessToken,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
    {
      name: 'grocery_customer_refresh',
      value: refreshToken,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

async function installUnverifiedSession(page: Page) {
  await mockMobileStorefront(page, { wishlist: 'empty' });
  await page.route('**/api/auth/session', async (route) => {
    await fulfillJson(route, {
      authenticated: true,
      customer: {
        id: 'unverified-customer-1',
        email: 'unverified@example.test',
        fullName: 'Unverified Shopper',
        phone: null,
        emailVerified: false,
        createdAt: '2026-07-15T00:00:00.000Z',
      },
    });
  });
}

for (const scenario of SCENARIOS) {
  test(`${scenario.viewport} ${scenario.locale}: resend verification stays in the authenticated BFF`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== scenario.project,
      `Covered by ${scenario.project}`,
    );

    await setAuthCookies(
      page.context(),
      'playwright-resend-access',
      'playwright-resend-refresh',
    );
    await installUnverifiedSession(page);

    const requestBodies: Array<Record<string, unknown>> = [];
    const authorizationHeaders: Array<string | undefined> = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname !== '/api/auth/resend-verification')
        return;
      requestBodies.push(
        JSON.parse(request.postData() ?? '{}') as Record<string, unknown>,
      );
      authorizationHeaders.push(request.headers().authorization);
    });

    await page.goto(`/${scenario.locale}/account`);
    await expect(
      page.getByRole('heading', { name: scenario.labels.title }),
    ).toBeVisible();
    const responsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === '/api/auth/resend-verification',
    );
    const verificationBanner = page
      .getByRole('heading', { name: scenario.labels.title })
      .locator('xpath=ancestor::section');
    const action = verificationBanner.getByRole('button');
    await expect(action).toHaveAccessibleName(scenario.labels.action);
    await action.click();
    const response = await responsePromise;

    await expect(page.getByText(scenario.labels.sent, { exact: true })).toBeVisible();
    await expect(action).toBeDisabled();
    expect(requestBodies).toEqual([{ locale: scenario.locale }]);
    expect(authorizationHeaders).toEqual([undefined]);
    expect(response.status()).toBe(200);

    const cookies = await page.context().cookies();
    const authCookies = cookies.filter((cookie) =>
      cookie.name.startsWith('grocery_customer_'),
    );
    expect(authCookies).toHaveLength(2);
    expect(authCookies.every((cookie) => cookie.httpOnly)).toBe(true);
    const browserState = await page.evaluate(() => ({
      local: Object.values(window.localStorage),
      session: Object.values(window.sessionStorage),
      readableCookies: document.cookie,
    }));
    expect(JSON.stringify(browserState)).not.toContain('playwright-resend');
    expect(browserState.readableCookies).not.toContain('grocery_customer_');
  });
}

test('expired access is renewed server-side before resend without exposing either token', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'customer-account-desktop',
    'One desktop project covers refresh plumbing',
  );

  await setAuthCookies(
    page.context(),
    'playwright-resend-expired-access',
    'playwright-resend-refresh',
  );
  await installUnverifiedSession(page);

  await page.goto('/en/account');
  const responsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === '/api/auth/resend-verification',
  );
  await page
    .getByRole('button', { name: 'Send a new verification link' })
    .click();
  const response = await responsePromise;
  await expect(
    page.getByText(
      'A new verification link has been sent. Check your inbox and spam folder.',
      { exact: true },
    ),
  ).toBeVisible();

  expect(response.status()).toBe(200);
  const cookies = await page.context().cookies();
  const access = cookies.find(
    (cookie) => cookie.name === 'grocery_customer_access',
  );
  const refresh = cookies.find(
    (cookie) => cookie.name === 'grocery_customer_refresh',
  );
  expect(access).toMatchObject({
    value: 'playwright-resend-renewed-access',
    httpOnly: true,
  });
  expect(refresh).toMatchObject({
    value: 'playwright-resend-renewed-refresh',
    httpOnly: true,
  });
  const browserRequest = await response.request().allHeaders();
  expect(browserRequest.authorization).toBeUndefined();
});
