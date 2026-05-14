---
title: Kimchi.pl Category Listing Page Research
created: 2026-05-14
updated: 2026-05-14
source: https://kimchi.pl/pol_m_Kimchi-842.html
status: research-note
---

# Kimchi.pl Category Listing Page Research

## Scope

This note studies the small category listing page after clicking `Kimchi` on Kimchi.pl:

- Source URL: https://kimchi.pl/pol_m_Kimchi-842.html
- Live probe date: 2026-05-14
- Viewports checked: desktop 1880x900, tablet 768x900, mobile 393x852
- Goal: learn layout and interaction patterns that should inform Enail's `/categories/[slug]` page. This is not a request to copy Kimchi.pl exactly.

## Main Takeaway

Kimchi.pl treats a category page as a browse-and-buy surface, not a decorative landing page. The page pushes shoppers into the product grid quickly, but keeps category navigation, filters, sort, product count, merchandising badges, quantity steppers, and add-to-cart controls within the same flow.

Enail's current `/categories/[slug]` is too thin by comparison: it has category title, optional child chips, product grid, and load more. It does not yet bring over the useful listing controls that already exist in `/products`.

## Observed Page Structure

### Desktop Layout

Kimchi.pl uses a constrained desktop container around 1300px wide. The category listing page is split into two columns:

- Left rail: about 25% width, around 325px in the 1880px viewport.
- Main content: about 75% width, around 975px in the same viewport.
- Product grid inside the main content shows 3 columns, each product card around 325px wide.
- A horizontal top nav sits above the category page content.
- Breadcrumb appears above the two-column content: `Strona glowna > Kimchi`.

Left rail order:

1. Category list with active category highlighted by a red vertical marker.
2. Availability filter.
3. Brand / producer filter with counts and show more/show less.
4. Product attribute filter with small icons, e.g. gluten-free, vegan, vegetarian.
5. Country of origin filter with counts.
6. Price range inputs.
7. Apply selected filters CTA.
8. Outlet promo image.

Main content order:

1. H1 category name: `Kimchi`.
2. Product count: `( ilosc produktow: 55 )`.
3. Category-specific warning block. For Kimchi this is a cold-chain / thoughtful-purchase notice.
4. Sort control, default `Najlepsza trafnosc`.
5. Product grid.
6. Floating review widget and scroll-to-top button appear on the right, but those are not core category UX.

### Product Card Pattern

Cards are commerce-dense and low-chrome:

- Large product image dominates the card.
- Badges sit top-left on the media area:
  - `W promocji`
  - `Przecena`
  - `Nasz bestseller`
  - `Chwilowo niedostepny`
- Wishlist heart sits top-right.
- Title is below the image.
- Main price is prominent.
- Unit price is displayed next to or below main price.
- Discounted products show 30-day lowest price text.
- Quantity stepper and `Dodaj do koszyka` CTA are inline on every in-stock product.
- Out-of-stock products switch to notify-when-available instead of add-to-cart.

This is the strongest pattern to reuse. The user can browse and buy directly from the category list without opening product detail pages.

### Mobile Layout

On mobile, Kimchi.pl does not keep the desktop sidebar visible:

- Header becomes compact: shipping countdown strip, logo, search, cart, hamburger.
- Breadcrumb is still shown near the top.
- Category title and product count are stacked.
- The warning block becomes large, centered, and highly visible.
- `Filtrowanie` becomes a full-width orange button before the product grid.
- Category/sidebar/filter panels are off-canvas, not inline.
- Product grid is 2 columns.
- Product cards remain buy-oriented, but the card content is tighter and therefore easier to overload.

This confirms the right mobile pattern for Enail: category browsing should be page/sheet-driven on mobile, not hover-driven.

## What Enail Should Reuse

Need:

- Category title + product count at the top of `/categories/[slug]`.
- Sort control on category pages, not just `/products`.
- Category-aware filters on category pages.
- Desktop left rail with category navigation and filters.
- Mobile filter sheet opened by a clear toolbar button.
- Active filter count and clear/reset affordance.
- Product cards with unit price, quantity stepper, wishlist, add-to-cart, and out-of-stock state.
- Category-specific informational banner when the category needs operational guidance, e.g. chilled/frozen handling.

Should:

- Use child category chips when backend category children exist.
- Add active filter chips above the grid after filters are applied.
- Keep an optional promo tile/banner in the sidebar, admin-configured or category-configured.
- Use sticky desktop filter rail only if it does not create nested scroll traps.
- Preserve SSR/no-JS first render for category title, count, and first product page.

Skip for now:

- Newsletter modal. It interrupts category shopping and should not be copied into this slice.
- Floating third-party rating widget. It competes with add-to-cart and mobile bottom UI.
- Product compare flow. Not needed for grocery MVP.
- Fake child categories. Current `chesaigon` taxonomy is flat; do not invent hierarchy.
- Brand / producer filter unless backend exposes producer/brand as a reliable product field.
- Exact orange visual treatment. Enail should use runtime theme tokens from admin config.

## Better Enail Direction

### Desktop Recommendation

Use a two-column listing page:

- Left rail width: 280-320px.
- Main area: flexible grid.
- Product grid:
  - 3 columns when rail is present on regular desktop.
  - 4 columns only on wide screens if card content still has room for title, price, and stepper.
- Top main header:
  - Breadcrumb.
  - H1 category name.
  - Product count.
  - Optional description.
  - Optional category notice.
- Toolbar below header:
  - Sort select.
  - Results count.
  - Active filter chips.
  - Clear all action when filters exist.
- Left rail sections:
  - Category siblings / all categories.
  - Availability or in-stock.
  - Storage zone.
  - Dietary tags.
  - Certifications.
  - Country of origin.
  - Price range.
  - Apply / reset.

Do not copy Kimchi.pl's large whitespace exactly. Their warning block consumes too much above-the-fold space. For Enail, use a compact alert band unless the category has a legally or operationally important warning.

### Mobile Recommendation

Use a mobile-first category header and a sticky-ish toolbar:

- Breadcrumb/back link.
- H1 + count.
- Optional description collapsed to 2-3 lines if long.
- Optional notice as a compact alert.
- Horizontal child category chips if children exist.
- Toolbar:
  - Sort select.
  - Filter button with active count.
- Filter opens as a bottom sheet:
  - Body scroll locked.
  - Safe-area-aware fixed apply button.
  - Clear all action.
  - Sections can be accordion/collapsible if the list gets long.
- Product grid stays 2 columns.

The current Enail mobile product cards are more polished than Kimchi.pl's, but they can become cramped. If category pages get filters and badges, make sure product title wraps enough to avoid hidden product distinctions.

## Data Mapping For Current Enail

Already available:

- Category: `id`, `slug`, `name`, `description`, `backgroundImage`, `parent`, `children`, `products.totalCount`.
- Product: `allergens`, `dietaryTags`, `certifications`, `storageZone`, `countryOfOrigin`, `pricePerUnit`, `unitOfMeasure`, `freshness`, `nearestExpiry`, `pricing.onSale`, variants and quantity.
- Product page already has filter logic for price, allergens, dietary tags, certifications, and storage zone.
- Product cards already support quantity steppers, wishlist, unit price, storage/freshness indicators, and out-of-stock state.

Missing or uncertain:

- Brand / producer field. Kimchi.pl leans heavily on this, but Enail should not add a fake brand filter.
- Country-of-origin filter exists as product data, but `/products` filter UI does not currently expose it.
- Category sort/filter through `Category.products(...)` may be too limited. For full filtering, prefer `products(filter: { categories: [categoryId], ... })` if the live Zyra contract supports it.
- Bestseller/recommended badges need a reliable backend/admin signal. Do not infer bestseller from sort order.

## Suggested Next Slice

Recommended approach: build a shared category-aware listing surface instead of maintaining separate product-grid logic.

1. Extract or adapt the useful listing controls from `/products` so `/categories/[slug]` can use them with category context.
2. Fetch category details SSR for the page header and initial no-JS product grid.
3. For interactive filtering/sorting, query `products(...)` with the category id in the filter, rather than relying only on nested `Category.products(...)`.
4. Add desktop left rail and mobile bottom-sheet filter.
5. Add active filter chips and result count.
6. Keep child category chips, but only from real backend `children`.
7. Cover with Playwright:
   - SSR category title/count/grid still renders without JS.
   - Desktop filter rail appears and applies a filter.
   - Mobile filter sheet opens, locks body scroll, applies, and closes.
   - Sort changes results or at least sends the correct query/URL state.
   - Out-of-stock product shows notify/disabled add-to-cart state if available in fixture.

## Tradeoffs

Option A: Minimal patch to `CategoryProductGrid`

- Add sort, filters, and mobile sheet directly inside `CategoryProductGrid`.
- Fastest.
- Bad because it duplicates `/products` logic and makes the category component too heavy.

Option B: Reusable listing module

- Extract listing state, filter panel, sort toolbar, and grid rendering from `/products`.
- Use it from both `/products` and `/categories/[slug]`.
- Best long-term fit, but more refactor risk.

Option C: Keep `/categories/[slug]` simple and redirect advanced filtering to `/products?category=...`

- Low risk.
- But it makes category pages feel unfinished and breaks the browse-and-buy lesson from Kimchi.pl.

Recommendation: Option B, but cut it carefully. The current `/products` page is already large and cohesive, so do not over-abstract everything. Extract only the filter/sort/grid primitives needed by both pages.

## Tomorrow Checklist

- Verify live Zyra supports `products(filter: { categories: [id] })` with sort and the existing filter inputs.
- Decide whether `/categories/[slug]` owns filtering directly or routes to `/products?category=<slug>`.
- If building directly, design the shared listing API before touching JSX.
- Keep the first implementation boring:
  - category rail,
  - sort,
  - filter sheet,
  - active chips,
  - product grid.
- Do not spend time on newsletter, ratings widget, compare products, or fake brand filters.

