# Feature Progress

> **Last updated:** 2026-05-12
>
> Status key: ✅ Done · 🔧 Partial · ❌ Not started · 🐛 Has known issues

---

## Grocery Storefront

### Pages & Routes

| Feature | Status | Notes |
|---------|--------|-------|
| Homepage (`/`) | ✅ | Mobile + desktop layouts, hero section, Shop by Zone, Deals, Fresh Picks, Recipes. Config-driven section ordering and banner blocks. Skeleton loading states. |
| Products listing (`/products`) | ✅ | 39KB page. Category filtering, search, sort, zone filtering, pagination. Responsive grid. |
| Product detail (`/products/[id]`) | ✅ | 15KB page. Image gallery, variants, nutrition info, allergens, add to cart, freshness badges. 2026-05-10: added mobile sticky add-to-cart bar (IntersectionObserver-driven), bumped tap targets to 44px, added in-stock + dynamic ship-promise strip ("In stock — ships today/tomorrow"), per-unit price now drops the sellByWeight gate (EU compliance for prepackaged grocery). 2026-05-11: sticky bar shifted from bottom-0 to calc(3.5rem + safe-area) so it stacks above MobileBottomNav. 2026-05-12: same-day-ship cutoff (HH:MM) and low-stock display threshold now read from `StorefrontConfig.general` (B22 + B23). |
| Recipes listing (`/recipes`) | ✅ | Recipe grid with cards. |
| Recipe detail (`/recipes/[slug]`) | ✅ | 11KB page. Steps, ingredients with product links, cook time, difficulty. |
| Cart (`/cart`) | ✅ | Storage zone grouping, quantity controls, save-for-later (→ wishlist), free shipping progress bar (desktop sidebar + 2026-05-10 mobile sticky bar), mobile sticky summary bar. 2026-05-12: free-shipping threshold now reads from `StorefrontConfig.general` (B21). |
| Checkout (`/checkout`) | ✅ | 1492-line multi-step flow: delivery → shipping → payment → review. Saved address selection (auto-advance), promo codes, legacy Zyra checkout handoff, session draft persistence. 2026-05-10: progress bar now sticky-on-mobile (top: var(--header-height), z-30, backdrop-blur), static on desktop. |
| Wishlist (`/wishlist`) | ✅ | Grid cards with images. Move-to-cart action. Remove action. |
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
| Header | ✅ | Sticky, responsive, hide-on-scroll (mobile), search, account dropdown, nav from config. 2026-05-12: added B8 shipping cutoff utility strip above the main nav row so same-day shipping promise is visible without cramping header controls. 2026-05-12: removed mobile-only wishlist/cart shortcuts so the mobile header stays to logo/search/menu while BottomNav owns Home/Wishlist/Cart. |
| ShippingCountdown | ✅ | 2026-05-12. Header utility-bar widget for B8. Reads `StorefrontConfig.general.sameDayShippingCutoff`, falls back to `12:00`, server-renders static no-JS copy, hydrates into a 1-second HH:MM:SS countdown before cutoff, and switches to "ships tomorrow at HH:MM" at/after cutoff. |
| Footer | ✅ | Links, legal pages, branding. 2026-05-12: added B19 SocialBar consuming admin-configured `general.socialLinks` with accessible external icon links, unknown-platform fallback, duplicate/order preservation, and 44×44 mobile tap targets. |
| MiniCart | ✅ | Desktop hover cart preview with scrollable item list. |
| SearchAutocomplete | ✅ | 13KB component. Auto-suggest with keyboard nav. |
| ProductCard | ✅ | 18KB. Desktop card with add-to-cart, wishlist toggle, sale badges, freshness. |
| MobileProductCard | ✅ | 9.6KB. Mobile-optimized variant. |
| RecipeCard | ✅ | Recipe card with metadata (time, difficulty, servings). |
| LanguageSwitcher | ✅ | Toggle between EN/PL. |
| ThemeToggle | ✅ | Light/dark mode toggle. |
| ScrollToTopButton | ✅ | Appears after scroll. |
| CheckoutProgress | ✅ | Step indicator bar for checkout flow. |
| ConfigProvider | ✅ | Runtime config injection via context + CSS variables. |
| MobileBottomNav | ✅ | 2026-05-11. Fixed bottom nav (mobile-only) with 3 icons: home / wishlist / cart. Active route highlight, hydration-gated count badges, safe-area-inset-bottom for hardware insets. Hidden on `/cart` + `/checkout/*` (own bottom CTAs). PD sticky add-to-cart stacks above. Supersedes the 2026-05-10 MobileFloatingCart pill — bottom nav covers cart visibility at all scroll positions. 2026-05-12: confirmed as the mobile owner for Home/Wishlist/Cart to avoid duplicate header shortcuts. Categories tab deferred until B1/B2 ship (3-icon stopgap per backlog plan). |
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
| Dashboard (`/admin`) | ✅ | Overview page (7KB). |
| Branding (`/admin/branding`) | ✅ | Store name, logo, 15 color tokens with color pickers. |
| Homepage (`/admin/homepage`) | ✅ | Hero toggle, section ordering, banner block builder. |
| General (`/admin/general`) | ✅ | General store settings. |
| Layout Config (`/admin/layout-config`) | ✅ | Header nav items, feature toggles (search, wishlist, language, theme). |
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
| Config sync (admin → storefront) | ✅ | Draft/publish flow, 5-min cache TTL on storefront side. |
| Type sync (`StorefrontConfig`) | ✅ | Defined in both apps — must be kept in sync manually. |
| E2E tests (Playwright) | 🔧 | Test infrastructure set up, mock-route pattern established. Coverage unknown — need audit. 2026-05-11: added spec-first testing rule after finding implementation-shaped assertions in mobile product layout tests. 2026-05-12: added true RED→GREEN spec-first B19 SocialBar coverage (12 runs green). 2026-05-12: added true RED→GREEN B8 shipping countdown coverage (16 runs green). 2026-05-12: repaired stale mobile homepage spec by replacing the blocked quick-categories assertion with shipped Shop-by-Zone behavior and deterministic config mocking. 2026-05-12: added deterministic SSR config mock server for Playwright, RED→GREEN SEO/tracking coverage, repaired PD sticky tests that assumed every mobile viewport could force the sticky state, and added homepage keyboard skip-control coverage; full suite now 136/136 green. |
| Error handling | ✅ | Consistent toast + banner pattern across checkout and forms. |
| Accessibility | 🔧 | ARIA labels on interactive elements, focus-visible ring, sr-only utility, landmark roles. 2026-05-10 mobile tap targets bumped to 44x44 (WCAG 2.5.5 AAA) on `MobileProductCard` + PD wishlist/add buttons. 2026-05-12: started page-by-page audit with homepage keyboard skip control to `main#main-content`, covered by Playwright on both mobile projects. Full audit still pending. |
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

---

## Update Rules

**This file must be updated during implementation, not after.**

- **When you start a task:** Find the relevant row and verify the status is accurate before coding.
- **When you finish a feature:** Change status (❌ → 🔧 → ✅), update notes with what was done and today's date.
- **When you create something new:** Add a new row in the correct table immediately.
- **When you find a bug in existing work:** Change status to 🐛 and note what's broken.
- **When you discover tech debt:** Add it to "Known Issues & Debt" right away — don't wait.
- **When you fix a known issue:** Remove it from the debt table and update the feature's status.
