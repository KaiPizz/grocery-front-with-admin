import { expect, test } from '@playwright/test';
import type { Page, Request, Route } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

interface Scenario {
  locale: 'pl' | 'en';
  mode: 'login' | 'register';
  project: 'pixel-7' | 'customer-account-desktop';
  viewport: 'mobile' | 'desktop';
  buttonLabel: string;
  emailDivider: string;
  failureMessage: string;
  verifyMessage: string;
}

const SCENARIOS: Scenario[] = [
  {
    locale: 'pl',
    mode: 'login',
    project: 'pixel-7',
    viewport: 'mobile',
    buttonLabel: 'Zaloguj się przez Facebooka',
    emailDivider: 'lub użyj adresu e-mail',
    failureMessage: 'Nie udało się zalogować przez Facebooka. Spróbuj ponownie.',
    verifyMessage: 'Konto zostało utworzone. Sprawdź skrzynkę odbiorczą, aby potwierdzić adres e-mail.',
  },
  {
    locale: 'en',
    mode: 'register',
    project: 'pixel-7',
    viewport: 'mobile',
    buttonLabel: 'Sign up with Facebook',
    emailDivider: 'or continue with email',
    failureMessage: 'Facebook sign-in failed. Please try again.',
    verifyMessage: 'Account created. Please check your inbox to verify your email address.',
  },
  {
    locale: 'pl',
    mode: 'register',
    project: 'customer-account-desktop',
    viewport: 'desktop',
    buttonLabel: 'Zarejestruj się przez Facebooka',
    emailDivider: 'lub użyj adresu e-mail',
    failureMessage: 'Nie udało się zalogować przez Facebooka. Spróbuj ponownie.',
    verifyMessage: 'Konto zostało utworzone. Sprawdź skrzynkę odbiorczą, aby potwierdzić adres e-mail.',
  },
  {
    locale: 'en',
    mode: 'login',
    project: 'customer-account-desktop',
    viewport: 'desktop',
    buttonLabel: 'Sign in with Facebook',
    emailDivider: 'or continue with email',
    failureMessage: 'Facebook sign-in failed. Please try again.',
    verifyMessage: 'Account created. Please check your inbox to verify your email address.',
  },
];

const SUCCESS_TOKEN_PREFIX = 'playwright-facebook-success';
const FAILURE_TOKEN_PREFIX = 'playwright-facebook-failure';

async function fulfillJson(route: Route, body: Record<string, unknown>, status: number): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installInitialGuestSession(page: Page): Promise<void> {
  await page.route('**/api/auth/session', async (route) => {
    await fulfillJson(route, {
      authenticated: false,
      customer: null,
      code: 'NO_ACCESS_COOKIE',
    }, 401);
  });
  await page.route('**/api/auth/refresh', async (route) => {
    await fulfillJson(route, { success: false, code: 'NO_REFRESH_COOKIE' }, 401);
  });
}

async function disableGoogle(page: Page): Promise<void> {
  await page.route('**/api/auth/google/start', async (route) => {
    await fulfillJson(route, { enabled: false }, 200);
  });
}

async function installFacebookSdkStub(
  page: Page,
  accessToken: string,
): Promise<{ requestCount: () => number; requestedUrls: () => string[] }> {
  let sdkRequests = 0;
  const sdkUrls: string[] = [];

  await page.addInitScript((token) => {
    (window as typeof window & { __playwrightFacebookToken?: string })
      .__playwrightFacebookToken = token;
  }, accessToken);

  await page.route('https://connect.facebook.net/**/sdk.js', async (route) => {
    sdkRequests += 1;
    sdkUrls.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `(() => {
        window.FB = {
          init(config) {
            window.__playwrightFacebookInit = {
              appId: config.appId,
              autoLogAppEvents: config.autoLogAppEvents,
              cookie: config.cookie,
              status: config.status,
              version: config.version,
              xfbml: config.xfbml,
            };
          },
          login(callback, options) {
            window.__playwrightFacebookLoginOptions = options;
            callback({
              status: 'connected',
              authResponse: { accessToken: window.__playwrightFacebookToken },
            });
          },
        };
      })();`,
    });
  });

  return {
    requestCount: () => sdkRequests,
    requestedUrls: () => [...sdkUrls],
  };
}

function authUrl(scenario: Scenario, returnTo?: string): string {
  const base = `/${scenario.locale}/${scenario.mode}`;
  return returnTo ? `${base}?returnTo=${encodeURIComponent(returnTo)}` : base;
}

function captureFacebookPosts(page: Page): Record<string, unknown>[] {
  const bodies: Record<string, unknown>[] = [];
  page.on('request', (request: Request) => {
    const url = new URL(request.url());
    if (request.method() !== 'POST' || url.pathname !== '/api/auth/facebook') return;
    bodies.push(JSON.parse(request.postData() ?? '{}') as Record<string, unknown>);
  });
  return bodies;
}

for (const scenario of SCENARIOS) {
  test(`${scenario.viewport} ${scenario.locale} ${scenario.mode}: click-gated Facebook BFF signs in without token/state leaks`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== scenario.project, `Covered by ${scenario.project}`);

    await mockMobileStorefront(page, { wishlist: 'empty' });
    await installInitialGuestSession(page);
    await disableGoogle(page);
    const providerToken = `${SUCCESS_TOKEN_PREFIX}-${scenario.locale}`;
    const sdk = await installFacebookSdkStub(page, providerToken);
    const facebookPosts = captureFacebookPosts(page);
    const browserLogs: string[] = [];
    page.on('console', (message) => browserLogs.push(message.text()));
    const returnTo = scenario.locale === 'en'
      ? '/en/wishlist?via=facebook'
      : '/wishlist?via=facebook';

    await page.goto(authUrl(scenario, returnTo));
    const facebookSection = page.getByTestId('facebook-auth-section');
    const facebookButton = facebookSection.getByRole('button', { name: scenario.buttonLabel });
    await expect(facebookButton).toBeVisible();
    await expect(page.getByTestId('social-auth-section').getByText(scenario.emailDivider)).toBeVisible();
    await expect(page.locator('#auth-email')).toBeVisible();

    // Privacy gate: provider infrastructure is untouched during render/config discovery.
    await page.waitForTimeout(250);
    expect(sdk.requestCount()).toBe(0);
    await expect(page.locator('script[data-facebook-customer-auth]')).toHaveCount(0);

    const [exchangeResponse] = await Promise.all([
      page.waitForResponse((response) => (
        response.request().method() === 'POST'
        && new URL(response.url()).pathname === '/api/auth/facebook'
      )),
      facebookButton.click(),
    ]);
    const exchangePayload = await exchangeResponse.json() as Record<string, unknown>;

    await expect(page).toHaveURL(new RegExp(`${returnTo.replace(/[?]/g, '\\?')}$`));
    await expect(page.getByText(scenario.verifyMessage)).toBeVisible();
    expect(sdk.requestCount()).toBe(1);
    expect(sdk.requestedUrls()[0]).toContain(scenario.locale === 'pl' ? '/pl_PL/' : '/en_US/');
    expect(exchangePayload.success).toBe(true);
    expect(JSON.stringify(exchangePayload)).not.toContain(providerToken);
    expect(JSON.stringify(exchangePayload)).not.toContain('playwright-facebook-http-only');

    expect(facebookPosts).toHaveLength(1);
    expect(Object.keys(facebookPosts[0]).sort()).toEqual(['accessToken', 'locale', 'state']);
    expect(facebookPosts[0].accessToken).toBe(providerToken);
    expect(facebookPosts[0].locale).toBe(scenario.locale);
    expect(facebookPosts[0].state).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const sdkState = await page.evaluate(() => ({
      init: (window as typeof window & {
        __playwrightFacebookInit?: Record<string, unknown>;
      }).__playwrightFacebookInit,
      login: (window as typeof window & {
        __playwrightFacebookLoginOptions?: Record<string, unknown>;
      }).__playwrightFacebookLoginOptions,
    }));
    expect(sdkState.init).toEqual({
      appId: '123456789012345',
      autoLogAppEvents: false,
      cookie: false,
      status: false,
      version: 'v25.0',
      xfbml: false,
    });
    expect(sdkState.login).toEqual({
      scope: 'public_profile,email',
      return_scopes: true,
    });

    const submittedState = String(facebookPosts[0].state);
    const browserState = await page.evaluate(({ token, state }) => ({
      href: window.location.href,
      visibleCookie: document.cookie,
      localValues: Object.values(window.localStorage),
      sessionValues: Object.values(window.sessionStorage),
      hasTokenInDom: document.documentElement.innerHTML.includes(token),
      hasStateInDom: document.documentElement.innerHTML.includes(state),
    }), { token: providerToken, state: submittedState });
    expect(browserState.href).not.toContain(providerToken);
    expect(browserState.href).not.toContain(submittedState);
    expect(browserState.visibleCookie).not.toContain(providerToken);
    expect(browserState.visibleCookie).not.toContain(submittedState);
    expect(browserState.localValues.join(' ')).not.toContain(providerToken);
    expect(browserState.localValues.join(' ')).not.toContain(submittedState);
    expect(browserState.sessionValues.join(' ')).not.toContain(providerToken);
    expect(browserState.sessionValues.join(' ')).not.toContain(submittedState);
    expect(browserState.hasTokenInDom).toBe(false);
    expect(browserState.hasStateInDom).toBe(false);
    expect(browserLogs.join(' ')).not.toContain(providerToken);
    expect(browserLogs.join(' ')).not.toContain(submittedState);

    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === 'grocery_customer_access')?.httpOnly).toBe(true);
    expect(cookies.find((cookie) => cookie.name === 'grocery_customer_refresh')?.httpOnly).toBe(true);
    expect(cookies.some((cookie) => cookie.name === 'grocery_facebook_oauth_state')).toBe(false);

    const replayStatus = await page.evaluate(async (body) => {
      const response = await fetch('/api/auth/facebook', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return response.status;
    }, facebookPosts[0]);
    expect(replayStatus).toBe(400);
  });

  test(`${scenario.viewport} ${scenario.locale} ${scenario.mode}: disabled/upstream-failed Facebook keeps email fallback usable`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== scenario.project, `Covered by ${scenario.project}`);

    await mockMobileStorefront(page, { wishlist: 'empty' });
    await installInitialGuestSession(page);
    await disableGoogle(page);
    const providerToken = `${FAILURE_TOKEN_PREFIX}-${scenario.locale}`;
    const sdk = await installFacebookSdkStub(page, providerToken);
    const facebookPosts = captureFacebookPosts(page);
    const disabledHandler = async (route: Route) => {
      await fulfillJson(route, { enabled: false }, 200);
    };
    await page.route('**/api/auth/facebook/start', disabledHandler);

    await page.goto(authUrl(scenario));
    await expect(page.getByTestId('facebook-auth-section')).toHaveCount(0);
    await expect(page.locator('#auth-email')).toBeVisible();
    expect(sdk.requestCount()).toBe(0);

    await page.unroute('**/api/auth/facebook/start', disabledHandler);
    await page.goto(authUrl(scenario));
    const facebookButton = page.getByTestId('facebook-auth-section')
      .getByRole('button', { name: scenario.buttonLabel });
    await expect(facebookButton).toBeVisible();
    expect(sdk.requestCount()).toBe(0);

    await facebookButton.click();
    await expect(page.getByTestId('facebook-auth-section').getByRole('alert'))
      .toHaveText(scenario.failureMessage);
    expect(facebookPosts).toHaveLength(1);
    expect(facebookPosts[0].accessToken).toBe(providerToken);
    expect(facebookPosts[0].locale).toBe(scenario.locale);
    expect(sdk.requestCount()).toBe(1);

    await expect.poll(async () => {
      const cookies = await page.context().cookies();
      return cookies.find((cookie) => cookie.name === 'grocery_facebook_oauth_state')?.value;
    }).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const refreshedCookies = await page.context().cookies();
    const refreshedState = refreshedCookies.find(
      (cookie) => cookie.name === 'grocery_facebook_oauth_state',
    );
    expect(refreshedState?.httpOnly).toBe(true);
    expect(refreshedState?.value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(refreshedState?.value).not.toBe(facebookPosts[0].state);

    const emailInput = page.locator('#auth-email');
    await emailInput.fill('fallback@example.test');
    await expect(emailInput).toHaveValue('fallback@example.test');
    await expect(emailInput).toBeVisible();
    await expect(page.locator('form button[type="submit"]')).toBeEnabled();
    await expect(page).not.toHaveURL(/playwright-facebook|oauth_state/);
  });
}
