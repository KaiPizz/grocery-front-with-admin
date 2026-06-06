# Kenmito Display Brand And Launch Cleanup Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the visible `kamito` tenant brand to Kenmito and remove unsupported sale/outlet claims without changing backend integration identifiers.

**Architecture:** Treat the name as tenant configuration, not infrastructure. Apply the content changes to both admin draft/published config and the storefront static fallback, then add one shared homepage guard that renders only genuinely discounted products in Deals.

**Tech Stack:** Next.js 14, React 18, TypeScript, JSON tenant config, Node test runner, Playwright

---

## File Structure

- Modify `admin-panel/data/config-kamito.json`
  - Update visible branding, canonical URL, and promotional surface state in
    both draft and published config.
- Modify `grocery-storefront/public/config/kamito.json`
  - Mirror production-facing branding and promotional surface state.
- Modify `grocery-storefront/tests/static-config-contract.test.mjs`
  - Lock the Kenmito display name and disabled Deals/Outlet contract.
- Modify `grocery-storefront/tests/mobile-homepage.spec.ts`
  - Add the RED regression proving regular products are not rendered as deals.
- Modify `grocery-storefront/src/app/[locale]/(shop)/page.tsx`
  - Remove the regular-product Deals fallback and hide an empty Deals section.
- Modify production-tenant Playwright fixtures that expose the old brand name.
- Modify `.claude/docs/progress.md`
  - Record the completed branding and honest-promotion cleanup.
- Modify `.claude/docs/learnings.md`
  - Record the discovered stale `my-grocery-store` asset/config mismatch.

### Task 1: Lock The Config Contract

- [ ] Change the static config test to expect `Kenmito`.
- [ ] Assert the Deals section and Outlet config are disabled.
- [ ] Run `npm run test:static-config` in `grocery-storefront`.
- [ ] Confirm RED because the tracked config still exposes Kamito and Outlet.

### Task 2: Lock Honest Deals Behavior

- [ ] Add a Playwright homepage fixture with Deals enabled and products that
  have no sale pricing.
- [ ] Assert no deal cards or Deals heading are visible after loading.
- [ ] Run the targeted mobile homepage test.
- [ ] Confirm RED because the current fallback fills Deals with normal products.

### Task 3: Update Tenant Content

- [ ] Replace visible `Kamito` branding with `Kenmito` in both admin config
  states and the storefront static config.
- [ ] Set the admin canonical URL to `https://kamito.enail.pro`.
- [ ] Remove the Outlet promo banner, quick link, and footer link.
- [ ] Remove footer labels that point to unrelated privacy/terms pages.
- [ ] Disable the Deals homepage section and Outlet route configuration.
- [ ] Keep `kamito` slugs, channel, file names, and hostname unchanged.

### Task 4: Fix Shared Homepage Logic

- [ ] Set `productsForDeals` to the real sale product set only.
- [ ] Hide the Deals section when loading is complete and the sale set is empty.
- [ ] Avoid changing Fresh Picks behavior beyond no longer excluding fake
  deals.

### Task 5: Update Production Fixtures And Docs

- [ ] Change visible production fixture copy to `Kenmito`.
- [ ] Keep internal technical suite names and comments as `Kamito` where they
  refer to the backend tenant.
- [ ] Update progress and learnings using the required project formats.

### Task 6: Verify And Ship

- [ ] Run storefront static config test and targeted Playwright tests.
- [ ] Run admin unit tests, type check, lint, build, and config audit.
- [ ] Run storefront type check, lint, and build.
- [ ] Start the storefront and perform browser smoke checks.
- [ ] Run `git diff --check` and inspect the final diff.
- [ ] Commit the verified change and push `main` so the deployment pipeline can
  pick it up.
