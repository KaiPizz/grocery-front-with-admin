# Catalog product kinds and food-only cuisine discovery

## Requirements

Owner approved on 22 October 2026 after the product/image audit: cuisine navigation
must show food/drinks only; beauty/personal-care and kitchenware/tableware have
separate entries; PDP sections follow product kind. Country of origin remains an
independent filter and must not be rewritten to manufacture cuisine membership.
Audience: public PL/EN shoppers on desktop/mobile.

## Architecture and smallest viable change

Reuse the existing 64-category tree (10 roots, 54 leaves), category product filters,
shared cuisine-link builder, listing/pagination and PDP. One category-based
classifier recognizes the eight current food roots and two non-food roots;
category.parent metadata classifies leaves. Unknown classifications remain
neutral and never infer food status from the presence of ingredients/INCI.
The existing API already supports `product.category.parent { id slug }`; no schema,
new endpoint, database migration, source product data or auth changes.

Cuisine links add explicit `type=food` beside `country`. Listing filters constrain
category IDs before server pagination/counts, including facet queries. A pending,
failed or empty category lookup must never fall back to an unrestricted query.
Ordinary country filters without food scope continue to include other kinds.
Navigation, sorting, pagination, filter reset and category browsing preserve the
explicit scope; non-food sections remain accessible independently.

Cosmetics retain their actual description/usage and ingredients as INCI, without
nutrition, food-allergen statements, food expiry or dietary badges. Kitchenware
retains real description/specification content, without fabricated material,
dimension or care fields. Known food with missing metadata still displays food
sections/missing-data feedback. Shared product-card nutrition entry follows the
same classification. Keep existing product/category URLs; update display labels
for the two non-food roots in both languages.

## Decisions and risks

- Reuse category ancestry rather than inventing product types or parsing names:
  minimal and grounded in owner-reviewed catalog. Missing ancestry stays unknown;
  query contracts and fixtures must carry actual parent metadata.
- Explicit food scope rather than changing the meaning of every country URL:
  keeps the independent origin filter intact. Test soft navigation/back-forward
  and failing metadata to prevent a flash of unscoped products.
- Apply category filters on the API request rather than filtering a fetched page:
  totals and later pages remain correct. Validate selected-category scope and
  matching brand/country facets.
- Existing names/slugs remain database identities; agreed public labels are
  localized presentation changes. No stock, price, media or source claims edited.
- The prior 13 physical packaging/EAN cases and Sriracha ingredient conflict remain
  a separate data-verification queue; do not invent their answers in this UI fix.
- Production currently has a selected logo-only release, while main contains DPD
  application code. This task prepares and verifies DEV only; a later production
  release must re-evaluate the then-current runtime baseline and exclude unrelated
  work unless separately approved.

## File impact and ownership

Shared classifier/PDP worker: src/lib/catalog-product-kind.ts(new),
public-taxonomy.ts, graphql/operations/grocery.ts, types/index.ts, product PDP,
ProductCard.tsx, messages PL/EN, classifier unit tests.
Discovery worker: cuisines.ts, ProductsPage, ProductListingClient, listing-filters,
Header/CuisineMenu, home cuisine cards if needed, category route if needed,
existing cuisine/filter tests.
Regression worker: new catalog-product-kinds.spec.ts and necessary existing test
fixtures. Root owns integration, docs, verification, DEV build and screenshots.

## Implementation and verification

1. Shared classifier and existing API ancestry contract.
2. PDP/card content and food-only discovery/navigation in parallel with disjoint
   file ownership; PL/EN strings owned by one worker.
3. Focused unit, meaningful browser regressions for food/missing data, cosmetics
   with INCI/erroneous nutrition, kitchenware, country-only vs food-scoped listing,
   all cuisine link producers, facets, pagination, metadata failure and responsive
   accessibility. Existing affected regression suites remain required.
4. Root reviews diffs and runs proportionate causal controls for worker-written
   tests. Build only in this worktree; no sharedroot or production changes.
5. Immutable DEV preview through `deploy/adg-dev.sh --only storefront`; real DEV
   desktop/mobile PL/EN checks and screenshots; present link for owner approval.

## Verification before DEV build

- 23 unit cases passed; full TypeScript and source ESLint passed.
- 92 distinct browser cases passed across the affected/focused runs, including
  PL/EN desktop/mobile kinds, food pagination/facets, all cuisine producers,
  metadata loading/error/empty with Retry, history navigation and category SSR.
- Initial failures exposed missing SSR fixture identities, exact mobile navigation
  locators and a stale pre-existing category-count expectation; fixtures and tests
  were corrected, preserving the behavioral assertions.
- Isolated copies mutated cosmetics into food and removed selected-category scope
  intersection. Each mutation produced the expected unit failure. Production
  source files were never changed for these controls.
- Current public data:1560 food,37 cosmetics,181 kitchenware,0 unknown; independent
  API cuisine food totals KR380,JP376,CN256,TH169,VN58.

## DEV outcome

Production build and standalone smoke passed. DEV release
`storefront-e094e93f6f43-20261022T104653Z`, BUILD_ID
`jDn9iO6Nqu-U0dICUPXXf`, health200. 34 real DEV browser checks passed;
PL/EN navigation fits 320–1440px, all five cuisine queries carry 51 current
food-category IDs, both non-food labels and PDP kinds render correctly.
Screenshots visually inspected. Evidence: grocery-storefront/docs/catalog-sections-review-20261022/.
No production app deployment or catalog-data mutation occurred in this phase.
