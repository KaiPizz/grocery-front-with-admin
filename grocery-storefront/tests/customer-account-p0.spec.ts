import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

interface AddressFixture {
  id: string;
  label: string | null;
  isDefault: boolean;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

interface ScenarioLabels {
  email: string;
  password: string;
  login: string;
  invalidLogin: string;
  accountTitle: string;
  profileTab: string;
  addressesTab: string;
  ordersTab: string;
  addAddress: string;
  editAddress: string;
  saveAddress: string;
  setDefault: string;
  deleteAddress: string;
  addressFailure: string;
  profileUpdated: string;
  viewDetails: string;
  orderNotFound: string;
}

interface Scenario {
  locale: 'en' | 'pl';
  viewport: 'mobile' | 'desktop';
  project: 'pixel-7' | 'customer-account-desktop';
  labels: ScenarioLabels;
}

interface GraphqlRequestBody {
  query?: string;
  variables?: Record<string, unknown>;
}

interface MockState {
  authenticated: boolean;
  addresses: AddressFixture[];
  createAttempts: number;
  protectedRequests: number;
  browserAuthorizationLeaks: string[];
  channelFailures: string[];
  orderListVariables: Array<Record<string, unknown>>;
  orderDetailVariables: Array<Record<string, unknown>>;
}

const ORDER_CREATED = '2026-07-14T12:00:00.000Z';
const PROTECTED_OPERATIONS = new Set([
  'CustomerProfile',
  'UpdateProfile',
  'CustomerAddresses',
  'CreateAddress',
  'UpdateAddress',
  'SetDefaultAddress',
  'DeleteAddress',
  'CustomerOrders',
  'OrderDetail',
]);
const CHANNEL_SCOPED_OPERATIONS = new Set(['CustomerOrders', 'OrderDetail']);

const SCENARIOS: Scenario[] = [
  {
    locale: 'pl',
    viewport: 'mobile',
    project: 'pixel-7',
    labels: {
      email: 'E-mail',
      password: 'Hasło',
      login: 'Zaloguj się',
      invalidLogin: 'Nieprawidłowe dane logowania.',
      accountTitle: 'Moje konto',
      profileTab: 'Profil',
      addressesTab: 'Adresy',
      ordersTab: 'Zamówienia',
      addAddress: 'Dodaj adres',
      editAddress: 'Edytuj',
      saveAddress: 'Zapisz adres',
      setDefault: 'Ustaw jako domyślny',
      deleteAddress: 'Usuń',
      addressFailure: 'Nie udało się zapisać adresu.',
      profileUpdated: 'Profil został zaktualizowany.',
      viewDetails: 'Zobacz szczegóły',
      orderNotFound: 'Nie znaleziono zamówienia.',
    },
  },
  {
    locale: 'en',
    viewport: 'mobile',
    project: 'pixel-7',
    labels: {
      email: 'Email',
      password: 'Password',
      login: 'Sign in',
      invalidLogin: 'Invalid credentials.',
      accountTitle: 'My account',
      profileTab: 'Profile',
      addressesTab: 'Addresses',
      ordersTab: 'Orders',
      addAddress: 'Add address',
      editAddress: 'Edit',
      saveAddress: 'Save address',
      setDefault: 'Set as default',
      deleteAddress: 'Delete',
      addressFailure: 'Failed to save address.',
      profileUpdated: 'Profile updated successfully.',
      viewDetails: 'View details',
      orderNotFound: 'Order not found.',
    },
  },
  {
    locale: 'pl',
    viewport: 'desktop',
    project: 'customer-account-desktop',
    labels: {
      email: 'E-mail',
      password: 'Hasło',
      login: 'Zaloguj się',
      invalidLogin: 'Nieprawidłowe dane logowania.',
      accountTitle: 'Moje konto',
      profileTab: 'Profil',
      addressesTab: 'Adresy',
      ordersTab: 'Zamówienia',
      addAddress: 'Dodaj adres',
      editAddress: 'Edytuj',
      saveAddress: 'Zapisz adres',
      setDefault: 'Ustaw jako domyślny',
      deleteAddress: 'Usuń',
      addressFailure: 'Nie udało się zapisać adresu.',
      profileUpdated: 'Profil został zaktualizowany.',
      viewDetails: 'Zobacz szczegóły',
      orderNotFound: 'Nie znaleziono zamówienia.',
    },
  },
  {
    locale: 'en',
    viewport: 'desktop',
    project: 'customer-account-desktop',
    labels: {
      email: 'Email',
      password: 'Password',
      login: 'Sign in',
      invalidLogin: 'Invalid credentials.',
      accountTitle: 'My account',
      profileTab: 'Profile',
      addressesTab: 'Addresses',
      ordersTab: 'Orders',
      addAddress: 'Add address',
      editAddress: 'Edit',
      saveAddress: 'Save address',
      setDefault: 'Set as default',
      deleteAddress: 'Delete',
      addressFailure: 'Failed to save address.',
      profileUpdated: 'Profile updated successfully.',
      viewDetails: 'View details',
      orderNotFound: 'Order not found.',
    },
  },
];

function readInput(variables: Record<string, unknown>): Record<string, unknown> {
  const input = variables.input;
  return input && typeof input === 'object' ? input as Record<string, unknown> : {};
}

async function fulfill(route: Route, data: Record<string, unknown>): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ data }),
  });
}

async function fulfillJson(route: Route, body: Record<string, unknown>, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function fulfillGraphqlError(
  route: Route,
  message: string,
  code: 'UNAUTHENTICATED' | 'BAD_USER_INPUT',
): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      data: null,
      errors: [{ message, extensions: { code } }],
    }),
  });
}

function readOperationName(query: string): string | null {
  return query.match(/\b(?:query|mutation)\s+([A-Za-z_][A-Za-z0-9_]*)/)?.[1] ?? null;
}

async function installCustomerAccountApi(
  page: Page,
  scenario: Scenario,
  state: MockState,
): Promise<void> {
  await mockMobileStorefront(page, { wishlist: 'empty' });

  await page.route('**/api/auth/**', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;

    if (pathname === '/api/auth/session') {
      await fulfillJson(
        route,
        state.authenticated
          ? {
              authenticated: true,
              customer: {
                id: 'customer-account-1',
                email: 'shopper@example.test',
                fullName: 'Test Shopper',
                phone: '+48111111111',
                createdAt: '2026-01-10T10:00:00.000Z',
              },
            }
          : { authenticated: false, customer: null },
        state.authenticated ? 200 : 401,
      );
      return;
    }

    if (pathname === '/api/auth/refresh') {
      await fulfillJson(
        route,
        state.authenticated
          ? { success: true }
          : { success: false, code: 'NO_REFRESH_COOKIE' },
        state.authenticated ? 200 : 401,
      );
      return;
    }

    if (pathname === '/api/auth/legacy-migrate') {
      await fulfillJson(route, { success: false }, 401);
      return;
    }

    if (pathname === '/api/auth/login') {
      const input = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      const valid = input.password === 'correct-password';
      state.authenticated = valid;

      if (valid) {
        await page.context().addCookies([{
          name: 'grocery_customer_access',
          value: 'opaque-test-session',
          domain: '127.0.0.1',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        }]);
      }

      await fulfillJson(route, valid
        ? {
            success: true,
            message: null,
            customer: {
              id: 'customer-account-1',
              email: 'shopper@example.test',
              fullName: 'Test Shopper',
              phone: '+48111111111',
              createdAt: '2026-01-10T10:00:00.000Z',
            },
            errors: [],
          }
        : { success: false, message: 'Backend invalid credentials.', customer: null, errors: [] },
      valid ? 200 : 401);
      return;
    }

    if (pathname === '/api/auth/logout') {
      state.authenticated = false;
      await page.context().clearCookies({ name: 'grocery_customer_access' });
      await fulfillJson(route, { success: true, message: null });
      return;
    }

    await route.fallback();
  });

  await page.route('**/api/graphql*', async (route) => {
    const rawBody = route.request().postData();
    if (!rawBody) {
      await route.fallback();
      return;
    }

    const body = JSON.parse(rawBody) as GraphqlRequestBody;
    const query = body.query ?? '';
    const variables = body.variables ?? {};
    const operationName = readOperationName(query);

    if (operationName && PROTECTED_OPERATIONS.has(operationName)) {
      state.protectedRequests += 1;
      const authorization = route.request().headers().authorization;
      if (authorization) {
        state.browserAuthorizationLeaks.push(operationName);
      }
    }

    if (
      operationName &&
      CHANNEL_SCOPED_OPERATIONS.has(operationName) &&
      variables.channel !== 'test'
    ) {
      state.channelFailures.push(operationName);
      await fulfillGraphqlError(route, 'Invalid channel.', 'BAD_USER_INPUT');
      return;
    }

    if (query.includes('mutation UpdateProfile')) {
      const input = readInput(variables);
      await fulfill(route, {
        updateProfile: {
          success: true,
          customer: {
            id: 'customer-account-1',
            fullName: input.fullName,
            phone: input.phone,
          },
          errors: [],
        },
      });
      return;
    }

    if (query.includes('query CustomerAddresses')) {
      await fulfill(route, { customerAddresses: state.addresses });
      return;
    }

    if (query.includes('mutation CreateAddress')) {
      state.createAttempts += 1;

      if (state.createAttempts === 1) {
        await fulfill(route, {
          customerAddressCreate: {
            success: false,
            address: null,
            errors: ['Backend address validation failed.'],
          },
        });
        return;
      }

      const input = readInput(variables);
      const address: AddressFixture = {
        id: 'address-office',
        label: String(input.label ?? ''),
        isDefault: false,
        fullName: String(input.fullName ?? ''),
        phone: String(input.phone ?? ''),
        street: String(input.street ?? ''),
        city: String(input.city ?? ''),
        postalCode: String(input.postalCode ?? ''),
        country: String(input.country ?? ''),
      };
      state.addresses.push(address);
      await fulfill(route, {
        customerAddressCreate: { success: true, address, errors: [] },
      });
      return;
    }

    if (query.includes('mutation UpdateAddress')) {
      const id = String(variables.id ?? '');
      const input = readInput(variables);
      const address = state.addresses.find((candidate) => candidate.id === id) ?? null;

      if (address) {
        address.label = String(input.label ?? '');
        address.fullName = String(input.fullName ?? '');
        address.phone = String(input.phone ?? '');
        address.street = String(input.street ?? '');
        address.city = String(input.city ?? '');
        address.postalCode = String(input.postalCode ?? '');
        address.country = String(input.country ?? '');
      }

      await fulfill(route, {
        customerAddressUpdate: {
          success: Boolean(address),
          address,
          errors: address ? [] : ['Address not found.'],
        },
      });
      return;
    }

    if (query.includes('mutation SetDefaultAddress')) {
      const id = String(variables.id ?? '');
      state.addresses = state.addresses.map((address) => ({
        ...address,
        isDefault: address.id === id,
      }));
      const address = state.addresses.find((candidate) => candidate.id === id) ?? null;

      await fulfill(route, {
        customerAddressSetDefault: {
          success: Boolean(address),
          address,
          errors: address ? [] : ['Address not found.'],
        },
      });
      return;
    }

    if (query.includes('mutation DeleteAddress')) {
      const id = String(variables.id ?? '');
      const previousLength = state.addresses.length;
      state.addresses = state.addresses.filter((address) => address.id !== id);

      await fulfill(route, {
        customerAddressDelete: {
          success: state.addresses.length < previousLength,
          errors: state.addresses.length < previousLength ? [] : ['Address not found.'],
        },
      });
      return;
    }

    if (query.includes('query CustomerOrders')) {
      state.orderListVariables.push(variables);
      await fulfill(route, {
        orders: {
          totalCount: 1,
          pageInfo: { hasNextPage: false, endCursor: null },
          edges: [{
            node: {
              id: 'order-account-1',
              number: 'ADG-1001',
              status: 'CONFIRMED',
              created: ORDER_CREATED,
              total: { gross: { amount: 79.9, currency: 'PLN' } },
              lines: [{
                productName: 'Kimchi testowe',
                variantName: '500 g',
                quantity: 2,
                unitPrice: { gross: { amount: 39.95, currency: 'PLN' } },
                totalPrice: { gross: { amount: 79.9, currency: 'PLN' } },
                thumbnail: null,
              }],
            },
          }],
        },
      });
      return;
    }

    if (query.includes('query OrderDetail')) {
      state.orderDetailVariables.push(variables);
      const id = String(variables.id ?? '');
      await fulfill(route, {
        order: id === 'order-account-1'
          ? {
            id,
            number: 'ADG-1001',
            status: 'CONFIRMED',
            created: ORDER_CREATED,
            shippingAddress: {
              streetAddress1: 'Marszałkowska 10',
              city: 'Warszawa',
              postalCode: '00-001',
              country: 'PL',
            },
            billingAddress: null,
            shippingMethodName: 'Odbiór osobisty',
            lines: [{
              productName: 'Kimchi testowe',
              variantName: '500 g',
              quantity: 2,
              unitPrice: { gross: { amount: 39.95, currency: 'PLN' } },
              totalPrice: { gross: { amount: 79.9, currency: 'PLN' } },
              thumbnail: null,
            }],
            subtotal: { gross: { amount: 79.9, currency: 'PLN' } },
            shippingPrice: { amount: 0, currency: 'PLN' },
            total: { gross: { amount: 79.9, currency: 'PLN' } },
            paymentStatus: 'PAID',
            trackingNumber: null,
          }
          : null,
      });
      return;
    }

    await route.fallback();
  });
}

for (const scenario of SCENARIOS) {
  test(`${scenario.viewport} ${scenario.locale}: customer account uses DB-backed addresses and channel-scoped orders`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== scenario.project, `Covered by ${scenario.project}`);

    const localAddressRequests: string[] = [];
    const state: MockState = {
      authenticated: false,
      addresses: [{
        id: 'address-home',
        label: scenario.locale === 'pl' ? 'Dom' : 'Home',
        isDefault: true,
        fullName: 'Test Shopper',
        phone: '+48111111111',
        street: 'Marszałkowska 10',
        city: 'Warszawa',
        postalCode: '00-001',
        country: 'PL',
      }],
      createAttempts: 0,
      protectedRequests: 0,
      browserAuthorizationLeaks: [],
      channelFailures: [],
      orderListVariables: [],
      orderDetailVariables: [],
    };

    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/addresses') {
        localAddressRequests.push(request.url());
      }
    });

    await installCustomerAccountApi(page, scenario, state);

    await page.goto(`/${scenario.locale}/login`);
    await page
      .getByRole('textbox', { name: scenario.labels.email, exact: true })
      .fill('shopper@example.test');
    await page.getByLabel(scenario.labels.password).fill('wrong-password');
    await page
      .getByRole('button', { name: scenario.labels.login, exact: true })
      .click();
    await expect(page.locator('#main-content').getByText(scenario.labels.invalidLogin)).toBeVisible();

    await page.getByLabel(scenario.labels.password).fill('correct-password');
    await page
      .getByRole('button', { name: scenario.labels.login, exact: true })
      .click();
    await expect(page).toHaveURL(
      scenario.locale === 'pl' ? /\/wishlist$/ : /\/en\/wishlist$/,
    );
    const browserAuthState = await page.evaluate(() => ({
      access: window.localStorage.getItem('grocery_auth_token'),
      refresh: window.localStorage.getItem('grocery_refresh_token'),
      profile: window.localStorage.getItem('grocery_auth_session'),
      cookie: document.cookie,
    }));
    expect(browserAuthState.access).toBeNull();
    expect(browserAuthState.refresh).toBeNull();
    expect(browserAuthState.profile).toBeNull();
    expect(browserAuthState.cookie).not.toContain('grocery_customer_access');
    expect(browserAuthState.cookie).not.toContain('grocery_customer_refresh');
    const authCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'grocery_customer_access');
    expect(authCookie?.httpOnly).toBe(true);

    await page.goto(`/${scenario.locale}/account`);
    await expect(page.getByRole('heading', { name: scenario.labels.accountTitle })).toBeVisible();

    await page.getByRole('tab', { name: scenario.labels.profileTab }).click();
    await page.locator('#profile-fullname').fill('Updated Shopper');
    await page.locator('#profile-phone').fill('+48222222222');
    await page.getByRole('button', { name: scenario.locale === 'pl' ? 'Zapisz zmiany' : 'Save changes' }).click();
    await expect(page.getByText(scenario.labels.profileUpdated)).toBeVisible();

    await page.getByRole('tab', { name: scenario.labels.addressesTab }).click();
    await expect(page.getByText('Marszałkowska 10')).toBeVisible();
    await page.getByRole('button', { name: scenario.labels.addAddress }).click();
    await expect(page.locator('#addr-country')).toHaveValue('PL');
    await expect(page.locator('#addr-phone')).toHaveAttribute('required', '');
    await page.locator('#addr-label').fill(scenario.locale === 'pl' ? 'Biuro' : 'Office');
    await page.locator('#addr-fullName').fill('Office Shopper');
    await page.locator('#addr-phone').fill('+48333333333');
    await page.locator('#addr-street').fill('Prosta 20');
    await page.locator('#addr-city').fill('Warszawa');
    await page.locator('#addr-postalCode').fill('00-850');

    await page.getByRole('button', { name: scenario.labels.addAddress }).click();
    await expect(page.locator('form').getByRole('alert')).toContainText(scenario.labels.addressFailure);
    await page.getByRole('button', { name: scenario.labels.addAddress }).click();

    const officeCard = page.locator('article').filter({ hasText: 'Prosta 20' });
    await expect(officeCard).toBeVisible();
    await officeCard.getByRole('button', { name: scenario.labels.editAddress }).click();
    await page.locator('#addr-phone').fill('+48444444444');
    await page.getByRole('button', { name: scenario.labels.saveAddress }).click();
    await expect(officeCard).toContainText('+48444444444');
    await officeCard.getByRole('button', { name: scenario.labels.setDefault }).click();
    await expect(officeCard).toContainText(scenario.locale === 'pl' ? 'Domyślny' : 'Default');

    const homeCard = page.locator('article').filter({ hasText: 'Marszałkowska 10' });
    await homeCard.getByRole('button', { name: scenario.labels.deleteAddress }).click();
    await expect(homeCard).toHaveCount(0);

    await page.getByRole('tab', { name: scenario.labels.ordersTab }).click();
    await expect(page.getByText('#ADG-1001')).toBeVisible();
    await expect(page.getByText(new Intl.DateTimeFormat(scenario.locale, { dateStyle: 'medium' }).format(new Date(ORDER_CREATED)))).toBeVisible();
    expect(state.orderListVariables.at(-1)?.channel).toBe('test');

    await page.getByRole('link', { name: scenario.labels.viewDetails }).click();
    await expect(page.getByRole('heading', { name: '#ADG-1001' })).toBeVisible();
    expect(state.orderDetailVariables.at(-1)).toMatchObject({ channel: 'test', id: 'order-account-1' });

    await page.goto(`/${scenario.locale}/account/orders/order-from-another-tenant`);
    await expect(page.getByText(scenario.labels.orderNotFound)).toBeVisible();
    expect(state.orderDetailVariables.at(-1)).toMatchObject({
      channel: 'test',
      id: 'order-from-another-tenant',
    });
    expect(state.protectedRequests).toBeGreaterThan(0);
    expect(state.browserAuthorizationLeaks).toEqual([]);
    expect(state.channelFailures).toEqual([]);
    expect(localAddressRequests).toEqual([]);
  });
}
