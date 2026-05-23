# Feature Progress

> **Last updated:** 2026-05-23
>
> Status key: ✅ Done · 🔧 Partial · ❌ Not started · 🐛 Has known issues

---

## Grocery Storefront

### Pages & Routes

| Feature | Status | Notes |
|---------|--------|-------|
| Homepage (`/`) | ✅ | Mobile + desktop layouts, hero section, Shop by Zone, Deals, Fresh Picks, Recipes. Config-driven section ordering and banner blocks. Skeleton loading states. 2026-05-22: admin Hero Banner blocks now occupy the first hero slot instead of rendering below the hardcoded legacy hero; legacy hero copy/CTA also reads `homepage.hero` config. |
| Products listing (`/products`) | ✅ | Search, sort, zone/allergen/dietary/certification/price filtering, pagination. Responsive grid. 2026-05-15: listing state/filter/grid behavior moved into shared `ProductListingClient`; `/products` remains the uncategorized catalog surface while category pages pass category context into the same controls. |
| Categories (`/categories`, `/categories/[slug]`) | ✅ | 2026-05-13: added flat-first category browsing from Zyra GraphQL `categories(channel)` and nested `Category.products(channel, first)`. Keeps empty storefront categories visible with Coming soon/Wkrótce badges, shows per-category `totalCount`, and renders category slug product grids with load-more support. 2026-05-14: refactored to SSR-first/no-JS first render, added deterministic GraphQL SSR Playwright mock coverage, and updated current admin config nav/footer links to expose `/categories`. 2026-05-15: category slug pages now reuse product listing sort/filter/grid controls and query `products(filter: { categories: [id], ... })` when JS is enabled, while preserving SSR/no-JS first render. |
| Commercial collections (`/collections/[slug]`) | ✅ | 2026-05-23: added config-backed curated landing pages with hero, optional image, and ordered tiles from `StorefrontConfig.commercial.collections`. Disabled or missing collections return 404. |
| Outlet (`/outlet`) | ✅ | 2026-05-23: added honest Outlet route backed by a configured commercial collection. No fake client-side sale listing is shipped without a confirmed Zyra sale filter. |
| Product detail (`/products/[id]`) | ✅ | 15KB page. Image gallery, variants, nutrition info, allergens, add to cart, freshness badges. 2026-05-10: added mobile sticky add-to-cart bar (IntersectionObserver-driven), bumped tap targets to 44px, added in-stock + dynamic ship-promise strip ("In stock — ships today/tomorrow"), per-unit price now drops the sellByWeight gate (EU compliance for prepackaged grocery). 2026-05-11: sticky bar shifted from bottom-0 to calc(3.5rem + safe-area) so it stacks above MobileBottomNav. 2026-05-12: same-day-ship cutoff (HH:MM) and low-stock display threshold now read from `StorefrontConfig.general` (B22 + B23). 2026-05-12: add-to-cart price now falls back from variant pricing to product `priceRange` when variant pricing is missing. 2026-05-15: product breadcrumb category link now returns to the real `/categories/[slug]` route instead of the stale `/products?zone=` placeholder. |
| Recipes listing (`/recipes`) | ✅ | Recipe grid with cards. |
| Recipe detail (`/recipes/[slug]`) | ✅ | 11KB page. Steps, ingredients with product links, cook time, difficulty. 2026-05-12: add-all-to-cart accepts legacy variant `price`/`currency` when nested variant pricing is absent. |
| Cart (`/cart`) | ✅ | Storage zone grouping, quantity controls, save-for-later (→ wishlist), free shipping progress bar (desktop sidebar + 2026-05-10 mobile sticky bar), mobile sticky summary bar. 2026-05-12: free-shipping threshold now reads from `StorefrontConfig.general` (B21). 2026-05-12: accessibility audit pass for mobile cart; per-line actions now have product-specific accessible names and the hidden BottomNav/sticky checkout CTA contract is covered. 2026-05-12: cart line prices and subtotal fall back to positive product metadata when OMS cart cost returns zero. |
| Checkout (`/checkout`) | ✅ | Multi-step flow: delivery → shipping → payment → review. Saved address selection (auto-advance), promo codes, legacy Zyra checkout handoff, session draft persistence. 2026-05-10: progress bar now sticky-on-mobile (top: var(--header-height), z-30, backdrop-blur), static on desktop. 2026-05-12: accessibility audit pass for mobile checkout; invalid delivery fields focus the first error and connect `aria-describedby`, shipping/payment choices expose `aria-pressed`, inactive accordion panels are `aria-hidden` + inert, and the mobile summary toggle controls its panel. 2026-05-12: order summary now uses the corrected cart subtotal when OMS cart totals are zeroed. 2026-05-13: checkout payment methods now use backend `availablePaymentMethods(channel)` with `id` as `CheckoutPaymentInput.gateway`; promo apply/remove now use legacy checkout promo mutations after checkout creation instead of cart discount mutations. |
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
| Header | ✅ | Sticky, responsive, hide-on-scroll (mobile), search, account dropdown, nav from config. 2026-05-12: added B8 shipping cutoff utility strip above the main nav row so same-day shipping promise is visible without cramping header controls. 2026-05-12: removed mobile-only wishlist/cart shortcuts so the mobile header stays to logo/search/menu while BottomNav owns Home/Wishlist/Cart. 2026-05-14: desktop Categories nav now opens a Kimchi-style mega menu; empty configured `navItems: []` falls back to default nav instead of hiding the header nav. 2026-05-14: mega menu hover path is flush with the header, uses a short close delay, locks background scroll while open, and closes from document-level Escape. 2026-05-23: commercial quick links from `StorefrontConfig.commercial.quickLinks` render after base desktop nav and inside the mobile menu without changing the category mega-menu trigger. |
| CategoryMegaMenu | ✅ | 2026-05-14. Desktop-only category mega menu under Header Categories. Lazy-loads Zyra `categories(channel)` on first hover/focus, renders category columns, product counts/Coming soon labels, child category links when present, Browse all CTA, keyboard Escape close, and a visual feature tile from `Category.backgroundImage` when available. 2026-05-14: removed the transparent hover gap under the header and keeps pointer enter/leave ownership shared between the trigger and menu panel. |
| ShippingCountdown | ✅ | 2026-05-12. Header utility-bar widget for B8. Reads `StorefrontConfig.general.sameDayShippingCutoff`, falls back to `12:00`, server-renders static no-JS copy, hydrates into a 1-second HH:MM:SS countdown before cutoff, and switches to "ships tomorrow at HH:MM" at/after cutoff. |
| Footer | ✅ | Links, legal pages, branding. 2026-05-12: added B19 SocialBar consuming admin-configured `general.socialLinks` with accessible external icon links, unknown-platform fallback, duplicate/order preservation, and 44×44 mobile tap targets. |
| MiniCart | ✅ | Desktop hover cart preview with scrollable item list. 2026-05-12: total display uses shared corrected cart subtotal, covering zeroed OMS cart cost payloads. |
| SearchAutocomplete | ✅ | 13KB component. Auto-suggest with keyboard nav. |
| ProductCard | ✅ | 18KB. Desktop card with add-to-cart, wishlist toggle, sale badges, freshness. 2026-05-22: listing quantity stepper now switches to cart-backed quantity after add-to-cart and updates/removes the cart line directly. |
| MobileProductCard | ✅ | 9.6KB. Mobile-optimized variant. 2026-05-22: mobile listing stepper now mirrors the cart line after add-to-cart, including cart badge sync and remove-on-decrement-to-zero behavior. |
| ProductListingClient | ✅ | 2026-05-15. Shared client listing shell for `/products` and `/categories/[slug]`: product query, category-scoped filter construction, sort, desktop filter panel, mobile draft/apply filter sheet, load-more, and responsive initial render for category no-JS coverage. |
| RecipeCard | ✅ | Recipe card with metadata (time, difficulty, servings). |
| LanguageSwitcher | ✅ | Toggle between EN/PL. |
| ThemeToggle | ✅ | Light/dark mode toggle. |
| ScrollToTopButton | ✅ | Appears after scroll. |
| CheckoutProgress | ✅ | Step indicator bar for checkout flow. |
| ConfigProvider | ✅ | Runtime config injection via context + CSS variables. 2026-05-22: `NEXT_PUBLIC_CONFIG_API_URL` is now opt-in; when omitted/blank, storefront skips server/client config fetch instead of falling back to localhost. |
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
| Dark mode | ✅ | CSS variable-based with `data-theme="dark"` on `:root`. Complete dark palette in globals.css. |
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
| Layout Config (`/admin/layout-config`) | ✅ | Header nav items, feature toggles (search, wishlist, language, theme). 2026-05-23: added commercial navigation editor for quick links, curated collections, tiles, and outlet collection mapping. |
| SEO (`/admin/seo`) | ✅ | Meta title, description, OG tags. |
| Tracking (`/admin/tracking`) | ✅ | Analytics script injection (GA, custom). |
| Media Library (`/admin/media`) | ✅ | Image upload, gallery browser. |
| Login (`/login`) | ✅ | Admin auth with session cookie. |

### Banner Block Editors

| Editor | Status | Notes |
|--------|--------|-------|
| HeroBannerEditor | ✅ | Slide management, images (desktop + mobile), CTA links. |
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
| Config sync (admin → storefront) | ✅ | Draft/publish flow, 5-min cache TTL on storefront side. 2026-05-22: optional for storefronts like Kamito; omitting `NEXT_PUBLIC_CONFIG_API_URL` disables config fetch and uses built-in fallbacks. 2026-05-23: `commercial` config defaults are normalized on admin read and storefront server/client config fetches so older stored configs do not crash new code. |
| Type sync (`StorefrontConfig`) | ✅ | Defined in both apps — must be kept in sync manually. 2026-05-23: added synced `CommercialConfig`, `CommercialQuickLink`, `CommercialCollection`, and outlet config types. |
| Zyra checkout backend contract tests | ✅ | 2026-05-13: added `npm run test:checkout-contract` to lock payment-method and legacy checkout promo GraphQL contracts from the backend bot session. |
| E2E tests (Playwright) | 🔧 | Test infrastructure set up, mock-route pattern established. Coverage unknown — need audit. 2026-05-11: added spec-first testing rule after finding implementation-shaped assertions in mobile product layout tests. 2026-05-12: added true RED→GREEN spec-first B19 SocialBar coverage (12 runs green). 2026-05-12: added true RED→GREEN B8 shipping countdown coverage (16 runs green). 2026-05-12: repaired stale mobile homepage spec by replacing the blocked quick-categories assertion with shipped Shop-by-Zone behavior and deterministic config mocking. 2026-05-12: added deterministic SSR config mock server for Playwright, RED→GREEN SEO/tracking coverage, repaired PD sticky tests that assumed every mobile viewport could force the sticky state, and added homepage + Wishlist + Cart + Checkout accessibility coverage; full suite now 148/148 green. 2026-05-12: added RED→GREEN cart price-integrity coverage for zeroed OMS cart cost payloads across header, cart, and checkout. 2026-05-13: added B1 category browsing + BottomNav category coverage; targeted Pixel run printed 15/15 `ok`, but the Playwright process hung during teardown and timed out (tracked as harness debt). 2026-05-14: added no-JS SSR category coverage and targeted Pixel category + BottomNav runs returned cleanly. 2026-05-14: added RED→GREEN desktop category mega-menu coverage for hover, keyboard focus, visual tile, counts, coming-soon state, and category navigation. 2026-05-14: added regressions for header-attached mega-menu geometry and body scroll lock while the desktop menu is open. 2026-05-15: added RED→GREEN category listing filter coverage for desktop category-scoped `products` queries and mobile draft/apply category filters; targeted Pixel category and products-listing regressions passed. 2026-05-22: added RED→GREEN mobile homepage regression proving admin-configured hero block copy and CTA render in the first viewport. 2026-05-22: added RED→GREEN listing cart-controls regression for desktop/mobile product cards and hardened mini-cart price test to open via focus instead of touch-emulated hover. 2026-05-23: added RED→GREEN commercial navigation coverage for desktop quick links, mobile quick links, configured collection route, honest outlet route, 404 behavior, and category mega-menu preservation. |
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
| Runtime-configured images still use raw `<img>` | Medium | 2026-05-12: lint now only warns on admin/runtime image surfaces (logo, banner blocks, PromoBanner). Do not blindly convert to `next/image` until production admin/CDN image domains or a safe unoptimized loader policy are decided. |
| Playwright command hangs after successful targeted runs on Windows | Medium | 2026-05-13: targeted category/BottomNav run printed 15/15 `ok`, but `playwright.cmd` did not return before the shell timeout. No `:3018` or `:4199` listener remained afterward. Treat as harness teardown debt; do not use the timeout alone as product failure without checking per-test output/artifacts. |
| Admin panel lacks dedicated browser-level test coverage | Medium | 2026-05-15: first admin UX slice added focused unit coverage for publish-readiness logic, but admin pages still do not have their own Playwright/component test harness. Manual browser verification remains required for UI regressions until that layer exists. |
| Standalone `/products` has no category selector | Medium | 2026-05-15: category slug pages now pass category context into shared listing controls, but the uncategorized `/products` page still does not expose a category picker/filter of its own. Keep this separate from category-page listing UX. |
| Live `chesaigon` catalog regressed to 1 visible product | High | 2026-05-15: fresh GraphQL probe returned `totalCount: 1` for `products(channel:"chesaigon")`, contradicting the 2026-05-13 snapshot of 121 storefront-visible products. Product-data-dependent UI validation is unreliable until backend restores representative channel data or confirms a replacement source. |
| Kamito production content still lacks owner assets/contact details | Medium | 2026-05-23: cleaned `config-kamito.json` removes placeholders, localhost media, stale brand names, and dead footer links, but real logo/favicon/hero imagery, contact details, canonical URL, and legal/contact page routing still need owner-provided production data. |

---

## Update Rules

**This file must be updated during implementation, not after.**

- **When you start a task:** Find the relevant row and verify the status is accurate before coding.
- **When you finish a feature:** Change status (❌ → 🔧 → ✅), update notes with what was done and today's date.
- **When you create something new:** Add a new row in the correct table immediately.
- **When you find a bug in existing work:** Change status to 🐛 and note what's broken.
- **When you discover tech debt:** Add it to "Known Issues & Debt" right away — don't wait.
- **When you fix a known issue:** Remove it from the debt table and update the feature's status.
