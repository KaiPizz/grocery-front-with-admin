# Browser Automation QA Patterns

## Overview

Use real browser automation (Playwright) for QA testing beyond unit/integration tests. This catches visual regressions, interaction bugs, and mobile-specific issues that code analysis alone cannot detect.

## QA Workflow

### 1. Smoke Test
Quick validation that core pages load without errors:

```typescript
const pages = [
  '/',                    // Homepage with hero banner
  '/products',            // Product listing
  '/cart',                // Shopping cart
  '/login',               // Authentication
];

for (const url of pages) {
  await page.goto(url);
  // No console errors
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  await page.waitForLoadState('networkidle');
  expect(errors).toHaveLength(0);
}
```

### 2. Visual Regression
Compare screenshots against baselines:

```typescript
// Capture current state
await page.goto('/products');
await expect(page).toHaveScreenshot('products-grid.png', {
  maxDiffPixels: 100,
  fullPage: true,
});
```

### 3. Mobile Interaction Testing
Test touch-specific interactions:

```typescript
// Test mobile filter sheet
await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12
await page.goto('/products');
await page.tap('[data-testid="filter-button"]');
// Verify sheet opens with animation
await expect(page.locator('.filter-sheet')).toBeVisible();
// Verify bottom action button is in thumb zone
const button = page.locator('[data-testid="apply-filters"]');
const box = await button.boundingBox();
expect(box.y).toBeGreaterThan(600); // Bottom third of screen
```

### 4. Accessibility Audit
Check ARIA and contrast:

```typescript
// Verify keyboard navigation
await page.keyboard.press('Tab');
const focused = await page.evaluate(() => document.activeElement?.tagName);
expect(focused).not.toBe('BODY'); // Something should be focused

// Verify color contrast (via axe-core if installed)
// Or manual checks on critical elements
const button = page.locator('.add-to-cart-btn');
const bg = await button.evaluate(el => getComputedStyle(el).backgroundColor);
const color = await button.evaluate(el => getComputedStyle(el).color);
// Verify contrast ratio >= 4.5:1
```

## Test Matrix

| Viewport | Device | Priority |
|----------|--------|----------|
| 390x844 | iPhone 12 | High |
| 412x915 | Pixel 7 | High |
| 768x1024 | iPad | Medium |
| 1280x720 | Desktop | High |
| 1920x1080 | Desktop HD | Medium |

## Running QA

```bash
cd grocery-storefront

# Full QA suite
npx playwright test

# Mobile-only
npx playwright test --project=mobile

# Visual regression update baselines
npx playwright test --update-snapshots

# Specific page QA
npx playwright test --grep "homepage"
```
