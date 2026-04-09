# Mobile Filter Sheet Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current mobile filters drawer with an honest draft-and-apply sheet that adds price range filtering and hides unsupported filter groups.

**Architecture:** Keep product querying in the existing products page, but split filter state into committed values and mobile draft values. Derive visible filter groups and price bounds from catalog data returned by the storefront so the UI only offers controls backed by current products.

**Tech Stack:** Next.js App Router, React state/hooks, `urql`, Playwright

---

### Task 1: Cover Mobile Filter Behavior With Tests

**Files:**
- Modify: `tests/mobile-products-page.spec.ts`
- Modify: `tests/mobile-fixtures.ts`

- [ ] **Step 1: Write the failing test**

Add a Playwright test that opens the mobile filter sheet, changes a filter, verifies results do not change until the footer apply button is tapped, then verifies the filtered product set updates. Add assertions for price inputs and hiding the empty certifications section.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:e2e -- tests/mobile-products-page.spec.ts --grep "applies mobile filters only after save"`
Expected: FAIL because the current drawer applies filter changes immediately and the fixture ignores filter variables.

- [ ] **Step 3: Extend the fixture minimally**

Update the mocked `GroceryProducts` handler so it respects `excludeAllergens`, `dietaryTags`, `storageZone`, and `price` input variables before returning edges.

- [ ] **Step 4: Re-run the targeted test**

Run: `npm run test:e2e -- tests/mobile-products-page.spec.ts --grep "applies mobile filters only after save"`
Expected: FAIL for the UI behavior only.

### Task 2: Implement Honest Mobile Filter State

**Files:**
- Modify: `src/app/[locale]/(shop)/products/page.tsx`

- [ ] **Step 1: Introduce committed and draft filter state**

Keep desktop controls bound to committed filters. When the mobile sheet opens, clone committed filters into draft state. Only copy draft values back into committed state when the footer apply button is tapped.

- [ ] **Step 2: Add price range filtering**

Store min/max price input values, normalize them into a `ProductFilterInput.price` object, and include price in active-filter counting and clear/reset logic.

- [ ] **Step 3: Derive visible groups from catalog metadata**

Use an unfiltered catalog query to gather available allergens, dietary tags, storage zones, certifications, and global min/max price. Hide groups with no usable values unless they already contain a selected value.

- [ ] **Step 4: Reshape the mobile sheet**

Make the sheet about 80% viewport height, keep the body scrollable, and pin the footer action button at the bottom. Keep the overlay and close affordances accessible.

- [ ] **Step 5: Re-run the targeted test**

Run: `npm run test:e2e -- tests/mobile-products-page.spec.ts --grep "applies mobile filters only after save"`
Expected: PASS

### Task 3: Update Copy And Verify

**Files:**
- Modify: `src/messages/en.json`
- Modify: `src/messages/pl.json`
- Modify: `src/messages/de.json`
- Modify: `src/messages/ru.json`
- Modify: `src/messages/tr.json`
- Modify: `src/messages/uk.json`
- Modify: `src/messages/vi.json`
- Modify: `src/messages/zh.json`

- [ ] **Step 1: Add missing labels**

Add message keys for price range labels, apply button copy, and any new helper text used by the mobile sheet.

- [ ] **Step 2: Run focused verification**

Run: `npm run test:e2e -- tests/mobile-products-page.spec.ts`
Expected: PASS

Run: `npm run test:e2e -- tests/mobile-smoke.spec.ts --grep "opens mobile filters in a drawer"`
Expected: PASS

Run: `npm run lint`
Expected: PASS
