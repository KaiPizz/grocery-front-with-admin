# Feature Progress

> **Last updated:** 2026-07-22
>
> Status key: ✅ Done · 🔧 Partial · ❌ Not started · 🐛 Has known issues

---

## 2026-07-22 Asia Deli Go Taxonomy And Search Quality Candidate

- Assigned all 69 non-empty production category slugs explicitly to the ten
  public storefront groups, removing live dependence on loose keyword routing.
  Tableware/tea sets, coffee brewers, sushi serving sets, rice vinegar,
  instant bowl noodles, Yopokki/Rapokki soups, and kombu seaweed now belong to
  their intended public groups.
- Expanded the tenant-correlated backend search candidate to rank product
  names, brands, translations, category names/slugs, product codes, and active
  variant SKU/barcode/EAN. Compact identifiers use indexed exact pre-lookups;
  no identifier or description substring scan is added. Accent/category/typo
  fallback is limited to public catalogs of at most 5,000 products, and typos
  compare one bounded letter-only token with similarly sized words via
  `pg_trgm`; larger catalogs stay on indexed FTS plus exact identifiers.
- Autocomplete preserves the backend relevance order and keeps a localized
  no-result dropdown open. Search fixtures now filter by the submitted query
  instead of returning the complete fixture catalog.
- Added a reusable production audit contract with 32 cases / 36 unique queries
  across identifiers, products, brands, categories, Polish accents, typos,
  multi-token searches, English translations, and negative controls. It checks
  both the direct GraphQL endpoint and storefront proxy in sequential batches
  capped at six searches, preventing both URLs from doubling backend load.
- Validation is green: 9 audit unit tests, 70 focused Playwright cases on
  iPhone/Pixel, 34 backend search tests, exact-file ESLint, TypeScript, and both
  backend/Next.js production builds. Read-only production checks confirmed the
  proposed match thresholds, bounded the two-character `go` query to 208 Asia
  Deli Go products, and returned zero for eight negative controls; no database
  write was performed.
- Production is intentionally unchanged. Its recorded pre-deploy baseline
  remains red for compact SKU/EAN, four category intents, three typos, and two
  accent-equivalence pairs, which the post-deploy audit must turn green.

## 2026-07-21 Asia Deli Go Catalog Data Remediation Preparation

- Added an evidence-backed exact-six catalog decision set covering allergens,
  storage, nutrition, comparison-unit prices, and two category corrections.
- The Bento nutrition decision uses a three-source exact-EAN consensus; the
  suspicious Dubai Chocolate salt value is intentionally held for a physical
  or importer-label check and is not changed by this batch.
- Generated one-shot SERIALIZABLE apply/rollback SQL with exact tenant,
  product, variant, category, status, old-value, and `updated_at` guards.
- Apply captures a persistent explicit-column backup and decision-SHA audit
  trail before mutation; rollback refuses intervening product edits.
- A production-shape disposable PostgreSQL rehearsal passed apply, exact
  rollback, duplicate-run rejection, stale-row rejection, and intervening-edit
  rollback rejection. After separate owner approval, production apply committed
  on 2026-07-22 as transaction `7045960`: six backups, six exact product
  updates, 6/6 GraphQL target matches, all PDP/health/auth checks green, and no
  variant/category writes. The rollback artifact remains unexecuted and gated.

## 2026-07-21 Asia Deli Go Discovery Main Integration

- Integrated the catalog search, relevance sorting, public-route SEO, product-card accessibility, and catalog audit candidate onto the latest enriched category/Korean-discovery main line.
- Preserved the live owner-configured visual category hub, Korean collection/category assets, and hardened remote-image proxy while reconciling the shared taxonomy fixtures.
- Consolidated category and collection metadata under their shared layouts so configured branding, locale alternates (including `x-default`), sharing images, and structured data are no longer masked by older page-level metadata.
- Restored URL-backed dietary deep links and made combined “Clear all” actions remove search, sort, and dietary state in one atomic navigation while preserving unrelated campaign parameters.

## 2026-07-21 Asia Deli Go Product Image Density Fix

- Desktop product-detail galleries now use the full media grid column instead
  of collapsing into a small square at its top-left edge. The viewport-height
  cap remains useful on short screens without transferring its limit to the
  gallery width.
- PDP package images keep `object-contain` so labels are never cropped, while
  reduced frame padding gives the product more visual weight. Listing-card
  primary and carousel images now use the same compact padding, preventing a
  size jump when the preview changes.
- Added Playwright regression coverage for full-width desktop gallery geometry,
  contained image fit, compact media padding, and matching product-card image
  density. Existing 320px thumbnail-overflow coverage remains green.
- Verified at 1440x800 (584px media column / 584px frame) and short 1366x600
  (584px media column / 584px frame, height safely capped to 472px), plus 48
  related Playwright tests, lint, TypeScript, and the production build.
- Production is unchanged; this candidate still requires the guarded Asia Deli
  Go release flow and fresh owner approval before activation.

## 2026-07-21 Asia Deli Go Landing Responsive And Category Image Foundation

- The complete desktop header now starts at the measured safe `xl` breakpoint
  instead of `md`. Tablet and small-laptop widths keep the direct search/cart/
  account controls plus a compact navigation drawer without horizontal page
  overflow.
- Grid banner blocks now support a backwards-compatible `contain` / `cover`
  image-fit setting. Existing configs default to the unchanged `contain`
  package-image treatment; full-frame category artwork can opt into `cover`.
- New rectangular grid-banner uploads require 800x800 source images for near
  DPR-2 desktop sharpness, while round-grid uploads remain on their existing
  contract. Admin previews use the same fit mode as the storefront.
- Focused regressions cover guest and authenticated behavior from 375 through
  1600px (including a deliberately long account name), both directions across
  the 1279/1280 breakpoint while menus are open,
  schema preservation/rejection, and both storefront image-fit modes.
- Validation is green: 84 admin unit tests, 42 landing/mobile/category E2E
  tests, TypeScript and lint for both apps, both production builds, both
  standalone production smokes, static-config contracts, and security headers.
- This foundation does not replace the live category artwork yet. New category
  assets should be exported as 800x800 WebP at no more than 120 KB each before
  rollout because the current image proxy does not resize originals.
- Production remains unchanged until the complete candidate passes the guarded
  check-only lane and receives owner deploy approval.

## 2026-07-20 Asia Deli Go Auth Polish And Release Gate

- Customer login and registration now announce validation/API errors, connect
  them to the affected fields, and move focus to the first invalid input.
- Clean guests receive a normal `200` session response without unnecessary
  refresh `401` noise, while refresh-cookie recovery and legacy-token migration
  remain covered.
- Known Polish admin-config navigation/footer copy is localized on English
  storefront routes, including stable Asia Deli Go brand tagline handling.
- The guarded production activator now verifies the new clean-guest `200`
  payload instead of the obsolete `401` contract. Production remains unchanged
  until the revised exact commit passes check-only and receives owner approval.

## 2026-07-18 Asia Deli Go Guarded Release Preparation

- Added a fail-closed, exact-commit release transaction for the standalone Asia
  Deli Go admin and storefront. It builds/tests on Netcup, validates production
  env files read-only on Contabo, ships checksum-verified standalone artifacts,
  swaps both releases atomically, and automatically restores both old code
  pointers if a health gate fails.
- The lane preserves the reviewed PM2 execution topology and runtime-variable
  fingerprints, admin data/uploads, Nginx, database, payment, and shipping. It
  also proves the runtime ports are blocked from direct Internet access.
- Retired the legacy storefront-only direct-copy deployment script and added an
  admin standalone production smoke test.
- Production has not been changed by this preparation. Exact-commit
  check-only validation and a fresh owner confirmation remain required before
  activation.

## 2026-07-13 Asia Deli Go Mobile Hero Full-Frame Fix

- Asia Deli Go hero slides now reuse the complete 1920x600 campaign artwork on mobile instead of cropped 768x480 left-half derivatives.
- Hero blocks with a complete set of dedicated mobile artwork keep the taller 1.6:1 mobile layout; blocks without it preserve the desktop artwork at 3.2:1, avoiding crop and layout distortion.
- Removed the six obsolete cropped mobile WebP files and synchronized static plus admin draft/published config to `mobileImageUrl: null`.
- Verified with storefront/admin production builds, storefront config tests (3/3), admin unit tests (25/25), config audit, and browser QA at 320px, 390px, and 1440px across all six slides. Production promotion remains gated behind the normal deploy approval.

## 2026-06-10 Kenmito Landing Visual Direction Polish

- Landing page now moves closer to the approved JaponiaCentralna/NaSushi reference direction without adding dishonest commerce claims: first viewport remains Kenmito green/serif/pickup-led, but the page is denser and more transactional.
- Desktop and mobile homepage now surface the trust strip near the hero, with only supported claims: pickup/self-collection, manual confirmation, live catalog availability, wishlist saving, and repeat-order cart readiness. Mobile uses a horizontal trust rail so the fixed bottom nav does not bury the strip.
- Category discovery now includes compact popular-category chips and more intentional fallback category visuals instead of large initial-letter blocks that read like loading placeholders.
- Homepage product cards on desktop now expose quantity and add-to-cart actions immediately, matching the product-first behavior learned from JaponiaCentralna, while preserving Kenmito's multi-image hover preview.
- Header polish now keeps the Kenmito wordmark visible on mobile, adds a NaSushi-style desktop wishlist hover/focus popover, and groups the mobile drawer into wishlist/cart, account, and shopping navigation sections.
- Tests were updated to lock the new transactional card behavior instead of the previous hover-only homepage action model.
- Intentionally skipped for now: fake shipping countdowns, fake review widgets, fake free-delivery thresholds, and inactive newsletter/payment/contact claims until owner-backed data exists.

### Completion Follow-Up

- Added a pickup-first desktop landing regression test covering header brand/search/cart/wishlist, hero CTA/product imagery, trust strip, category chips/fallback visuals, footer service notes, and absence of `href="#"` footer links.
- Strengthened product-card wishlist states on desktop and mobile with `aria-pressed`, visible saved-state chips, and focused E2E coverage while preserving the existing hover image preview behavior.
- Reworked category fallback art so categories without configured images render an intentional package/category surface instead of letter-block placeholder grids.
- Footer fallback now avoids inactive `#` links and only shows service/contact/service-note claims backed by config or fulfillment mode.
- Verified: `npm run test:e2e -- tests/mobile-homepage.spec.ts --project=pixel-7`, `npm run test:e2e -- tests/product-card-scan-value.spec.ts tests/wishlist-accessibility.spec.ts`, `npm run lint`, `npx tsc --noEmit`, and `git diff --check` (CRLF warnings only).

## 2026-06-09 Landing Product Card Hover And Density Fix

- Product card image preview layers no longer intercept wishlist clicks while cycling through multi-image media on hover/focus.
- Desktop product-card overlays now keep wishlist, freshness, and nutrition controls above decorative carousel layers with explicit stacking.
- Product card action rows no longer reserve bottom space for an invisible quantity unit label, bringing the bottom padding closer to NaSushi/JaponiaCentralna-style dense product cards.
- Product card primary images no longer scale beyond their no-crop container on hover, and carousel previews now provide an opaque backdrop so wide preview images do not expose the primary image underneath.
- Added Playwright regression coverage for wishlist hit-target ownership after hover, 44px wishlist control sizing, compact CTA bottom spacing, no-crop hover geometry, and carousel backdrop coverage.

## 2026-06-06 Kenmito Retail Polish And Checkout Readiness

- Product listing images now use a no-crop package policy and can display a secondary catalog image on desktop hover/focus when Zyra provides multiple `media` images.
- Product cards no longer repeat pickup, bank-transfer, and manual-confirmation operations chips on every item; those promises belong to page-level trust/checkout surfaces.
- Mobile product cards keep compact add/wishlist touch actions and reveal the full quantity stepper only after the product is in the cart.
- Product detail galleries now use contained package images, visible `1/n` counters, previous/next controls, and index-specific thumbnail labels while preserving the 320px overflow fix.
- Checkout now states the real launch blocker when backend returns no pickup/shipping or payment methods for the channel instead of implying a generic checkout handoff bug.
- Polish fulfillment copy touched by launch surfaces now uses correct diacritics.
- Backend audit from 2026-06-06 supersedes older notes that said Kamito had active `PICKUP` and `bank_transfer`: current production is browse-only and checkout remains NO-GO until backend links shipping/payment methods, maps warehouse if required, proves test orders, and wires staff order notification.

## 2026-06-06 Kenmito Catalog-First Homepage

- The legacy homepage hero now uses one responsive catalog-first visual system on mobile and desktop, with real product thumbnails from the existing product query and a clean no-media fallback.
- Availability-only storefronts now show visual real-category cards ordered by assortment size, configured commercial links, and a truthful pickup/bank-transfer/manual-confirmation trust strip.
- Generic homepage labels no longer claim category popularity or product recency without supporting data.
- Kenmito's hero copy now describes Asian pantry ingredients and pickup honestly; the image-less Korean pantry promo banner is disabled while its quick link and curated collection remain active.
- An explicitly empty or fully disabled `homepage.promoBanners` list now renders no carousel instead of falling back to generic promotional claims.
- Owner-approved logo, hero/category photography, contact details, and pickup/payment instructions remain open content work.

## 2026-06-06 Kenmito Display Brand And Promotion Cleanup

- The shopper-facing brand is now `Kenmito` in admin draft/published config and the tracked storefront static config; technical tenant/channel/slug/file identifiers remain `kamito`.
- The production canonical remains `https://kamito.enail.pro`.
- Kenmito Deals and Outlet surfaces are disabled because Zyra exposes no real sale data and the previous Outlet pointed at the regular Korean pantry collection.
- The shared homepage no longer fills a Deals shelf with regular products. A configured Deals section disappears after loading when the catalog has no discounted products.
- The Korean pantry collection remains enabled as an honest curated navigation surface.
- Misleading `Kontakt -> /privacy` and `Dostawa -> /terms` footer links were removed until real routes and owner content exist.
- Owner phone, email, address, prepared logo/favicon, pickup instructions, and bank-transfer instructions remain unresolved rather than being filled with guessed values.

## 2026-05-24 Kamito Launch Hardening Update

- Storefront `StorefrontConfig.general.fulfillment` is now synced across admin and storefront with delivery/backend/exact-stock defaults and Kamito pickup/bank-transfer/availability-only config.
- Header service strip, product detail, cart, checkout, and order confirmation now use generic fulfillment config so pickup tenants do not show false same-day shipping, free-shipping, exact-stock, or automated notification promises.
- `/categories` is now a grouped searchable category hub over real category links/counts; the homepage can show real category shortcuts plus commercial quick links instead of storage-zone cards when stock display is availability-only.
- `admin-panel/data/config-kamito.json` no longer tracks localhost media URLs; logo/favicon/image blocks are null/removed until owner assets are supplied.
- Added targeted Kamito config audit plumbing and launch Playwright coverage for pickup/bank-transfer truth, grouped categories, and mobile homepage category shortcuts.
- Backend follow-up confirmed Kamito uses shipping method id `PICKUP` and payment gateway `bank_transfer`; storefront launch tests now use that real pickup id and checkout shows a persistent error instead of redirecting when `checkoutComplete` returns `INSUFFICIENT_STOCK`.
- Storefront now supports explicit `NEXT_PUBLIC_STATIC_CONFIG_URL` fallback and tracks `public/config/kamito.json` so Kamito launch truth can load without a backend/admin config API and without touching shared backend or Chesaigon.


## Grocery Storefront

### Pages & Routes

| Feature | Status | Notes |
|---------|--------|-------|
| Homepage (`/`) | ✅ | Mobile + desktop layouts, hero section, Shop by Zone, Deals, Fresh Picks, Recipes. Config-driven section ordering and banner blocks. Skeleton loading states. 2026-05-22: admin Hero Banner blocks now occupy the first hero slot instead of rendering below the hardcoded legacy hero; legacy hero copy/CTA also reads `homepage.hero` config. 2026-06-06: Deals now renders real discounted products only and disappears when the loaded catalog has no sale pricing; Kenmito disables this section until backend sale data exists. 2026-06-06: the legacy hero now uses real catalog media across breakpoints; availability-only stores get visual category discovery and truthful fulfillment trust, and unsupported popularity/recency labels were removed. |
| Products listing (`/products`) | ✅ | Search, sort, category/zone/allergen/dietary/certification/price filtering, pagination. Responsive grid. 2026-05-15: listing state/filter/grid behavior moved into shared `ProductListingClient`; `/products` remains the uncategorized catalog surface while category pages pass category context into the same controls. 2026-05-24: standalone `/products` now exposes category filter chips in the desktop filter panel and mobile draft/apply filter sheet, matching the reference stores' category-first catalog pattern. 2026-05-24: committed filters now render an active-filter summary with result count, removable chips, clear-all action, and localized empty-state recovery copy. 2026-05-25: product listing cards opt into a catalog scan hierarchy for price/unit price, promo, availability-only stock, category/origin/storage facts, and Kamito pickup/bank-transfer/manual confirmation truth without changing homepage card surfaces. 2026-07-21: query result pages default to backend relevance, expose localized query titles/removable search chips, keep sort state in sync with the URL, and provide query-specific empty recovery. |
| Categories (`/categories`, `/categories/[slug]`) | ✅ | 2026-05-13: added flat-first category browsing from Zyra GraphQL `categories(channel)` and nested `Category.products(channel, first)`. Keeps empty storefront categories visible with Coming soon/Wkrótce badges, shows per-category `totalCount`, and renders category slug product grids with load-more support. 2026-05-14: refactored to SSR-first/no-JS first render, added deterministic GraphQL SSR Playwright mock coverage, and updated current admin config nav/footer links to expose `/categories`. 2026-05-15: category slug pages now reuse product listing sort/filter/grid controls and query `products(filter: { categories: [id], ... })` when JS is enabled, while preserving SSR/no-JS first render. |
| Commercial collections (`/collections/[slug]`) | ✅ | 2026-05-23: added config-backed curated landing pages with hero, optional image, and ordered tiles from `StorefrontConfig.commercial.collections`. Disabled or missing collections return 404. |
| Outlet (`/outlet`) | ✅ | 2026-05-23: added config-backed Outlet route. 2026-06-06: Kenmito disables the route and removes its links because mapping Outlet to the regular Korean pantry collection was misleading without sale semantics. |
| Product detail (`/products/[id]`) | ✅ | 15KB page. Image gallery, variants, nutrition info, allergens, add to cart, freshness badges. 2026-05-10: added mobile sticky add-to-cart bar (IntersectionObserver-driven), bumped tap targets to 44px, added in-stock + dynamic ship-promise strip ("In stock — ships today/tomorrow"), per-unit price now drops the sellByWeight gate (EU compliance for prepackaged grocery). 2026-05-11: sticky bar shifted from bottom-0 to calc(3.5rem + safe-area) so it stacks above MobileBottomNav. 2026-05-12: same-day-ship cutoff (HH:MM) and low-stock display threshold now read from `StorefrontConfig.general` (B22 + B23). 2026-05-12: add-to-cart price now falls back from variant pricing to product `priceRange` when variant pricing is missing. 2026-05-15: product breadcrumb category link now returns to the real `/categories/[slug]` route instead of the stale `/products?zone=` placeholder. 2026-05-24: PDP ProductGallery now renders ordered `media[]`, dedupes thumbnail fallback, and preserves the no-image package placeholder with Playwright coverage. 2026-05-24: PDP purchase panel now groups title/price/availability/pickup/bank-transfer/manual fulfillment/CTA/facts while preserving delivery low-stock shipping copy; food-label sections now render description, ingredients, allergens, nutrition table, storage/origin, and identifiers inline with missing-data collapse. 2026-05-24: PDP now renders same-category related products after label sections, excludes the current product, and skips the rail when category data or alternatives are missing. 2026-05-25: PDP now requests `media.sortOrder` from Zyra and sorts media by it before deduping the thumbnail fallback, with a Playwright regression for unordered backend media. 2026-05-25: fixed narrow mobile horizontal overflow caused by crowded gallery thumbnails forcing grid min-content width, with a 320px Playwright regression. 2026-05-25: mobile purchase controls now use a 320px-safe two-row panel layout, and the sticky bar shows price + add only so Polish CTA copy does not wrap while inline quantity controls remain 44px. |
| Recipes listing (`/recipes`) | ✅ | Recipe grid with cards. |
| Recipe detail (`/recipes/[slug]`) | ✅ | 11KB page. Steps, ingredients with product links, cook time, difficulty. 2026-05-12: add-all-to-cart accepts legacy variant `price`/`currency` when nested variant pricing is absent. |
| Cart (`/cart`) | ✅ | Storage zone grouping, quantity controls, save-for-later (→ wishlist), free shipping progress bar (desktop sidebar + 2026-05-10 mobile sticky bar), mobile sticky summary bar. 2026-05-12: free-shipping threshold now reads from `StorefrontConfig.general` (B21). 2026-05-12: accessibility audit pass for mobile cart; per-line actions now have product-specific accessible names and the hidden BottomNav/sticky checkout CTA contract is covered. 2026-05-12: cart line prices and subtotal fall back to positive product metadata when OMS cart cost returns zero. |
| Checkout (`/checkout`) | ✅ | Multi-step flow: delivery → shipping → payment → review. Saved address selection (auto-advance), promo codes, legacy Zyra checkout handoff, session draft persistence. 2026-05-10: progress bar now sticky-on-mobile (top: var(--header-height), z-30, backdrop-blur), static on desktop. 2026-05-12: accessibility audit pass for mobile checkout; invalid delivery fields focus the first error and connect `aria-describedby`, shipping/payment choices expose `aria-pressed`, inactive accordion panels are `aria-hidden` + inert, and the mobile summary toggle controls its panel. 2026-05-12: order summary now uses the corrected cart subtotal when OMS cart totals are zeroed. 2026-05-13: checkout payment methods now use backend `availablePaymentMethods(channel)` with `id` as `CheckoutPaymentInput.gateway`; promo apply/remove now use legacy checkout promo mutations after checkout creation instead of cart discount mutations. 2026-05-24: `checkoutComplete` `INSUFFICIENT_STOCK` errors now keep the shopper on checkout, show a visible stock banner, and rehydrate cart state. |
| Wishlist (`/wishlist`) | ✅ | Grid cards with images. Move-to-cart action. Remove action. 2026-05-12: accessibility audit pass for BottomNav tab flow; image links are removed from keyboard tab order and add/remove actions have product-specific accessible names. |
| Account (`/account`) | ✅ | Tab-based: Profile, Orders, Addresses. |
| Account → Orders (`/account/orders`) | ✅ | Order list panel. |
| Account → Order detail (`/account/orders/[id]`) | ✅ | Full order detail page (10KB). |
| Login (`/login`) | ✅ | Auth form component with validation. |
| Register (`/register`) | ✅ | Shared `AuthForm.tsx` handles both login and registration. |
| Privacy policy (`/privacy`) | ✅ | Static i18n content. |
| Terms of service (`/terms`) | ✅ | Static i18n content. |

### Components

| Component | Status | Notes |
|-----------|--------|-------|
| Header | ✅ | Sticky, responsive, hide-on-scroll (mobile), search, account dropdown, nav from config. 2026-05-12: added B8 shipping cutoff utility strip above the main nav row so same-day shipping promise is visible without cramping header controls. 2026-05-12: removed mobile-only wishlist/cart shortcuts so the mobile header stays to logo/search/menu while BottomNav owns Home/Wishlist/Cart. 2026-05-14: desktop Categories nav now opens a Kimchi-style mega menu; empty configured `navItems: []` falls back to default nav instead of hiding the header nav. 2026-05-14: mega menu hover path is flush with the header, uses a short close delay, locks background scroll while open, and closes from document-level Escape. 2026-05-23: commercial quick links from `StorefrontConfig.commercial.quickLinks` render after base desktop nav and inside the mobile menu without changing the category mega-menu trigger. 2026-05-23: theme toggle removed from desktop header and mobile menu; stale `grocery-theme` localStorage no longer controls `data-theme`. |
| CategoryMegaMenu | ✅ | 2026-05-14. Desktop-only category mega menu under Header Categories. Lazy-loads Zyra `categories(channel)` on first hover/focus, renders category columns, product counts/Coming soon labels, child category links when present, Browse all CTA, keyboard Escape close, and a visual feature tile from `Category.backgroundImage` when available. 2026-05-14: removed the transparent hover gap under the header and keeps pointer enter/leave ownership shared between the trigger and menu panel. |
| ShippingCountdown | ✅ | 2026-05-12. Header utility-bar widget for B8. Reads `StorefrontConfig.general.sameDayShippingCutoff`, falls back to `12:00`, server-renders static no-JS copy, hydrates into a 1-second HH:MM:SS countdown before cutoff, and switches to "ships tomorrow at HH:MM" at/after cutoff. |
| Footer | ✅ | Links, legal pages, branding. 2026-05-12: added B19 SocialBar consuming admin-configured `general.socialLinks` with accessible external icon links, unknown-platform fallback, duplicate/order preservation, and 44×44 mobile tap targets. |
| MiniCart | ✅ | Desktop hover cart preview with scrollable item list. 2026-05-12: total display uses shared corrected cart subtotal, covering zeroed OMS cart cost payloads. |
| SearchAutocomplete | ✅ | 13KB component. Auto-suggest with keyboard nav. 2026-07-21: replaced the empty external-index dependency with the tenant-scoped product listing search, added Unicode/SKU-aware local ranking and public-category suggestions, and switched menu/category metadata discovery to the slim no-count taxonomy query. |
| ProductCard | ✅ | 18KB. Desktop card with add-to-cart, wishlist toggle, sale badges, freshness. 2026-05-22: listing quantity stepper now switches to cart-backed quantity after add-to-cart and updates/removes the cart line directly. 2026-05-25: listing mode now surfaces promo state, broad availability, category/origin/storage facts, and pickup/bank-transfer/manual confirmation chips while preserving fast cart and wishlist actions. |
| MobileProductCard | ✅ | 9.6KB. Mobile-optimized variant. 2026-05-22: mobile listing stepper now mirrors the cart line after add-to-cart, including cart badge sync and remove-on-decrement-to-zero behavior. 2026-05-25: listing mode now adds dense scan facts, availability, promo, and pickup/bank-transfer/manual confirmation copy without exposing exact stock. |
| ProductListingClient | ✅ | 2026-05-15. Shared client listing shell for `/products` and `/categories/[slug]`: product query, category-scoped filter construction, sort, desktop filter panel, mobile draft/apply filter sheet, load-more, and responsive initial render for category no-JS coverage. 2026-05-24: all-products listings can now filter by discovered product categories while category pages keep their route-scoped category invariant. 2026-05-24: active committed filters are summarized outside the drawer/panel with removable chips so shoppers can see and recover from narrowed result sets. |
| RecipeCard | ✅ | Recipe card with metadata (time, difficulty, servings). |
| LanguageSwitcher | ✅ | Toggle between EN/PL. |
| ThemeToggle | ✅ | Removed 2026-05-23 by product decision; storefront is light-only and no toggle UI remains. |
| ScrollToTopButton | ✅ | Appears after scroll. 2026-05-25: mobile offset now clears the fixed BottomNav and PDP sticky purchase bar instead of covering bottom purchase chrome. |
| CheckoutProgress | ✅ | Step indicator bar for checkout flow. |
| ConfigProvider | ✅ | Runtime config injection via context + CSS variables. 2026-05-22: `NEXT_PUBLIC_CONFIG_API_URL` is now opt-in; when omitted/blank, storefront skips server/client config fetch instead of falling back to localhost. 2026-05-24: optional `NEXT_PUBLIC_STATIC_CONFIG_URL` can provide a static published config fallback for launch tenants without a production admin config API. |
| MobileBottomNav | ✅ | 2026-05-11. Fixed bottom nav (mobile-only). Active route highlight, hydration-gated count badges, safe-area-inset-bottom for hardware insets. Hidden on `/cart` + `/checkout/*` (own bottom CTAs). PD sticky add-to-cart stacks above. Supersedes the 2026-05-10 MobileFloatingCart pill. 2026-05-13: added Categories tab after B1 category browsing shipped; nav now exposes Home / Categories / Wishlist / Cart. |
| UnitPrice (grocery/) | ✅ | 2026-05-10. Tiny shared component for EU-mandated per-unit price line ("X zł / kg", "X zł / l"). Used on MobileProductCard, ProductCard, and PD page (price block + mobile sticky bar). Drops the prior `sellByWeight &&` gate so prepackaged items render too. Includes UNIT_LABELS mapping (KG → kg, LITER → l, etc.). |
| BlockRenderer | ✅ | Dispatches to block components. |
| HeroBanner | ✅ | Hero slider with slides. |
| GridBanner | ✅ | Multi-column promo grid. |
| HorizontalBanner | ✅ | Full-width single banner. |
| RoundGridBanner | ✅ | Circular category grid. |
| SidebarBanner | ✅ | Sidebar-style promotional banner. |
| SmallStickyBanner | ✅ | Sticky notification bar. |
| AllergenFilter | ✅ | Allergen-based product filtering. |
| FreshnessBadge | ✅ | Fresh / Expiring Soon / Last Chance badges. |
| NutritionModal | ✅ | Nutrition facts popup (7.5KB). |
| SortDropdown | ✅ | Product sort selector. |
| StorageZoneGroup | ✅ | Groups cart items by storage zone. |
| PromoBanner | ✅ | Homepage promotional banner. |
| Breadcrumb | ✅ | Breadcrumb navigation. |

### State Management (Zustand)

| Store | Status | Notes |
|-------|--------|-------|
| `cart-store` | ✅ | 29KB. Full cart lifecycle: create, add/update/remove lines, buyer identity, discount codes, delivery options, submit for completion. Persisted via Zustand persist. |
| `auth-store` | ✅ | Login, register, logout, token refresh, JWT decode fallback, session persistence. Clears cart + wishlist on logout. |
| `wishlist-store` | ✅ | 16KB. Guest + server sync, optimistic UI, hydration from product API, toggle/add/remove. Persisted locally with server sync when authenticated. |
| `salon-store` | ✅ | Salon slug + config. |
| `search-store` | ✅ | Search query state. |

### API Routes (Storefront)

| Route | Status | Notes |
|-------|--------|-------|
| `/api/graphql` | ✅ | GraphQL proxy to Zyra API with auth header forwarding. |
| `/api/addresses` | ✅ | Customer address CRUD. |
| `/api/image` | ✅ | Image proxy for external URLs. |
| `/api/proxy` | ✅ | Generic REST proxy. |

### Infrastructure

| Feature | Status | Notes |
|---------|--------|-------|
| i18n (EN + PL) | ✅ | `next-intl` with `[locale]` route group. Message files: `en.json` (15KB), `pl.json` (17KB). |
| Light-only theme | ✅ | 2026-05-23: storefront no longer exposes light/dark switching, removed `ThemeToggle` and the `theme-init` localStorage script. Dark CSS tokens remain inert for now; delete them only in a separate cleanup if needed. |
| Design system (CSS) | ✅ | 15 color tokens, freshness/zone/allergen colors, animation tokens, GPU-composited background, skeleton loading, hover utilities. |
| Responsive layout | ✅ | Mobile-first with separate mobile/desktop component variants on homepage. |
| Authentication | ✅ | JWT-based via Zyra, token + refresh token persistence, `SessionBootstrap` component. |
| Image handling | ✅ | CDN normalization (`normalizeImageUrl`), proxy route, Unsplash fallback, broken URL fixes. |
| Middleware | ✅ | Locale redirect + auth. |

---

## Admin Panel

### Pages

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard (`/admin`) | ✅ | 2026-05-15: upgraded from a generic overview into a first-publish hub with readiness summary, ordered setup checklist, and next-step CTA backed by centralized publish blockers. Existing summary cards/config links remain below the guidance layer. |
| Branding (`/admin/branding`) | ✅ | Store name, logo, 15 color tokens with color pickers. |
| Homepage (`/admin/homepage`) | ✅ | Hero toggle, section ordering, banner block builder. |
| General (`/admin/general`) | ✅ | General store settings. |
| Layout Config (`/admin/layout-config`) | ✅ | Header nav items, feature toggles (search, wishlist, language). 2026-05-23: added commercial navigation editor for quick links, curated collections, tiles, and outlet collection mapping. 2026-05-23: removed theme toggle control and `showThemeToggle` config field. |
| SEO (`/admin/seo`) | ✅ | Meta title, description, OG tags. |
| Tracking (`/admin/tracking`) | ✅ | Analytics script injection (GA, custom). |
| Media Library (`/admin/media`) | ✅ | Image upload, gallery browser. |
| Account security (`/admin/security`) | ✅ | 2026-07-18: authenticated self-service password change backed by persistent atomic auth state; success revokes prior sessions and returns to login. |
| Login (`/login`) | ✅ | Admin auth with session cookie. |

### Banner Block Editors

| Editor | Status | Notes |
|--------|--------|-------|
| HeroBannerEditor | ✅ | Slide management, images (1920×600 desktop + 768×240 full-frame mobile), per-slide desktop preview fallback, CTA links. 2026-07-13: aligned admin and storefront to the same 3.2:1 hero contract and restored six managed mobile assets without crop. |
| GridBannerEditor | ✅ | Multi-card editing with image upload. |
| HorizontalBannerEditor | ✅ | Single banner editing. |
| RoundGridBannerEditor | ✅ | Circular grid items with labels. |
| SidebarBannerEditor | ✅ | Sidebar promotional editing. |
| SmallStickyBannerEditor | ✅ | Sticky bar text + styling. |
| BlockBuilder | ✅ | Add/remove/reorder blocks. |
| BannerImageUploader | ✅ | Upload with preview. |
| CircularGridEditor | ❌ | Stub file (45 bytes). Not implemented. |
| GradientPicker | ❌ | Stub file (45 bytes). Not implemented. |
| ImageSizeHint | ❌ | Stub file (45 bytes). Not implemented. |
| LongBannerEditor | ❌ | Stub file (45 bytes). Not implemented. |
| SliderBlockEditor | ❌ | Stub file (45 bytes). Not implemented. |

### Admin API Routes

| Route | Status | Notes |
|-------|--------|-------|
| `/api/config/[slug]` | ✅ | GET published config, PUT draft/publish with `x-api-key` auth. |
| `/api/auth` | ✅ | Session login/logout. |
| `/api/auth/password` | ✅ | 2026-07-18: verifies the current password, rate-limits changes, atomically rotates the scrypt hash, and revokes prior sessions. |
| `/api/media` | ✅ | Upload handling. |
| `/api/health` | ✅ | Health check endpoint. |

### Admin Components

| Component | Status | Notes |
|-----------|--------|-------|
| SaveBar | ✅ | Draft save + publish workflow. |
| ColorPicker | ✅ | HSL color picker for branding. |
| ImageUploader | ✅ | File upload with preview. |
| MediaLibrary | ✅ | Gallery with selection (6.7KB). |
| FormCard | ✅ | Card wrapper for form sections. |
| FieldLabel | ✅ | Labeled form field. |
| PageHeader | ✅ | Admin page header. |

---

## Cross-Cutting

| Feature | Status | Notes |
|---------|--------|-------|
| Config sync (admin → storefront) | ✅ | Draft/publish flow, 5-min cache TTL on storefront side. 2026-05-22: optional for storefronts like Kamito; omitting `NEXT_PUBLIC_CONFIG_API_URL` disables config fetch and uses built-in fallbacks. 2026-05-23: `commercial` config defaults are normalized on admin read and storefront server/client config fetches so older stored configs do not crash new code. 2026-05-23: restored Kamito homepage banner blocks after the main merge introduced a tracked Kamito config with empty `homepage.blocks`. |
| Asia Deli Go homepage merchandising | ✅ | 2026-07-21: filters the verified locale-specific hero artwork, groups nine configured categories into one compact browse section, moves the product shelf ahead of a single promotion, replaces the uncurated repeated-product campaign for this config with a truthful pickup guide, and suppresses known placeholder contact data. Verified with TypeScript, ESLint, production build, static-config contracts, focused Playwright suites, 390px visual QA, and production-server HTTP smoke checks. |
| Type sync (`StorefrontConfig`) | ✅ | Defined in both apps — must be kept in sync manually. 2026-05-23: added synced `CommercialConfig`, `CommercialQuickLink`, `CommercialCollection`, and outlet config types. 2026-05-23: removed `layout.header.showThemeToggle` from both type definitions. |
| Zyra checkout backend contract tests | ✅ | 2026-05-13: added `npm run test:checkout-contract` to lock payment-method and legacy checkout promo GraphQL contracts from the backend bot session. |
| E2E tests (Playwright) | 🔧 | Test infrastructure set up, mock-route pattern established. Coverage unknown — need audit. 2026-05-11: added spec-first testing rule after finding implementation-shaped assertions in mobile product layout tests. 2026-05-12: added true RED→GREEN spec-first B19 SocialBar coverage (12 runs green). 2026-05-12: added true RED→GREEN B8 shipping countdown coverage (16 runs green). 2026-05-12: repaired stale mobile homepage spec by replacing the blocked quick-categories assertion with shipped Shop-by-Zone behavior and deterministic config mocking. 2026-05-12: added deterministic SSR config mock server for Playwright, RED→GREEN SEO/tracking coverage, repaired PD sticky tests that assumed every mobile viewport could force the sticky state, and added homepage + Wishlist + Cart + Checkout accessibility coverage; full suite now 148/148 green. 2026-05-12: added RED→GREEN cart price-integrity coverage for zeroed OMS cart cost payloads across header, cart, and checkout. 2026-05-13: added B1 category browsing + BottomNav category coverage; targeted Pixel run printed 15/15 `ok`, but the Playwright process hung during teardown and timed out (tracked as harness debt). 2026-05-14: added no-JS SSR category coverage and targeted Pixel category + BottomNav runs returned cleanly. 2026-05-14: added RED→GREEN desktop category mega-menu coverage for hover, keyboard focus, visual tile, counts, coming-soon state, and category navigation. 2026-05-14: added regressions for header-attached mega-menu geometry and body scroll lock while the desktop menu is open. 2026-05-15: added RED→GREEN category listing filter coverage for desktop category-scoped `products` queries and mobile draft/apply category filters; targeted Pixel category and products-listing regressions passed. 2026-05-22: added RED→GREEN mobile homepage regression proving admin-configured hero block copy and CTA render in the first viewport. 2026-05-22: added RED→GREEN listing cart-controls regression for desktop/mobile product cards and hardened mini-cart price test to open via focus instead of touch-emulated hover. 2026-05-23: added RED→GREEN commercial navigation coverage for desktop quick links, mobile quick links, configured collection route, honest outlet route, 404 behavior, and category mega-menu preservation. 2026-05-24: added RED→GREEN `/products` category-filter coverage for desktop immediate filtering and mobile draft/apply semantics. 2026-05-24: added RED→GREEN active-filter summary and empty-result recovery coverage for desktop and mobile products listing. 2026-05-25: added RED→GREEN product card scan-value coverage for desktop and mobile listing cards, including price/unit price, promo, availability-only stock, category/origin/storage, pickup, bank transfer, manual confirmation, and preserved purchase controls. 2026-05-25: added RED→GREEN PDP gallery coverage that requires the detail query to request `media.sortOrder` and renders unordered backend media in display order before the thumbnail fallback. 2026-05-25: added RED→GREEN 320px PDP gallery overflow coverage for crowded thumbnail rows. 2026-05-25: added RED→GREEN regressions for 320px Polish PDP purchase controls and scroll-to-top/BottomNav overlap. |
| Error handling | ✅ | Consistent toast + banner pattern across checkout and forms. |
| Accessibility | 🔧 | ARIA labels on interactive elements, focus-visible ring, sr-only utility, landmark roles. 2026-05-10 mobile tap targets bumped to 44x44 (WCAG 2.5.5 AAA) on `MobileProductCard` + PD wishlist/add buttons. 2026-05-12: started page-by-page audit with homepage keyboard skip control to `main#main-content`, then audited Wishlist, Cart, and Checkout flows; saved/cart item actions now use product-specific accessible names, mobile cart checkout remains reachable without BottomNav, and checkout validation/choice/summary accordion states are covered by Playwright. Full audit still pending. |
| SEO meta tags | ✅ | Admin SEO config page exists. 2026-05-12: storefront `generateMetadata()` now reads published config for title, description, canonical, OG image, and favicon; covered by Playwright RED→GREEN spec. |
| Tracking scripts | ✅ | Admin tracking config exists. `TrackingScripts.tsx` component exists (3KB). 2026-05-12: Playwright verifies enabled Facebook Pixel, GA4, and GTM scripts inject after config refresh while disabled Hotjar stays absent. |

---

## Known Issues & Debt

| Issue | Severity | Notes |
|-------|----------|-------|
| 5 admin block editors are stubs | Low | `CircularGridEditor`, `GradientPicker`, `ImageSizeHint`, `LongBannerEditor`, `SliderBlockEditor` — all 45-byte placeholder files. |
| Checkout page is 1492 lines | Low | Functional but large. Could be split if more features are added. |
| Some E2E tests are implementation-shaped | Medium | Several mobile tests still assert exact DOM/CSS geometry (`getComputedStyle`, `boundingBox`, pixel thresholds) without an explicit PRD/spec anchor. 2026-05-12: repaired PD sticky tests to use the accessibility contract (`aria-hidden`) and an explicit short viewport for the out-of-view scenario, but broader audit remains. |
| Runtime-configured images still use raw `<img>` | Medium | 2026-05-25: scoped lint disables keep `npm run lint -- --max-warnings=0` clean on admin/runtime media surfaces (logo, banner blocks, PromoBanner, commercial blocks). Do not blindly convert to `next/image` until production admin/CDN image domains or a safe unoptimized loader policy are decided. |
| Playwright command hangs after successful targeted runs on Windows | Medium | 2026-05-13: targeted category/BottomNav run printed 15/15 `ok`, but `playwright.cmd` did not return before the shell timeout. No `:3018` or `:4199` listener remained afterward. Treat as harness teardown debt; do not use the timeout alone as product failure without checking per-test output/artifacts. |
| Admin panel lacks dedicated browser-level test coverage | Medium | 2026-05-15: first admin UX slice added focused unit coverage for publish-readiness logic, but admin pages still do not have their own Playwright/component test harness. Manual browser verification remains required for UI regressions until that layer exists. |
| Live `chesaigon` catalog regressed to 1 visible product | High | 2026-05-15: fresh GraphQL probe returned `totalCount: 1` for `products(channel:"chesaigon")`, contradicting the 2026-05-13 snapshot of 121 storefront-visible products. Product-data-dependent UI validation is unreliable until backend restores representative channel data or confirms a replacement source. |
| Kenmito production content still lacks owner assets/contact details | Medium | 2026-06-06: display branding and canonical URL are set, but phone, email, address, prepared logo/favicon/hero imagery, pickup/bank-transfer instructions, and legal/contact routing still need owner-approved production data. The existing 320x320 KENMITO JPG has excessive whitespace and is not wired as a production header logo. |
| Kamito tenant release audit intentionally fails until owner data exists | Medium | 2026-06-06: `npm run audit:kamito-config` now has the canonical URL and clean promotional config; it should continue to fail only for missing owner phone, email, and address until real values are supplied. |
| Kamito checkout backend methods are not wired in production | High | 2026-06-06 backend audit: `availablePaymentMethods(channel:"kamito")=[]` and `availableShippingMethods(channel:"kamito")=[]`, so checkout cannot complete. Frontend must not fake `bank_transfer` or `PICKUP`; backend must link/create the channel methods and prove guest/auth test orders. |
| Kamito backend ops notifications are not wired | High | 2026-05-24: backend confirmed `ORDER_CREATED` webhook/subscription is not configured and checkout completion emits no event. Storefront must not promise automated email/SMS; launch needs backend webhook/event wiring or manual ops order monitoring. |
| Kamito product media contains duplicate CDN assets | Medium | 2026-05-25: live CDN bytes confirm duplicate image files under different URLs on multi-image products, e.g. `KIMCHI-5216` sort orders 2/4 and 3/5 are exact SHA-256 matches, and `KIMCHI-5215` sort orders 2/4 match. Frontend URL de-dupe cannot catch this because URLs differ; backend importer/data cleanup needs to remove duplicate assets. |
| Asia Deli Go storefront PM2 topology is legacy | Low | 2026-07-18: port 3022 is bound to `0.0.0.0` and storefront runtime values remain in root-only PM2 metadata/dump. UFW blocks direct Internet access and `/root` is mode 0700. Purging the metadata and moving the listener to loopback must be a separate reviewed PM2-definition migration, not bundled into a code release. |

---

## Update Rules

**This file must be updated during implementation, not after.**

- **When you start a task:** Find the relevant row and verify the status is accurate before coding.
- **When you finish a feature:** Change status (❌ → 🔧 → ✅), update notes with what was done and today's date.
- **When you create something new:** Add a new row in the correct table immediately.
- **When you find a bug in existing work:** Change status to 🐛 and note what's broken.
- **When you discover tech debt:** Add it to "Known Issues & Debt" right away — don't wait.
- **When you fix a known issue:** Remove it from the debt table and update the feature's status.
