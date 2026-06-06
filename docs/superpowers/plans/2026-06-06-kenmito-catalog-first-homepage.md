# Kenmito Catalog-First Homepage Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved catalog-first Kenmito homepage using real catalog media and truthful fulfillment data.

**Architecture:** Keep the change inside the existing homepage route and config surfaces. Add small homepage-only render helpers, reuse the existing GraphQL queries, and derive trust content from `StorefrontConfig.general.fulfillment` rather than adding backend or config fields.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind layout utilities, next-intl, urql, Playwright.

---

### Task 1: Lock The Homepage Contract

**Files:**
- Modify: `grocery-storefront/tests/mobile-homepage.spec.ts`
- Modify: `grocery-storefront/tests/kamito-launch-hardening.spec.ts`

- [ ] Add a desktop assertion that the responsive hero contains real catalog
      imagery and the category section follows it.
- [ ] Add a pickup-store assertion for a visible fulfillment trust strip.
- [ ] Assert that the generic shelf is not labelled `New arrivals`.
- [ ] Run the two specs and confirm the new assertions fail for the missing
      catalog-first behavior.

Run:

```bash
npx playwright test tests/mobile-homepage.spec.ts tests/kamito-launch-hardening.spec.ts --project=pixel-7
```

Expected: the new catalog-first assertions fail while existing assertions remain meaningful.

### Task 2: Implement The Responsive Catalog Hero

**Files:**
- Modify: `grocery-storefront/src/app/[locale]/(shop)/page.tsx`

- [ ] Add homepage-only helpers that select valid product thumbnail URLs.
- [ ] Render one responsive legacy hero component in both mobile and desktop
      slots with the existing configured headline, subtitle, CTA, and real
      product images.
- [ ] Keep configured V2 hero blocks unchanged.
- [ ] Run the targeted homepage test and confirm the hero assertions pass.

### Task 3: Upgrade Category Discovery And Product Semantics

**Files:**
- Modify: `grocery-storefront/src/app/[locale]/(shop)/page.tsx`
- Modify: `grocery-storefront/src/messages/en.json`
- Modify: `grocery-storefront/src/messages/pl.json`

- [ ] Sort real non-empty categories by product count before empty categories.
- [ ] Render category background images when present and a quiet text fallback
      when absent.
- [ ] Preserve configured commercial quick links after real categories.
- [ ] Rename `Popular categories` to neutral category-browsing language.
- [ ] Rename `New arrivals` to neutral product-discovery language.
- [ ] Run the targeted homepage tests and confirm category and shelf assertions pass.

### Task 4: Add Truthful Fulfillment Trust

**Files:**
- Modify: `grocery-storefront/src/app/[locale]/(shop)/page.tsx`
- Modify: `grocery-storefront/src/messages/en.json`
- Modify: `grocery-storefront/src/messages/pl.json`

- [ ] Render trust items from pickup, bank-transfer, and manual-confirmation
      fulfillment states.
- [ ] Do not render pickup claims for delivery/backend fulfillment tenants.
- [ ] Run the Kamito launch-hardening spec and confirm the trust assertion passes.

### Task 5: Update Kenmito Content And Documentation

**Files:**
- Modify: `grocery-storefront/public/config/kamito.json`
- Modify: `admin-panel/data/config-kamito.json`
- Modify: `.claude/docs/progress.md`

- [ ] Replace the generic Kenmito hero copy with the approved catalog-first copy.
- [ ] Disable the image-less Korean pantry promo banner in static, draft, and
      published config while preserving the commercial collection and quick link.
- [ ] Parse all three config branches and verify their relevant fields match.
- [ ] Record the homepage upgrade and remaining owner-asset limitation.

### Task 6: Verify The Complete Change

**Files:**
- Test: `grocery-storefront/tests/mobile-homepage.spec.ts`
- Test: `grocery-storefront/tests/kamito-launch-hardening.spec.ts`
- Test: `grocery-storefront/tests/static-config-contract.test.mjs`

- [ ] Run targeted Playwright tests.
- [ ] Run static config contract tests.
- [ ] Run lint with zero warnings.
- [ ] Run TypeScript typecheck.
- [ ] Run the production build.
- [ ] Open the local storefront in the in-app browser at mobile and desktop
      viewports and verify hierarchy, overflow, image fallback, and first-flow CTA visibility.
