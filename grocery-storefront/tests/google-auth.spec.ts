import { expect, test } from '@playwright/test';
import type { Page, Request, Route } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

interface Scenario {
  locale: 'pl' | 'en';
  mode: 'login' | 'register';
  project: 'google-auth-iphone-webkit' | 'pixel-7' | 'customer-account-desktop';
  viewport: 'mobile' | 'mobile-webkit' | 'desktop';
  emailLabel: string;
  emailDivider: string;
  googleFailure: string;
}

const SUCCESS_CREDENTIAL = 'playwright-google-success-credential';
const FAILURE_CREDENTIAL = 'playwright-google-failure-credential';

const SCENARIOS: Scenario[] = [
  {
    locale: 'en',
    mode: 'login',
    project: 'google-auth-iphone-webkit',
    viewport: 'mobile-webkit',
    emailLabel: 'Email',
    emailDivider: 'or continue with email',
    googleFailure: 'Google sign-in failed. Please try again.',
  },
  {
    locale: 'pl',
    mode: 'login',
    project: 'pixel-7',
    viewport: 'mobile',
    emailLabel: 'E-mail',
    emailDivider: 'lub użyj adresu e-mail',
    googleFailure: 'Nie udało się zalogować przez Google. Spróbuj ponownie.',
  },
  {
    locale: 'en',
    mode: 'register',
    project: 'pixel-7',
    viewport: 'mobile',
    emailLabel: 'Email',
    emailDivider: 'or continue with email',
    googleFailure: 'Google sign-in failed. Please try again.',
  },
  {
    locale: 'pl',
    mode: 'register',
    project: 'customer-account-desktop',
    viewport: 'desktop',
    emailLabel: 'E-mail',
    emailDivider: 'lub użyj adresu e-mail',
    googleFailure: 'Nie udało się zalogować przez Google. Spróbuj ponownie.',
  },
  {
    locale: 'en',
    mode: 'login',
    project: 'customer-account-desktop',
    viewport: 'desktop',
    emailLabel: 'Email',
    emailDivider: 'or continue with email',
    googleFailure: 'Google sign-in failed. Please try again.',
  },
];

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

async function installEnabledTrackingRefresh(page: Page): Promise<void> {
  await page.route('**/api/config/**', async (route) => {
    const upstream = await route.fetch();
    const envelope = await upstream.json() as {
      config: {
        branding: { colors: Record<string, string> };
        tracking: Record<string, unknown>;
      };
    };
    envelope.config.branding.colors.primary = '#2457d6';
    envelope.config.tracking = {
      facebookPixel: { enabled: true, pixelId: 'tracking-policy-test' },
      googleAnalytics: { enabled: true, measurementId: 'G-TRACKINGPOLICY' },
      googleTagManager: { enabled: true, containerId: 'GTM-TRACKINGPOLICY' },
      hotjar: { enabled: true, siteId: '123456' },
    };
    await route.fulfill({
      response: upstream,
      contentType: 'application/json',
      body: JSON.stringify(envelope),
    });
  });
  await page.route('https://connect.facebook.net/**', async (route) => route.abort());
  await page.route('https://www.googletagmanager.com/**', async (route) => route.abort());
  await page.route('https://static.hotjar.com/**', async (route) => route.abort());
}

async function expectAuthTrackersAbsent(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(() => (
    document.documentElement.style.getPropertyValue('--color-primary')
  ))).toBe('#2457d6');
  await expect(page.locator('script#fb-pixel')).toHaveCount(0);
  await expect(page.locator('script#ga4-init')).toHaveCount(0);
  await expect(page.locator('script#gtm-init')).toHaveCount(0);
  await expect(page.locator('script#hotjar-init')).toHaveCount(0);
  await expect(page.locator('script[src*="googletagmanager.com"]')).toHaveCount(0);
}

async function installGoogleIdentityStub(page: Page, credential: string): Promise<void> {
  await page.addInitScript((value) => {
    (window as typeof window & { __playwrightGoogleCredential?: string }).__playwrightGoogleCredential = value;
  }, credential);

  await page.route('https://accounts.google.com/gsi/client?hl=*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `(() => {
        const scriptUrl = new URL(document.currentScript.src);
        window.__playwrightGoogleLocale = scriptUrl.searchParams.get('hl');
        let currentConfig = null;
        window.google = {
          accounts: {
            id: {
              initialize(config) {
                currentConfig = config;
                window.__playwrightGoogleInit = {
                  autoSelect: config.auto_select,
                  hasNonce: typeof config.nonce === 'string' && config.nonce.length === 43,
                  context: config.context,
                };
              },
              renderButton(parent, options) {
                const button = document.createElement('button');
                button.type = 'button';
                button.dataset.testid = 'google-gis-stub';
                button.setAttribute('aria-label', options.text === 'signup_with' ? 'Google sign up' : 'Google sign in');
                button.style.width = options.width + 'px';
                button.style.height = '44px';
                button.textContent = options.text === 'signup_with' ? 'Google sign up' : 'Google sign in';
                button.addEventListener('click', () => {
                  currentConfig.callback({ credential: window.__playwrightGoogleCredential });
                });
                parent.appendChild(button);
              },
              cancel() {},
            },
          },
        };
      })();`,
    });
  });
}

function authUrl(scenario: Scenario, returnTo?: string): string {
  const base = `/${scenario.locale}/${scenario.mode}`;
  return returnTo ? `${base}?returnTo=${encodeURIComponent(returnTo)}` : base;
}

function captureGooglePosts(page: Page): Record<string, unknown>[] {
  const bodies: Record<string, unknown>[] = [];
  page.on('request', (request: Request) => {
    const url = new URL(request.url());
    if (request.method() !== 'POST' || url.pathname !== '/api/auth/google') return;
    bodies.push(JSON.parse(request.postData() ?? '{}') as Record<string, unknown>);
  });
  return bodies;
}

for (const scenario of SCENARIOS) {
  test(`${scenario.viewport} ${scenario.locale} ${scenario.mode}: Google BFF signs in without exposing credentials`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== scenario.project, `Covered by ${scenario.project}`);

    await mockMobileStorefront(page, { wishlist: 'empty' });
    await installInitialGuestSession(page);
    await installEnabledTrackingRefresh(page);
    await installGoogleIdentityStub(page, SUCCESS_CREDENTIAL);
    const googlePosts = captureGooglePosts(page);
    const returnTo = scenario.locale === 'en'
      ? '/en/wishlist?via=google'
      : '/wishlist?via=google';

    await page.goto(authUrl(scenario, returnTo));
    const googleSection = page.getByTestId('google-auth-section');
    await expect(googleSection).toBeVisible();
    await expect(page.getByTestId('social-auth-section').getByText(scenario.emailDivider)).toBeVisible();
    await expectAuthTrackersAbsent(page);

    const googleButton = page.getByTestId('google-gis-stub');
    await expect(googleButton).toBeVisible();
    const buttonBox = await googleButton.boundingBox();
    expect(buttonBox?.width ?? 0).toBeGreaterThanOrEqual(200);
    expect(buttonBox?.width ?? Infinity).toBeLessThanOrEqual(400);
    await expect(page.locator('#auth-email')).toBeVisible();

    const gisState = await page.evaluate(() => ({
      locale: (window as typeof window & { __playwrightGoogleLocale?: string }).__playwrightGoogleLocale,
      init: (window as typeof window & {
        __playwrightGoogleInit?: { autoSelect: boolean; hasNonce: boolean; context: string };
      }).__playwrightGoogleInit,
    }));
    expect(gisState.locale).toBe(scenario.locale);
    expect(gisState.init).toEqual({
      autoSelect: false,
      hasNonce: true,
      context: scenario.mode === 'login' ? 'signin' : 'signup',
    });

    await googleButton.click();
    await expect(page).toHaveURL(new RegExp(`${returnTo.replace(/[?]/g, '\\?')}$`));
    expect(googlePosts[0]).toEqual({ credential: SUCCESS_CREDENTIAL });

    const browserState = await page.evaluate((providerCredential) => ({
      href: window.location.href,
      visibleCookie: document.cookie,
      localValues: Object.values(window.localStorage),
      sessionValues: Object.values(window.sessionStorage),
      localCredential: Object.values(window.localStorage).includes(providerCredential),
      sessionCredential: Object.values(window.sessionStorage).includes(providerCredential),
    }), SUCCESS_CREDENTIAL);
    expect(browserState.href).not.toContain(SUCCESS_CREDENTIAL);
    expect(browserState.href).not.toContain('nonce');
    expect(browserState.visibleCookie).not.toContain('grocery_customer_');
    expect(browserState.localCredential).toBe(false);
    expect(browserState.sessionCredential).toBe(false);
    expect(browserState.localValues.join(' ')).not.toContain(SUCCESS_CREDENTIAL);
    expect(browserState.sessionValues.join(' ')).not.toContain(SUCCESS_CREDENTIAL);
    expect(browserState.localValues.join(' ')).not.toContain('playwright-http-only-access');
    expect(browserState.sessionValues.join(' ')).not.toContain('playwright-http-only-access');

    const cookies = await page.context().cookies();
    expect(cookies.find((cookie) => cookie.name === 'grocery_customer_access')?.httpOnly).toBe(true);
    expect(cookies.find((cookie) => cookie.name === 'grocery_customer_refresh')?.httpOnly).toBe(true);
    expect(cookies.some((cookie) => cookie.name === 'grocery_google_oauth_nonce')).toBe(false);

    const replayStatus = await page.evaluate(async (providerCredential) => {
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: providerCredential }),
      });
      return response.status;
    }, SUCCESS_CREDENTIAL);
    expect(replayStatus).toBe(400);
  });

  test(`${scenario.viewport} ${scenario.locale} ${scenario.mode}: disabled/failed Google keeps email fallback usable`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== scenario.project, `Covered by ${scenario.project}`);

    await mockMobileStorefront(page, { wishlist: 'empty' });
    await installInitialGuestSession(page);
    await installEnabledTrackingRefresh(page);
    await installGoogleIdentityStub(page, FAILURE_CREDENTIAL);
    const googlePosts = captureGooglePosts(page);
    const disabledHandler = async (route: Route) => {
      await fulfillJson(route, { enabled: false }, 200);
    };
    await page.route('**/api/auth/google/start', disabledHandler);

    await page.goto(authUrl(scenario));
    await expect(page.getByTestId('google-auth-section')).toHaveCount(0);
    await expect(page.locator('#auth-email')).toBeVisible();
    await expectAuthTrackersAbsent(page);

    await page.unroute('**/api/auth/google/start', disabledHandler);
    await page.goto(authUrl(scenario));
    const googleButton = page.getByTestId('google-gis-stub');
    await expect(googleButton).toBeVisible();
    await googleButton.click();
    await expect(page.getByTestId('google-auth-section').getByRole('alert')).toHaveText(scenario.googleFailure);
    expect(googlePosts[0]).toEqual({ credential: FAILURE_CREDENTIAL });

    const emailInput = page.locator('#auth-email');
    await emailInput.fill('fallback@example.test');
    await expect(emailInput).toHaveValue('fallback@example.test');
    await expect(page.locator('form button[type="submit"]')).toBeEnabled();
    await expect(page).not.toHaveURL(/playwright-google|nonce/);
  });
}

test('desktop EN: leaving a trackable route reloads into private/auth pages without trackers', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'customer-account-desktop', 'Covered by customer-account-desktop');

  await mockMobileStorefront(page, { wishlist: 'empty' });
  await installInitialGuestSession(page);
  await installEnabledTrackingRefresh(page);
  await installGoogleIdentityStub(page, SUCCESS_CREDENTIAL);

  await page.goto('/en/products');
  await expect.poll(async () => page.evaluate(() => typeof (
    window as typeof window & { fbq?: unknown }
  ).fbq)).toBe('function');
  await expect(page.locator('script#fb-pixel')).toHaveCount(1);
  await page.evaluate(() => {
    (window as typeof window & { __sensitiveNavigationMarker?: boolean }).__sensitiveNavigationMarker = true;
  });

  const wishlistLink = page.locator('a[href="/en/wishlist"]:visible').first();
  await expect(wishlistLink).toBeVisible();
  await wishlistLink.click();
  await expect(page).toHaveURL(/\/en\/wishlist$/);
  await expect(page.locator('#main-content')).toBeVisible();
  expect(await page.evaluate(() => (
    window as typeof window & { __sensitiveNavigationMarker?: boolean }
  ).__sensitiveNavigationMarker)).toBeUndefined();
  await expectAuthTrackersAbsent(page);

  await page.goto('/en/products');
  await expect.poll(async () => page.evaluate(() => typeof (
    window as typeof window & { fbq?: unknown }
  ).fbq)).toBe('function');
  await page.evaluate(() => {
    (window as typeof window & { __sensitiveNavigationMarker?: boolean }).__sensitiveNavigationMarker = true;
  });

  const loginLink = page.locator('a[href="/en/login"]').first();
  await expect(loginLink).toBeVisible();
  await loginLink.click();

  await expect(page).toHaveURL(/\/en\/login$/);
  await expect(page.locator('#auth-email')).toBeVisible();
  const cleanDocument = await page.evaluate(() => {
    const testWindow = window as typeof window & {
      __sensitiveNavigationMarker?: boolean;
      fbq?: unknown;
      dataLayer?: unknown;
      hj?: unknown;
      _hjSettings?: unknown;
    };
    return {
      marker: testWindow.__sensitiveNavigationMarker,
      fbq: typeof testWindow.fbq,
      dataLayer: typeof testWindow.dataLayer,
      hotjar: typeof testWindow.hj,
      hotjarSettings: typeof testWindow._hjSettings,
    };
  });
  expect(cleanDocument).toEqual({
    marker: undefined,
    fbq: 'undefined',
    dataLayer: 'undefined',
    hotjar: 'undefined',
    hotjarSettings: 'undefined',
  });
  await expectAuthTrackersAbsent(page);
});
