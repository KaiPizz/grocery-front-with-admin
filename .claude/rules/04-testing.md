# Testing Rules

## Framework

- **E2E:** Playwright (in `grocery-storefront/`)
- Config: `playwright.config.ts`
- Run: `npx playwright test` or `npm run test:e2e`

## Test Patterns

### Spec-First Test Design

Before writing or changing a test, read the relevant product source first:

1. `.claude/docs/PRD.md` for product goals, personas, user stories, success metrics, and phase priorities.
2. `.claude/docs/progress.md` for current completion state and known debt.
3. Any task-specific plan or issue linked to the work.
4. Existing code only after the required behavior is clear.

Derive the expected behavior from the specification, not from the current implementation. Tests written after reading the implementation tend to bless whatever was built, including wrong behavior and missing edge cases. This is especially dangerous for agent-written code because the agent optimizes tests toward the implemented approach instead of the required functionality.

For every non-trivial test, write down the requirement it protects in the test name or a short nearby comment. Good sources are PRD goals like "mobile-first shopping experience", user stories like "search and filter products quickly", checkout flow steps, accessibility requirements, and documented Zyra/backend constraints.

If the PRD and implementation disagree, the PRD wins until the human explicitly changes the requirement. If the PRD is vague, stop and clarify or update the spec before inventing assertions from the UI as it exists.

Do not write tests that merely encode implementation details such as exact class names, arbitrary pixel values, or current DOM structure unless those details are the requirement being protected. Prefer user-visible behavior, accessibility semantics, data flow, and workflow outcomes.

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
