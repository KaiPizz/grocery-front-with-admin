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
  webServer: {
    command: 'npx next dev -p 3018',
    url: 'http://127.0.0.1:3018',
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: 'iphone-12',
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
  ],
});
