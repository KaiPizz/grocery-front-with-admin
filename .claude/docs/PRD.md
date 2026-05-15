# Product Requirements Document (PRD)
## Grocery Storefront + Admin Panel

**Date:** 2026-04-14
**Author:** KaiPizz & Claude
**Version:** 2.0

---

## 1. Overview

### 1.1 Product Summary
A white-label grocery e-commerce storefront paired with an admin configuration panel. Store owners customize their storefront's branding, layout, banners, and content through the admin panel, while the Zyra platform handles the backend — products, orders, authentication, and payments. The storefront is free; Zyra is the paid subscription service.

### 1.2 Vision
Any grocery store can launch a beautiful, branded online store in minutes — without writing code, without hiring developers. The storefront feels like it was custom-built for their brand, but it's powered by a shared, continuously improving platform.

### 1.3 Target Users

| User | Device | Description |
|------|--------|-------------|
| **Shoppers** | Mobile (80%), Desktop (20%) | Customers browsing and buying groceries online |
| **Store staff** | Desktop / Tablet | Store owners and employees who configure the storefront via admin panel |

---

## 2. Goals & Success Metrics

### 2.1 Goals
- Let store owners fully customize storefront appearance without touching code
- Deliver a fast, warm, mobile-first shopping experience for 500-1000 product catalogs
- Plug seamlessly into Zyra's backend for products, cart, auth, and orders

### 2.2 How We'll Know It's Working
- Store owners can go from setup to published storefront independently
- Shoppers can browse, search, and complete checkout entirely on mobile
- Storefront loads fast on 4G mobile connections
- Store owners don't need developer help for branding and layout changes

---

## 3. User Stories & Flows

### 3.1 User Personas

**Shopper (Maria)** — A busy mom who orders groceries on her phone during her commute. She wants to find products quickly, see clear prices, and check out fast. She shops at the same store weekly and has saved addresses.

**Store Owner (Anna)** — Runs a neighborhood grocery store with ~700 products. She wants her online store to feel warm and personal, matching her physical store's brand. She's not technical but can navigate a simple admin panel on her tablet.

### 3.2 Core User Stories

**Shopper:**
- As a shopper, I want to browse products on my phone so I can shop on the go
- As a shopper, I want to search and filter products so I can find items quickly in a large catalog
- As a shopper, I want to check out with saved addresses so repeat orders are fast
- As a shopper, I want to see my order history so I can reorder or track past purchases
- As a shopper, I want a wishlist so I can save items for later

**Store Owner:**
- As a store owner, I want to set my brand colors and logo so the storefront matches my physical store
- As a store owner, I want to add banners and promotions so I can highlight seasonal deals
- As a store owner, I want to customize the homepage layout so I control what shoppers see first
- As a store owner, I want to preview changes before publishing so I don't break the live site

### 3.3 Key User Flows

**Shopper — Browse to Purchase:**
1. Open storefront on mobile
2. Browse products or search for a specific item
3. Add items to cart
4. Review cart, adjust quantities
5. Enter delivery address (or select saved address)
6. Choose shipping method
7. Complete payment (handled by Zyra)
8. See order confirmation

**Store Owner — Customize Storefront:**
1. Log into admin panel
2. Update branding (logo, colors, store name)
3. Configure homepage (banners, sections, order)
4. Set navigation links and footer content
5. Preview changes in draft mode
6. Publish — storefront updates within 5 minutes

---

## 4. Features & Requirements

### 4.1 MVP Features (Done / Phase 1)

| Feature | Description | Status |
|---------|-------------|--------|
| **Visual branding** | Logo, favicon, 15 color tokens, store name | Done |
| **Homepage builder** | Hero banner, 6 block types, section ordering | Done |
| **Navigation & footer** | Configurable nav items, footer columns, social links | Done |
| **Product browsing** | Grid view, search, sort by name/price, zone filtering | Done |
| **Shopping cart** | Add/remove/update items, storage zone grouping | Done |
| **Checkout flow** | 4-step: Delivery, Shipping, Payment, Review | Done |
| **Customer accounts** | Login, register, profile, order history, saved addresses | Done |
| **Wishlist** | Save items, move to cart, local-first with server sync | Done |
| **Dark mode** | Full dark theme toggle | Done |
| **i18n** | English + Polish | Done |
| **Draft/Publish workflow** | Save draft, preview, publish with versioning | Done |
| **Tracking integrations** | Facebook Pixel, GA4, GTM, Hotjar (configurable) | Done |
| **SEO config** | Meta title, description, OG image, canonical URL | Done |
| **Recipes** | Recipe listing and detail pages linked to products | Done |

### 4.2 Phase 2 Features (Next — 1-2 months)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Mobile optimization** | Rebuild storefront experience for mobile-first (80% traffic) | Must-have |
| **Product categories** | Category browsing, filtering, and category-linked navigation | Must-have |
| **Performance polish** | Faster loads, smoother animations, optimized images on mobile | Must-have |
| **Admin UX improvements** | Simplify admin panel workflows, better feedback and guidance | Should-have |
| **Storefront polish** | Visual refinements, micro-interactions, consistency pass | Should-have |

### 4.3 Future Considerations (Phase 3+)

| Feature | Description | Priority |
|---------|-------------|----------|
| Commercial category landings | Curated / merchandised browse pages beyond the standard category listing flow | High |
| Page builder | Drag-and-drop layout editor beyond block system | Medium |
| A/B testing | Config variants with traffic splitting | Medium |
| Config version history | Rollback and diff viewing for published configs | Medium |
| More languages | Expandable i18n beyond EN/PL | Low |
| Role-based admin access | Editor role with limited permissions | Low |
| Per-page SEO | SEO settings per page, not just site-wide | Medium |

### 4.4 Out of Scope
- Payment processing (handled entirely by Zyra)
- Product catalog management (managed in Zyra)
- Order fulfillment logistics (manual by store owner)
- Inventory management (Zyra's responsibility)
- Customer support / chat

---

## 5. Design & User Experience

### 5.1 Design Principles
- **Mobile-first** — Design for phones, enhance for desktop
- **Warm & inviting** — Feel like a neighborhood grocery store, not a cold marketplace
- **Fast** — Every interaction should feel instant, especially on mobile 4G
- **Branded** — The storefront should feel custom-built for each store's identity
- **Simple admin** — Store staff shouldn't need training to use the admin panel

### 5.2 Look & Feel
- Two font families: serif display font (Fraunces) for headings, clean sans-serif (DM Sans) for body
- All colors runtime-configurable via admin — 15 CSS custom property tokens
- Semi-transparent overlays using `color-mix()` for dark mode compatibility
- Product cards with freshness badges, allergen indicators, and sale overlays
- Storage zone visual grouping: Ambient / Chilled / Frozen

### 5.3 Key Screens

**Storefront (15 pages):**
- Homepage — Hero, banners, sections (deals, fresh picks, recipes, categories)
- Products — Grid with search, sort, and filter
- Product detail — Images, nutrition, allergens, add to cart
- Cart — Zone-grouped items, shipping progress bar
- Checkout — 4-step flow with saved address support
- Account — Profile, orders, addresses tabs
- Recipes — Grid listing + detail with linked products

**Admin Panel (9 pages):**
- Dashboard — Store status overview
- Branding — Colors, logo, favicon
- Homepage — Hero, sections, banner block builder
- Layout — Navigation, footer, price display
- General — Contact info, social links
- SEO & Tracking — Meta tags, analytics integrations
- Media — Image upload and gallery

---

## 6. Data & Content

### 6.1 Data Model (High-Level)

**Managed by Admin Panel (JSON file storage):**
- Storefront config — branding, layout, homepage, SEO, tracking, general settings
- Media uploads — banner images, logos, favicons
- Draft + Published versions per store (identified by slug)

**Managed by Zyra (external API):**
- Products, categories, pricing
- Customer accounts, authentication (JWT)
- Cart, checkout, orders
- Wishlists (server-side, unreliable — local fallback used)
- Addresses (GraphQL mutations unreliable — local REST fallback used)

### 6.2 Content Strategy
- Store owners create visual content (banners, logos) via admin panel
- Product data comes entirely from Zyra — storefront is read-only
- Recipe content managed through Zyra
- Config stored as flat JSON files — no database needed for admin panel

---

## 7. Platform & Technical Considerations

### 7.1 Platform
- **Storefront:** Next.js 14 web app, mobile-first responsive
- **Admin Panel:** Next.js 14 web app, optimized for desktop/tablet
- Both are independent apps in a monorepo, sharing no code

### 7.2 Integrations

| Integration | Purpose | Protocol |
|-------------|---------|----------|
| Zyra API | Products, cart, auth, orders | GraphQL + REST |
| Facebook Pixel | Marketing analytics | Script injection |
| Google Analytics 4 | Traffic analytics | Script injection |
| Google Tag Manager | Tag management | Script injection |
| Hotjar | Heatmaps & session recording | Script injection |

### 7.3 Technical Preferences
- TypeScript strict mode, interfaces over types
- Zustand for state management (storefront)
- urql for GraphQL client
- Tailwind for layout/spacing, CSS custom properties for colors
- next-intl for internationalization

### 7.4 Security & Compliance
- Admin panel protected by session cookie + API key auth
- Customer auth via JWT tokens from Zyra
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy
- No customer PII stored locally — all in Zyra
- Config data (colors, banners) is non-sensitive

---

## 8. Implementation Phases

### Phase 1 — MVP (Complete)
**Goal:** Functional storefront + admin panel connected to Zyra
- [x] Full storefront with 15 pages
- [x] Admin panel with 9 configuration pages
- [x] Draft/Publish config workflow
- [x] Customer auth, cart, checkout, orders
- [x] i18n (EN/PL), dark mode
- [x] Banner block builder (6 types)
- [x] Tracking integrations

### Phase 2 — Mobile & Categories (Active)
**Goal:** Production-ready mobile experience, product categorization
- [ ] Mobile-first storefront redesign / optimization
- [x] Product category browsing and filtering
- [ ] Performance optimization (images, loading, animations)
- [ ] Admin panel UX improvements
- [ ] Visual polish and consistency pass

### Phase 3 — Growth & Platform
**Goal:** Scale to multiple stores, add power features
- [ ] Commercial category landings and curated collection pages
- [ ] Config version history and rollback
- [ ] Drag-and-drop page builder
- [ ] A/B testing for config variants
- [ ] Additional language support
- [ ] Role-based admin access

---

## 9. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Frontend-only product | Storefront + admin are free, Zyra is paid | Reduces friction for store owners, Zyra monetizes the backend |
| JSON file config storage | Flat files, not a database | Simple, no infra needed, sufficient for current scale |
| CSS custom properties for colors | Runtime-configurable, not build-time Tailwind | Colors change per-store and per-publish without rebuild |
| Local address fallback | REST API with JSON file storage | Zyra's GraphQL address mutations are unreliable |
| Local-first wishlist | Zustand with best-effort server sync | Zyra's wishlist sync is unreliable |
| Fat checkout page | Single 1500-line file | Logic is cohesive, not reused — splitting would add complexity without benefit |
| 5-minute config cache | `max-age=300, stale-while-revalidate=60` | Balances freshness with performance |

---

## 10. Open Questions

- Should standalone `/products` also expose a category picker now that `/categories/[slug]` owns category-scoped browsing?
- Should the storefront support PWA / app-like experience for mobile?
- Is the current 4-step checkout too many steps for mobile shoppers?
- Should admin panel support mobile/tablet layout for on-the-go store owners?
- Will there be a need for multiple admin users per store (roles/permissions)?
