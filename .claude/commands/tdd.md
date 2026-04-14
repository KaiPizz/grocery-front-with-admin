# /tdd — Test-Driven Development

**Framework:** Superpowers

Implement a feature or fix using the RED-GREEN-REFACTOR cycle.

## Instructions

When the user invokes `/tdd`, follow this strict cycle:

### RED Phase
1. Read the requirement or plan step
2. Write a Playwright test that describes the desired behavior
3. Be specific about assertions — what should happen, what should not
4. Run the test: `cd grocery-storefront && npx playwright test --grep "[test name]"`
5. Confirm it **FAILS** — if it passes, the test isn't testing anything new

### GREEN Phase
1. Write the **minimum** code to make the test pass
2. Don't optimize, don't generalize — correctness first
3. Run the targeted test again
4. Confirm it **PASSES**
5. Run the full test suite to check for regressions: `npx playwright test`

### REFACTOR Phase
1. Clean up the implementation while tests stay green
2. Remove duplication, improve naming, extract if needed
3. Run tests after each refactoring step
4. Confirm everything still **PASSES**

### Commit
After each GREEN-REFACTOR cycle, commit with a descriptive message.

## Testing Patterns for This Project

- **Mock-route pattern** for API responses (`page.route()`)
- **Mobile-first viewports** (390x844 iPhone 12, 412x915 Pixel 7)
- **Fixtures** in `tests/*-fixtures.ts`
- **Data-testid** attributes for reliable selectors

Reference: `.claude/skills/superpowers/tdd-methodology.md`

$ARGUMENTS
