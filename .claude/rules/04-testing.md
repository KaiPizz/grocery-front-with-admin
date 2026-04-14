# Testing Rules

## Framework

- **E2E:** Playwright (in `grocery-storefront/`)
- Config: `playwright.config.ts`
- Run: `npx playwright test` or `npm run test:e2e`

## Test Patterns

### Mock-Route Pattern

Tests mock API responses using Playwright's `page.route()`:

```typescript
// Mock GraphQL responses
await page.route('**/api/graphql', async (route) => {
  const body = JSON.parse(route.request().postData());
  if (body.query.includes('GroceryProducts')) {
    await route.fulfill({ json: mockProductsResponse });
  }
});

// Mock REST responses
await page.route('**/api/config/**', async (route) => {
  await route.fulfill({ json: mockConfig });
});
```

### Mobile-First Testing

- Tests run on mobile viewports (iPhone 12: 390x844, Pixel 7: 412x915)
- Use fixtures from `tests/mobile-fixtures.ts` for consistent mock data
- Test touch interactions: swipe, tap, long-press

### Test Structure

```typescript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mocks
  });

  test('should do expected behavior', async ({ page }) => {
    // Arrange: navigate
    await page.goto('/products');
    // Act: interact
    await page.click('[data-testid="filter-button"]');
    // Assert: verify
    await expect(page.locator('.product-card')).toHaveCount(3);
  });
});
```

## TDD Workflow (Superpowers)

Follow RED-GREEN-REFACTOR:

1. **RED:** Write a failing test that describes the desired behavior
2. **GREEN:** Write the minimum code to make the test pass
3. **REFACTOR:** Clean up the implementation while keeping tests green

## Naming

- Test files: `*.spec.ts` (Playwright)
- Fixture files: `*-fixtures.ts`
- Use descriptive test names: `'should apply mobile filters only after save'`

## Do NOT

- Do not skip tests without explanation (`test.skip` needs a reason)
- Do not test implementation details — test behavior
- Do not mock what you don't own unless you're at a system boundary
- Do not write tests that depend on execution order
