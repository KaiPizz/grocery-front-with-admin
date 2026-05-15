# Category-Aware Listing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/categories/[slug]` from a plain category grid into a category-scoped product listing with the same practical sort/filter controls as `/products`.

**Architecture:** Keep the SSR category page responsible for the no-JS header and first product render. Extract only the listing primitives that both `/products` and category pages need: filter state helpers, filter controls, product grid/load-more shell, and query-variable construction. Category pages pass a required category filter into the shared client listing instead of duplicating product-list logic.

**Tech Stack:** Next.js App Router, React client components, `urql`, next-intl, Playwright

---

### Task 1: Lock Category Listing Behavior With Tests

**Files:**
- Modify: `grocery-storefront/tests/categories-browsing.spec.ts`
- Use: `grocery-storefront/tests/mobile-fixtures.ts`

- [x] **Step 1: Write failing desktop category listing test**

Add a spec that visits `/en/categories/fruit`, opens the product filters, applies a price/category-compatible filter, and asserts the page sends `GroceryProducts` with `filter.categories` plus the selected filter.

- [x] **Step 2: Write failing mobile category listing test**

Add a spec that opens the category mobile filter sheet, verifies products do not change before Apply, then applies a filter and verifies the filtered category results.

- [x] **Step 3: Run category tests to verify RED**

Run: `npm run test:e2e -- tests/categories-browsing.spec.ts --project=pixel-7`
Expected: FAIL because category pages currently have no sort/filter toolbar and do not call `GroceryProducts`.

### Task 2: Extract Shared Listing Primitives

**Files:**
- Create: `grocery-storefront/src/components/product-listing/ProductListingClient.tsx`
- Create: `grocery-storefront/src/components/product-listing/listing-filters.ts`
- Modify: `grocery-storefront/src/app/[locale]/(shop)/products/page.tsx`

- [x] **Step 1: Move filter helpers**

Move filter state types, option constants, normalization, active-counting, and `buildProductFilter` into `listing-filters.ts`. Add a `categoryId: string | null` parameter that emits `filter.categories = [categoryId]` when present.

- [x] **Step 2: Create shared client listing**

Move the product-grid query/render, desktop filter panel, mobile filter sheet, sort handling, and load-more behavior into `ProductListingClient`.

- [x] **Step 3: Rewire `/products`**

Replace the large inline listing implementation with `ProductListingClient` using `categoryId={null}` and the existing title/copy behavior.

### Task 3: Wire Category Pages

**Files:**
- Modify: `grocery-storefront/src/app/[locale]/(shop)/categories/[slug]/page.tsx`
- Delete: `grocery-storefront/src/app/[locale]/(shop)/categories/[slug]/CategoryProductGrid.tsx` if fully superseded

- [x] **Step 1: Pass category context into the shared listing**

Render `ProductListingClient` below the category header with `categoryId={category.id}`, `categorySlug={params.slug}`, initial products/pageInfo from SSR, and category-specific title/count copy.

- [x] **Step 2: Preserve no-JS behavior**

Keep the server-rendered category heading/count/initial product cards visible when JavaScript is disabled.

### Task 4: Verify And Document

**Files:**
- Modify: `.claude/docs/progress.md`
- Modify: `.claude/docs/learnings.md` only if a new mistake/discovery happens

- [x] **Step 1: Run targeted Playwright**

Run: `npm run test:e2e -- tests/categories-browsing.spec.ts --project=pixel-7`
Expected: PASS.

- [x] **Step 2: Run product listing regression**

Run: `npm run test:e2e -- tests/mobile-products-page.spec.ts --project=pixel-7`
Expected: PASS.

- [x] **Step 3: Run static verification**

Run: `npm run lint`
Run: `npx tsc --noEmit`
Expected: PASS.

- [x] **Step 4: Update progress**

Update the category and known-debt rows to reflect that category pages now share listing controls with `/products`, while product-detail breadcrumbs remain separate B1 debt.
