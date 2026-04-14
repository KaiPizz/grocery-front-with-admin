# Feature Progress

> **Last updated:** 2026-04-14
>
> Status key: ✅ Done · 🔧 Partial · ❌ Not started · 🐛 Has known issues

---

## Grocery Storefront

### Pages & Routes

| Feature | Status | Notes |
|---------|--------|-------|
| Homepage (`/`) | ✅ | Mobile + desktop layouts, hero section, Shop by Zone, Deals, Fresh Picks, Recipes. Config-driven section ordering and banner blocks. Skeleton loading states. |
| Products listing (`/products`) | ✅ | 39KB page. Category filtering, search, sort, zone filtering, pagination. Responsive grid. |
| Product detail (`/products/[id]`) | ✅ | 15KB page. Image gallery, variants, nutrition info, allergens, add to cart, freshness badges. |
| Recipes listing (`/recipes`) | ✅ | Recipe grid with cards. |
| Recipe detail (`/recipes/[slug]`) | ✅ | 11KB page. Steps, ingredients with product links, cook time, difficulty. |
| Cart (`/cart`) | ✅ | Storage zone grouping, quantity controls, save-for-later (→ wishlist), free shipping progress bar, mobile sticky summary bar. |
| Checkout (`/checkout`) | ✅ | 1492-line multi-step flow: delivery → shipping → payment → review. Saved address selection (auto-advance), promo codes, legacy Zyra checkout handoff, session draft persistence. |
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
| Header | ✅ | Sticky, responsive, hide-on-scroll (mobile), search, account dropdown, nav from config. |
| Footer | ✅ | Links, legal pages, branding. |
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
| E2E tests (Playwright) | 🔧 | Test infrastructure set up, mock-route pattern established. Coverage unknown — need audit. |
| Error handling | ✅ | Consistent toast + banner pattern across checkout and forms. |
| Accessibility | 🔧 | ARIA labels on interactive elements, focus-visible ring, sr-only utility, landmark roles. Audit not done. |
| SEO meta tags | 🔧 | Admin SEO config page exists. Actual meta tag injection on storefront pages not verified. |
| Tracking scripts | 🔧 | Admin tracking config exists. `TrackingScripts.tsx` component exists (3KB). Integration not verified. |

---

## Known Issues & Debt

| Issue | Severity | Notes |
|-------|----------|-------|
| 5 admin block editors are stubs | Low | `CircularGridEditor`, `GradientPicker`, `ImageSizeHint`, `LongBannerEditor`, `SliderBlockEditor` — all 45-byte placeholder files. |
| Checkout page is 1492 lines | Low | Functional but large. Could be split if more features are added. |
| Cart page destructures store | Low | `const { items, removeItem, ... } = useCartStore()` instead of individual selectors. Inconsistent with pattern in other pages. |

---

## Update Rules

**This file must be updated during implementation, not after.**

- **When you start a task:** Find the relevant row and verify the status is accurate before coding.
- **When you finish a feature:** Change status (❌ → 🔧 → ✅), update notes with what was done and today's date.
- **When you create something new:** Add a new row in the correct table immediately.
- **When you find a bug in existing work:** Change status to 🐛 and note what's broken.
- **When you discover tech debt:** Add it to "Known Issues & Debt" right away — don't wait.
- **When you fix a known issue:** Remove it from the debt table and update the feature's status.
