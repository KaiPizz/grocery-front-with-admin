import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const artifactDir = join(tmpdir(), 'grocery-storefront-playwright');

export default defineConfig({
  testDir: './tests',
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
    },
    {
      command: 'npx next dev -p 3018',
      url: 'http://127.0.0.1:3018',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NODE_ENV: 'development',
        NEXT_PUBLIC_CONFIG_API_URL: 'http://127.0.0.1:4199',
        NEXT_PUBLIC_GRAPHQL_URL: 'http://127.0.0.1:4199/graphql',
        NEXT_PUBLIC_SALON_SLUG: 'test',
      },
    },
  ],
  projects: [
    {
      name: 'iphone-12',
      testIgnore: /(?:customer-account-p0|password-flows)\.spec\.ts/,
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
      testMatch: /(?:customer-account-p0|password-flows)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
});
