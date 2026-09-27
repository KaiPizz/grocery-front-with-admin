# ADG wave 1 — Cuisines menu, lean filters, lean cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (main session writes the code; storefront is customer-facing). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the country-specific "Koreańska spiżarnia" entry with a neutral "Kuchnie" (cuisines by country of origin) menu, cut the listing filters to category · brand · country · price · in-stock, and strip allergen chips and the "category · country · storage" facts line from product cards.

**Architecture:** Storefront-only for the visible change (Next 16 App Router, next-intl, urql, Playwright). One tiny backend addition in the eNail storefront GraphQL API: a `productBrands(channel, first, categoryIds)` facet query mirroring the existing `productCountryOrigins`, requested by the storefront in its own operation so the storefront can ship before the backend (the Marka section hides itself while the field is unknown). Filters stay React state; the only URL contract added is `?country=<Polish country name>` (multi-valued), mirroring the existing `?zone=` contract.

**Tech Stack:** Next 16, React 19, next-intl, urql, Playwright (`playwright test`), node `--test` (Node 22.22, type stripping), NestJS 10 + TypeORM + Jest (backend).

**Spec:** the review sent to Paul on 27/09/2026 (memory `project_adg_ux_review_20260927.md`) and his answer "theo hướng A, làm đợt 1 trước".

## Global Constraints

- Country of origin values are free-text Polish names in the DB (`Japonia`, `Korea Południowa`, `Chiny`, `Tajlandia`, `Wietnam`); never ISO codes.
- Brand values are free text (`p.brand`, 378 distinct for ADG); the facet returns the top N by product count, scoped to the current category ids.
- Locales: `pl` (default, no URL prefix) and `en`; every new UI string gets both `src/messages/pl.json` and `src/messages/en.json`.
- No source edits in `/var/www/www/enail` (deploy tree); backend work lives in `/var/www/www/enail/.worktrees/storefront-brand-facets`, storefront work in `/home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters`.
- `?zone=` (homepage "shop by zone" and promo banner links) must keep working, with its active-filter chip, even though the storage-zone chips leave the sidebar.
- `normalizeAllergenCode` stays exported: the cart page imports it.
- Keep the Korean pantry hero asset and its static-config contract (asset checks stay), only flip the `enabled` flags and drop the footer link.

## Review Focus

1. `/products?country=Japonia` opened directly must render the country chip as active AND the first product page must already be filtered (server fetch passes the country), no unfiltered flash. Pinned in Task 4 (`lean-filters.spec.ts`, "direct country URL").
2. Clicking a second cuisine while already on `/products?country=…` (soft navigation, same component instance) must swap the filter; the account-tabs bug class. Pinned in Task 6 (`cuisines-menu.spec.ts`, "switch cuisine while on listing").
3. When the production backend does not yet know `productBrands`, the GraphQL validation error must only hide the Marka section; country, price, in-stock and products must still work. Pinned in Task 4 ("brand facet unavailable").
4. A brand value with spaces, diacritics or an ampersand (`Chung Jung One`, `S&B`, `Nestlé`) must round-trip unchanged into `filter.brands`. Pinned in Task 4 ("brand chip sends exact value").
5. `?zone=FROZEN` still filters and shows a removable chip after the zone section is gone. Pinned in Task 4 ("zone url keeps working").

---

### Task 1: Backend `productBrands` facet query

**Files:**
- Modify: `backend/src/modules/storefront-api/services/storefront-product.service.ts` (after `getCountryOriginFacets`, ~line 1176)
- Modify: `backend/src/modules/storefront-api/resolvers/product.resolver.ts` (after `productCountryOrigins`, ~line 583)
- Test: `backend/src/modules/storefront-api/services/storefront-product.service.brand-facets.spec.ts`

**Interfaces:**
- Produces: GraphQL `productBrands(channel: String!, first: Int = 30, categoryIds: [ID!]): [ProductFacetCount!]!` with `{ value: String!, count: Int! }`, ordered by count desc then value asc, `first` clamped to 100. Service: `getBrandFacets(salonId: string, limit: number, categoryIds?: string[]): Promise<Array<{ value: string; count: number }>>`.

- [ ] **Step 1: Write the failing spec** (query-builder stub; asserts select on `p.brand`, salon scope, active/published/deleted guards, category scoping only when ids given, limit, numeric count mapping)
- [ ] **Step 2: Run** `cd /var/www/www/enail/.worktrees/storefront-brand-facets/backend && npx jest src/modules/storefront-api/services/storefront-product.service.brand-facets.spec.ts` → FAIL (`getBrandFacets is not a function`)
- [ ] **Step 3: Implement** `getBrandFacets` as a copy of `getCountryOriginFacets` with `p.brand` (`IS NOT NULL`, `btrim(p.brand) <> ''`, group by `p.brand`), and the resolver:

```ts
  @Public()
  @Query(() => [ProductFacetCountType], { name: "productBrands" })
  async productBrands(
    @Args("channel", { type: () => String }) channel: string,
    @Args("first", { type: () => Int, nullable: true, defaultValue: 30 }) first?: number,
    @Args("categoryIds", { type: () => [ID], nullable: true }) categoryIds?: string[],
  ): Promise<ProductFacetCountType[]> {
    const { salonId } = await this.channelService.resolve(channel);
    return this.productService.getBrandFacets(salonId, Math.min(first ?? 30, 100), categoryIds);
  }
```
- [ ] **Step 4: Run the spec** → PASS; `npx tsc -p tsconfig.json --noEmit` on the two files' project (or `npm run build`) → clean
- [ ] **Step 5: Commit** `feat(storefront-api): productBrands facet query for the Marka filter` with trailer `Session: storefront-brand-facets (claude)`

### Task 2: Filter state contract (`listing-filters.ts`)

**Files:**
- Modify: `src/components/product-listing/listing-filters.ts`
- Test: `tests/listing-filters-contract.test.mjs` (node `--test`, imports the `.ts` module)

**Interfaces:**
- Produces: `ProductFiltersState = { categoryIds: string[]; brands: string[]; countryOfOrigin: string[]; storageZone: StorageZone | ''; inStockOnly: boolean; priceMin: string; priceMax: string }`; `parseCountryQueryParams(searchParams: Pick<URLSearchParams,'getAll'>): string[]`; `buildProductFilter` emits `brands` and `stockAvailability: 'IN_STOCK'`.
- Removed: `excludeAllergens`, `dietaryTags`, `certifications` fields; `ALLERGEN_OPTIONS`, `DIETARY_OPTIONS`, `CERT_OPTIONS`, `parseDietaryQueryParams`, `setDietaryQueryParams`, `expandAllergenFilterCodes`, `extractProductCertifications`. Kept: `normalizeAllergenCode`, `ZONE_OPTIONS`, price helpers, `toggleMultiValue`, `getProductPrice`.

- [ ] **Step 1: Write the failing node test**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_FILTERS, buildProductFilter, countActiveFilters, normalizeFiltersState, parseCountryQueryParams } from '../src/components/product-listing/listing-filters.ts';

test('buildProductFilter sends brands and in-stock availability', () => {
  const filter = buildProductFilter({ ...DEFAULT_FILTERS, brands: ['S&B', 'Nestlé'], inStockOnly: true }, '');
  assert.deepEqual(filter.brands, ['S&B', 'Nestlé']);
  assert.equal(filter.stockAvailability, 'IN_STOCK');
  assert.equal('excludeAllergens' in filter, false);
});
test('parseCountryQueryParams accepts repeated and comma-separated values', () => {
  const params = new URLSearchParams('country=Japonia&country=Chiny,%20Korea%20Po%C5%82udniowa&country=');
  assert.deepEqual(parseCountryQueryParams(params), ['Japonia', 'Chiny', 'Korea Południowa']);
});
test('inStockOnly counts as one active filter and normalizes with brands deduped', () => {
  const state = normalizeFiltersState({ ...DEFAULT_FILTERS, brands: ['Samyang', 'Samyang', ' '], inStockOnly: true });
  assert.deepEqual(state.brands, ['Samyang']);
  assert.equal(countActiveFilters(state), 2);
});
```
- [ ] **Step 2: Run** `node --test tests/listing-filters-contract.test.mjs` → FAIL (unknown exports / wrong shape)
- [ ] **Step 3: Implement** the new state shape, `parseCountryQueryParams`, update `normalizeFiltersState`, `countActiveFilters`, `areFiltersEqual`, `buildProductFilter`; delete the removed helpers
- [ ] **Step 4: Run** → PASS
- [ ] **Step 5: Commit** `refactor(listing): filter state = category, brand, country, zone, in-stock, price`

### Task 3: Listing UI — lean sidebar with Marka, Dostępne, "więcej"

**Files:**
- Create: `src/components/product-listing/FilterChipGroup.tsx`
- Modify: `src/components/product-listing/ProductListingClient.tsx` (state init 256-334, facets 355-430, `renderFilterContent` 590-~860, active chips ~1240-1300, clear handlers ~910/1140)
- Modify: `src/lib/graphql/operations/grocery.ts` (add `PRODUCT_BRANDS_QUERY`, delete `PRODUCT_FILTER_FACETS_QUERY`)
- Modify: `src/app/[locale]/(shop)/products/page.tsx` (read `country` like `zone`, pass `initialCountries`)
- Delete: `src/components/grocery/AllergenFilter.tsx`
- Modify: `src/messages/pl.json`, `src/messages/en.json` (`products.brandFilter` "Marka"/"Brand", `products.inStockOnly` "Tylko dostępne"/"In stock only", `products.showMoreOptions` "Pokaż więcej ({count})"/"Show more ({count})", `products.showLessOptions` "Pokaż mniej"/"Show less"); remove `allergenFilter`, `allergenFilterCatalogNotice`, `dietaryFilter`, `storageFilter`, `certificationFilter`, `filterAvailabilityLoading/Error`, `filterUnavailable` only if no other consumer (grep first)

**Interfaces:**
- `FilterChipGroup` props: `{ legend: string; options: Array<{ value: string; label: string; count?: number }>; selected: string[]; onToggle: (value: string) => void; showCounts: boolean; initialLimit: number; testId: string }`; renders `<fieldset>` + `<legend>`, chips as `button[aria-pressed]`, and a "więcej/mniej" toggle button (`data-testid="${testId}-toggle"`) when `options.length > initialLimit`.
- `PRODUCT_BRANDS_QUERY`: `query ProductBrands($channel: String!, $first: Int, $categoryIds: [ID!]) { productBrands(channel: $channel, first: $first, categoryIds: $categoryIds) { value count } }`.
- Marka section renders only when the query succeeded with ≥1 brand; a GraphQL error hides it silently (no status line).
- Country section: `initialLimit` 6; Marka: `initialLimit` 8, `first: 30`.
- `inStockOnly` checkbox at the top of the panel: `<label><input type="checkbox" data-testid="filter-in-stock-only" …/> {t('inStockOnly')}</label>`.
- Active chips: brands (label = value), country, zone, price, in-stock ("Tylko dostępne").
- Country from URL: `parseCountryQueryParams(searchParams)` seeds `countryOfOrigin` and a `useEffect` keyed on `countryQueryKey` syncs committed+draft state when the URL changes.

- [ ] Steps: write `FilterChipGroup`; wire brands query (`pause: !filterMetadataRequested`, same trigger as country facets); rewrite `renderFilterContent`; remove dietary URL push code and dead memos (`availableDietaryTags`, `availableStorageZones`, `availableCertifications`, `hasCompleteFacetCounts`, `getAvailableFacetOptions` if unused); update `products/page.tsx` initial fetch to include `countryOfOrigin` when present; `npx tsc --noEmit` and `npm run lint` → clean
- [ ] Commit `feat(listing): lean filters — brand, country, price, in-stock; country from URL`

### Task 4: Listing Playwright coverage + fixture updates

**Files:**
- Modify: `tests/mobile-fixtures.ts` (mock `ProductBrands` → `[Samyang 49, OTTOGI 42, SEMPIO 41, SEN SOY 37, Nongshim 36, Edo Japan 35, Holika Holika 34, Chung Jung One 28, Nestlé 27, S&B 16]`; option `brands: 'empty' | 'error'`; option `beforeProductBrandsResponse` replacing `beforeProductFilterFacetsResponse`)
- Modify: `tests/config-server.mjs` (`query ProductBrands` handler; drop `ProductFilterFacets` handler)
- Create: `tests/lean-filters.spec.ts`
- Modify: `tests/mobile-products-page.spec.ts` (ops lists 6-7/62-70/98-105 → `ProductBrands`; rewrite tests at 411-427 and 429-46x for the new groups), `tests/categories-browsing.spec.ts:422` → `ProductBrands`
- Modify: `playwright.config.ts` if a project uses a whitelist `testMatch` for desktop specs

Spec cases in `lean-filters.spec.ts` (desktop 1280×900 unless noted):
1. sidebar shows legends Marka, Kraj pochodzenia, Cena and the Tylko dostępne checkbox; no Wyklucz alergeny / Preferencje żywieniowe / Strefa przechowywania / Certyfikaty.
2. brand chip sends exact value: click `S&B` → next products request `variables.filter.brands` deep-equals `['S&B']`.
3. Tylko dostępne → `variables.filter.stockAvailability === 'IN_STOCK'`; unchecking removes it.
4. więcej: only 8 brand chips until the toggle; after click all 10; country shows 6 then all.
5. brand facet unavailable (`brands: 'error'`): no Marka legend, country chips still clickable, products load.
6. direct country URL `/pl/products?country=Japonia`: first products request already carries `countryOfOrigin: ['Japonia']`, chip `Japonia` has `aria-pressed=true`, active chip removable.
7. zone url keeps working: `/pl/products?zone=FROZEN` → request has `storageZone: 'FROZEN'` and an active chip "Mrożone" (or the localized zone label) with a remove button.
8. mobile (iphone-12 project): filter sheet shows the same reduced groups.

- [ ] Write specs → run `npx playwright test tests/lean-filters.spec.ts tests/mobile-products-page.spec.ts tests/categories-browsing.spec.ts --workers=1` → all green
- [ ] Commit `test(listing): lean filter contract (brand, in-stock, country url, zone url)`

### Task 5: Lean product cards

**Files:**
- Modify: `src/components/product/ProductCard.tsx` (remove allergen chips 534-543, facts line 610-613 and `scanFacts`/`displayCategory`/`displayCountryOfOrigin` 131-145; keep `storageLabel` for the badge aria)
- Modify: `src/components/product/MobileProductCard.tsx` (remove `scanFacts` 89-92 and 368-372; keep allergens passed to `addItem`)
- Modify: `tests/product-card-scan-value.spec.ts` (facts assertions → `toHaveCount(0)` for `product-card-facts` and `.allergen-chip` inside cards), `tests/catalog-display-localization.regression-1.spec.ts` (420-422, 475-476 → assert the localized country chip in the filter panel instead: EN `Poland`, PL `Polska`), `tests/mobile-layout.spec.ts:147` (`toHaveCount(0)`)

- [ ] Edit, run the three specs → green; `npx tsc --noEmit`, `npm run lint`
- [ ] Commit `feat(cards): drop allergen chips and the facts line; cold-chain badge stays`

### Task 6: "Kuchnie" menu in the header

**Files:**
- Create: `src/lib/cuisines.ts`
- Create: `src/components/layout/CuisineMenu.tsx`
- Modify: `src/components/layout/Header.tsx` (desktop nav after `navItems.map` ~452; `mobileShopItems` 354-357)
- Modify: `src/messages/pl.json`, `src/messages/en.json` (`nav.cuisines` "Kuchnie"/"Cuisines"; `nav.cuisine.japanese` "Kuchnia japońska"/"Japanese cuisine", `korean` "Kuchnia koreańska"/"Korean cuisine", `chinese` "Kuchnia chińska"/"Chinese cuisine", `thai` "Kuchnia tajska"/"Thai cuisine", `vietnamese` "Kuchnia wietnamska"/"Vietnamese cuisine"; `nav.cuisinesMenuLabel` "Menu kuchni"/"Cuisines menu")
- Create: `tests/cuisines-menu.spec.ts`
- Modify: `tests/landing-responsive-grid.spec.ts:240` (assert the `Kuchnie` trigger is in the desktop nav instead of the Korean pantry link, if that test uses the static config)

```ts
// src/lib/cuisines.ts
export type CuisineKey = 'japanese' | 'korean' | 'chinese' | 'thai' | 'vietnamese';
export interface CuisineLink { key: CuisineKey; country: string }
// Country values are the Polish names stored in products.country_of_origin.
export const CUISINE_LINKS: CuisineLink[] = [
  { key: 'japanese', country: 'Japonia' },
  { key: 'korean', country: 'Korea Południowa' },
  { key: 'chinese', country: 'Chiny' },
  { key: 'thai', country: 'Tajlandia' },
  { key: 'vietnamese', country: 'Wietnam' },
];
export function buildCuisineHref(country: string) {
  return `/products?country=${encodeURIComponent(country)}`;
}
```

`CuisineMenu` (client): `<div className="relative" onMouseEnter/onMouseLeave(120 ms close)/onFocus/onBlur>` containing `<button type="button" aria-haspopup="true" aria-expanded data-testid="cuisine-menu-trigger">Kuchnie</button>` and, when open, `<nav aria-label={t('cuisinesMenuLabel')} data-testid="cuisine-menu">` with one `Link` per cuisine (`href=buildCuisineHref(country)`, `aria-current="page"` when `pathname === '/products'` and `searchParams.getAll('country')` includes the country). Escape closes. Click on the trigger toggles (touch/keyboard).

Spec cases:
1. desktop: hover trigger → 5 links visible; click "Kuchnia japońska" → URL `/products?country=Japonia`; products request `countryOfOrigin: ['Japonia']`; country chip active.
2. switch cuisine while on listing: from step 1, hover and click "Kuchnia koreańska" → URL `country=Korea%20Po%C5%82udniowa`, next request `countryOfOrigin: ['Korea Południowa']`, previous chip no longer pressed.
3. keyboard: focus trigger, Enter opens, Escape closes.
4. mobile (iphone-12): open menu → "Kuchnia japońska" link visible → click → `/products?country=Japonia`.

- [ ] Write spec (fail) → implement → green; register the spec in any whitelist project
- [ ] Commit `feat(header): "Kuchnie" menu by country of origin`

### Task 7: Retire "Koreańska spiżarnia" in config

**Files:**
- Modify: `public/config/asiandeligo.json` (`quick-korean-pantry.enabled` → false; collection `korean-pantry.enabled` → false; remove the footer link object whose href is `/collections/korean-pantry`)
- Modify: `tests/static-config-contract.test.mjs:96` (`enabled` false) and add `assert.equal(config.commercial.quickLinks.some((link) => link.enabled), false)` and footer links not containing `/collections/korean-pantry`
- Leave: code label overrides (`Header.tsx:80`, `Footer.tsx:82`, `nav.koreanPantry`) — the test config still exercises them.

- [ ] `node --test tests/static-config-contract.test.mjs` → green; commit `chore(config): retire the Korean pantry quick link, collection and footer link`
- [ ] Note for Paul: the LIVE config (admin `asiandeligo-admin.eshoper.pro`, version 55) carries the same three entries; they must be switched off in the admin panel after deploy (Frontend configuration → Commercial: quick link off, collection off; Layout → Footer: remove the link).

### Task 8: Verify, preview, hand-off

- [ ] `npm run lint`, `npx tsc --noEmit`, full `npx playwright test --workers=1` (memory: check `user-1000.slice` first) — report counts
- [ ] Backend: land `storefront-brand-facets` via `scripts/session.sh land`, rebuild dev backend (`scripts/fast-build.sh --backend`) so ADG dev has `productBrands`
- [ ] `deploy/adg-dev.sh --from /home/paul/work/grocery-front-with-admin-worktrees/cuisines-lean-filters --only storefront` → screenshots of `/`, `/products`, `/products?country=Japonia`, `/categories/makaron-i-ryz` on `adg-dev.159.195.47.45.sslip.io` for Paul
- [ ] After Paul's OK: storefront lane (`deploy/deploy-asiandeligo-contabo.sh --commit <sha> --check-only` then `--yes`) BEFORE the backend lane; backend lane after 21:00 Warsaw or `--force-peak` only with Paul's separate approval
