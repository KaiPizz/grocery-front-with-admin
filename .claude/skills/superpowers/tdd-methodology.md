# Test-Driven Development (TDD) Methodology

## The RED-GREEN-REFACTOR Cycle

```
    ┌──────────┐
    │   RED    │  Write a failing test
    │          │  that describes desired behavior
    └────┬─────┘
         │
    ┌────▼─────┐
    │  GREEN   │  Write minimum code
    │          │  to make the test pass
    └────┬─────┘
         │
    ┌────▼─────┐
    │ REFACTOR │  Clean up implementation
    │          │  while keeping tests green
    └────┬─────┘
         │
         └──────── repeat ──────────┐
                                    │
    ┌──────────┐                    │
    │   RED    │◄───────────────────┘
    └──────────┘
```

## RED Phase — Write Failing Test

1. Describe the behavior you want in a test
2. Be specific: what input → what output/behavior
3. Run the test — it MUST fail
4. If it passes, your test isn't testing anything new

```typescript
// Example: mobile filter apply behavior
test('should apply mobile filters only after save', async ({ page }) => {
  await page.goto('/products');
  await page.click('[data-testid="filter-button"]');
  await page.click('[data-testid="dietary-vegan"]');
  
  // Products should NOT change yet (draft state)
  await expect(page.locator('.product-card')).toHaveCount(12);
  
  // Apply filters
  await page.click('[data-testid="apply-filters"]');
  
  // NOW products should update
  await expect(page.locator('.product-card')).toHaveCount(4);
});
```

## GREEN Phase — Make It Pass

1. Write the simplest code that makes the test pass
2. It's OK if the code is ugly — correctness first
3. Don't optimize, don't generalize, don't refactor
4. Run the test — it MUST pass
5. Run ALL tests — nothing else should break

## REFACTOR Phase — Clean Up

1. Improve code quality while tests stay green
2. Remove duplication
3. Improve naming and readability
4. Extract functions/components if needed
5. Run ALL tests after each change

## Rules

- **Never write production code without a failing test first**
- **Never refactor with a failing test**
- **One behavior per test** — don't test multiple things
- **Fast feedback** — tests should run in seconds, not minutes
- **Commit at each GREEN** — small, frequent commits

## For This Project

- Use Playwright for E2E tests (grocery-storefront)
- Use mock-route pattern for API responses
- Test on mobile viewports first (iPhone 12, Pixel 7)
- Fixture files: `tests/*-fixtures.ts`
- Run targeted tests during development: `npx playwright test --grep "test name"`
- Run full suite before marking complete: `npx playwright test`
