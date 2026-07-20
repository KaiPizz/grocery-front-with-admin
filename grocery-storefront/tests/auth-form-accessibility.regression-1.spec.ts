import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

async function fulfillJson(route: Route, body: Record<string, unknown>, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installGuestAuth(page: Page, registerRequests: string[]) {
  await mockMobileStorefront(page, { wishlist: 'empty' });
  await page.route('**/api/auth/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/api/auth/session') {
      await fulfillJson(route, {
        authenticated: false,
        customer: null,
        code: 'NO_ACCESS_COOKIE',
      }, 401);
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

    if (pathname === '/api/auth/login') {
      await fulfillJson(route, { success: false, message: null, errors: [] }, 401);
      return;
    }

    if (pathname === '/api/auth/register') {
      registerRequests.push(request.postData() ?? '');
      await fulfillJson(route, {
        success: false,
        message: null,
        errors: [{ field: 'input.email', message: 'Email already exists.', code: 'EMAIL_IN_USE' }],
      }, 400);
      return;
    }

    await route.fallback();
  });
}

// Regression: ISSUE-007 — login and registration errors were not linked to their fields.
// Found by /qa on 2026-07-20.
// Report: .gstack/qa-reports/qa-report-asiandeligo-eshoper-pro-2026-07-20.md
test('auth errors are announced, linked to invalid fields and move focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'pixel-7', 'One mobile browser covers the accessibility contract');

  const registerRequests: string[] = [];
  await installGuestAuth(page, registerRequests);

  await page.goto('/en/login');
  const email = page.locator('#auth-email');
  const password = page.locator('#auth-login-password');
  await email.fill('shopper@example.test');
  await password.fill('wrong-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();

  const authError = page.locator('#auth-form-error');
  await expect(authError).toHaveAttribute('role', 'alert');
  await expect(authError).toHaveText('Invalid credentials.');
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(email).toHaveAttribute('aria-describedby', 'auth-form-error');
  await expect(password).toHaveAttribute('aria-invalid', 'true');
  await expect(password).toHaveAttribute('aria-describedby', 'auth-password-hint auth-form-error');

  await page.goto('/en/register');
  await page.locator('#auth-full-name').fill('Accessibility Shopper');
  await page.locator('#auth-email').fill('accessibility@example.test');
  await page.locator('#auth-phone').fill('abc');
  await page.locator('#auth-register-password').fill('strong-password-123');
  await page.locator('#auth-confirm-password').fill('strong-password-123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  const phone = page.locator('#auth-phone');
  await expect(page.locator('#auth-form-error')).toContainText('Enter a valid Polish or international phone number');
  await expect(phone).toBeFocused();
  await expect(phone).toHaveAttribute('aria-invalid', 'true');
  await expect(phone).toHaveAttribute('aria-describedby', 'auth-form-error');
  expect(registerRequests).toEqual([]);

  await phone.fill('+48 123 456 789');
  await page.locator('#auth-confirm-password').fill('different-password-123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  const confirmPassword = page.locator('#auth-confirm-password');
  await expect(page.locator('#auth-form-error')).toHaveText('Passwords do not match');
  await expect(confirmPassword).toBeFocused();
  await expect(confirmPassword).toHaveAttribute('aria-invalid', 'true');
  await expect(confirmPassword).toHaveAttribute('aria-describedby', 'auth-form-error');
  expect(registerRequests).toEqual([]);

  await confirmPassword.fill('strong-password-123');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();

  const registerEmail = page.locator('#auth-email');
  await expect(page.locator('#auth-form-error')).toHaveText('Could not create account.');
  await expect(registerEmail).toBeFocused();
  await expect(registerEmail).toHaveAttribute('aria-invalid', 'true');
  await expect(registerEmail).toHaveAttribute('aria-describedby', 'auth-form-error');
  expect(registerRequests).toHaveLength(1);
});
