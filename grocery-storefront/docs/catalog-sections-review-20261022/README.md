# Catalog section and product information review — 22 October 2026

Owner-approved phase after the gallery identity corrections. The application
change is prepared and available on DEV; no production application release was
performed by this task.

## Behavior

- Cuisine menu and homepage links include only food/drinks, constrained at the
  API before pagination, counts and facets. Metadata loading/failure/empty states
  block the listing; Retry recovers the same scope. Country alone remains an
  independent filter for every kind of merchandise.
- Separate Beauty / Kosmetyki and Kitchenware / Akcesoria navigation entries;
  full category labels include personal care and tableware in PL/EN. Existing
  category and product URLs remain valid.
- Cosmetics display their existing description/directions and INCI. Kitchenware
  displays its existing description/information. Food sections, food warnings,
  nutrition controls, dietary/freshness badges and recipes depend on category
  identity, not incidental ingredients or imported nutrition fields. Unknown
  categories stay neutral; known food with missing data retains missing-label UI.
- No catalog data, images, prices, stock, origins, fulfillment configuration,
  schema or dependencies were changed in this phase. The prior 13 physical
  packaging cases and ADG-000119 ingredient conflict remain unresolved separately.

## Verification

- 23 unit cases, full TypeScript, changed-source ESLint and diff checks passed.
- 92 distinct affected browser cases passed across the initial and focused runs.
  Initial failures were corrected SSR fixture identities, navigation locators, a
  mixed-category fixture cohort and an obsolete category-index count assertion.
  Product/navigation assertions were preserved.
- Isolated temporary mutations classified cosmetics as food and removed category
  intersection. Both caused the intended unit failures; working source stayed
  untouched.
- Production build and standalone smoke passed. Immutable DEV source commit
  `e094e93f6f43`; release `storefront-e094e93f6f43-20261022T104653Z`;
  BUILD_ID `jDn9iO6Nqu-U0dICUPXXf`. Local DEV health returned 200.
- 34 additional real DEV checks passed without page errors: PL/EN home/navigation
  at 320, 390, 1280 and 1440px, both non-food categories and real cosmetic/tool
  pages at 390/1440px, and all five cuisine listings in both languages. Screenshots
  attached here were visually inspected.
- Real DEV food counts: KR380, JP376, CN256, TH170, VN57; each request used the
  current 51 food-category IDs and every returned first-page product had food
  ancestry. The earlier production snapshot/API had TH169 and VN58; DEV is a
  separate catalog copy. No database synchronization was performed.
- Full production snapshot classification: 1,560 food, 37 cosmetics, 181 kitchenware,
  zero unknown. This is category membership verification, not physical stock/EAN
  confirmation or verification of every source description/INCI claim.

## Preview

Protected DEV: https://adg-dev.159.195.47.45.sslip.io

- Korean cuisine: `/products?country=Korea%20Po%C5%82udniowa&type=food`
- Beauty: `/categories/kosmetyki-koreanskie`
- Kitchenware: `/categories/akcesoria-kuchenne`
- English: same paths prefixed with `/en`.

Preview rollback retains the former immutable DEV release via the existing
`previous` symlink. A future production release must inspect its actual then-live
application baseline and follow the guarded Asia Deli Go lane; this branch also
contains prior audit documentation and is based on the current development trunk.
