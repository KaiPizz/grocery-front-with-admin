import { expect, test } from '@playwright/test';

import { mockMobileStorefront } from './mobile-fixtures';

test('browser GraphQL queries use the POST-only same-origin BFF', async ({ page }) => {
  const methods: string[] = [];

  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/graphql') {
      methods.push(request.method());
    }
  });

  await mockMobileStorefront(page);
  await page.goto('/en');

  await expect.poll(() => methods.length).toBeGreaterThan(0);
  expect([...new Set(methods)]).toEqual(['POST']);
});
