import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

const artifactDir = join(tmpdir(), 'grocery-storefront-playwright');
const customerAuthBffTestSecret = createHash('sha256')
  .update(`grocery-storefront-playwright:${artifactDir}`)
  .digest('hex');
const configServerFixtureVersion = createHash('sha256')
  .update(readFileSync(join(process.cwd(), 'tests/config-server.mjs')))
  .digest('hex')
  .slice(0, 12);

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  outputDir: join(artifactDir, 'test-results'),
  reporter: 'list',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3018',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'node tests/config-server.mjs',
      url: 'http://127.0.0.1:4199',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        TEST_CUSTOMER_AUTH_BFF_SECRET: customerAuthBffTestSecret,
      },
    },
    {
      command: 'npx next dev -p 3018',
      url: 'http://127.0.0.1:3018',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NODE_ENV: 'development',
        CUSTOMER_AUTH_BFF_SECRET: customerAuthBffTestSecret,
        CUSTOMER_AUTH_GRAPHQL_URL: 'http://127.0.0.1:4199/graphql',
        CUSTOMER_FACEBOOK_APP_ID: '123456789012345',
        CUSTOMER_FACEBOOK_GRAPH_VERSION: 'v25.0',
        CUSTOMER_GOOGLE_CLIENT_ID: '1234567890-playwright.apps.googleusercontent.com',
        NEXT_PUBLIC_CONFIG_API_URL: 'http://127.0.0.1:4199',
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4199/api/v1',
        NEXT_PUBLIC_GRAPHQL_URL: `http://127.0.0.1:4199/graphql?fixture=${configServerFixtureVersion}`,
        NEXT_PUBLIC_CHANNEL: 'test',
        NEXT_PUBLIC_SALON_SLUG: 'test',
      },
    },
  ],
  projects: [
    {
      name: 'iphone-12',
      testIgnore: /(?:customer-account-p0|account-login-methods|account-deletion|password-flows|google-auth|facebook-auth|resend-verification|graphql-bff-method)\.spec\.ts/,
      use: {
        ...devices['iPhone 12'],
      },
    },
    {
      name: 'google-auth-iphone-webkit',
      testMatch: /google-auth\.spec\.ts/,
      grep: /mobile-webkit/,
      use: {
        ...devices['iPhone 12'],
      },
    },
    {
      name: 'pixel-7',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'customer-account-desktop',
      testMatch: /(?:customer-account-p0|account-login-methods|account-deletion|password-flows|google-auth|facebook-auth|resend-verification|graphql-bff-method)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
});
