# PROJECT_CONTEXT.md — Storefront Admin Panel

> **Single source of truth** for the storefront admin panel project.
> Read this file first before making any changes.

**Last Updated:** 2026-03-29 (13:40 UTC+2)

---

## 1. Project Overview

**What:** A schema-driven configuration system for storefront websites. It consists of an admin panel (with built-in config API) that lets an operations team customize a storefront's branding, layout, content, tracking, and SEO — without touching code or redeploying.

**Why it exists:**
- The current `grocery-storefront` has everything hard-coded: logo, colors, banners, nav items, footer links, tracking scripts.
- Every visual change requires a developer to edit code and redeploy.
- Zyra (the backend) is already resource-intensive; adding UI config management to it would increase complexity and coupling.
- The operations team needs independence for routine content/branding changes.

**Main goal:** Reduce hard-coding, shorten deployment cycles, and let non-developers manage storefront appearance and content through a dedicated admin panel.

---

## 2. Current Architecture

### Chosen: B-lite (Merged Admin + Config API)

```
┌───────────────────────────────┐
│      admin-panel              │
│      (Next.js 14 App Router)  │
│  ┌─────────┐  ┌────────────┐ │       ┌─────────────────────┐
│  │ Admin UI │  │ API Routes │◀├───────│  grocery-storefront  │
│  │ pages    │  │ /api/config│ │  GET  │  (Next.js, port 3008)│
│  │          │  │ /api/media │ │       └──────────┬──────────┘
│  └─────────┘  └─────┬──────┘ │                  │
│                      │        │                  │
│              JSON/SQLite      │            Zyra (existing)
│              ./data/          │            products, cart, auth
│              port 4100        │            media/images
└───────────────────────────────┘
```

### Apps/Services

| App | Role | Tech | Port |
|-----|------|------|------|
| `admin-panel` | Config API + Admin UI | Next.js 14, TypeScript, Tailwind | 4100 |
| `grocery-storefront` | Public customer-facing store | Next.js 14, TypeScript, Tailwind, urql, Zustand | 3008 |
| `Zyra` | Business API (products, cart, auth, orders, media) | NestJS (external, not managed here) | — |

### Role of Zyra

- **Does:** Provide product/business APIs (REST + GraphQL), media/image hosting, authentication
- **Does not:** Manage storefront UI configuration. That is this project's job.
- Zyra is an optional dependency — the admin panel can function without it (media uploads fall back to local storage).

### Why this architecture

- **Merged admin + API** eliminates a separate backend project. Next.js API routes serve as the config service. One project, one deployment.
- **JSON file storage** for MVP means zero database hosting. Upgrade to SQLite later.
- **Separate from Zyra** to avoid adding load/complexity to an already heavy system.
- **Separate from storefront** so the config system can serve multiple frontends in the future.

---

## 3. Scope

### In Scope (MVP)

- Admin panel web UI with auth
- Config API (CRUD endpoints for storefront config)
- Branding management (logo, favicon, colors, store name)
- Homepage management (hero banner, promo banners, section enable/disable + reorder)
- Layout management (header nav, footer, price position, banner position)
- Tracking script management (Facebook Pixel, GA4, GTM, Hotjar)
- SEO defaults (meta title, description, OG image)
- General settings (phone, email, social links, policy links)
- Media upload (local file storage)
- Drag-to-reorder for lists (sections, banners, nav items) — using `dnd-kit`
- Draft/Publish flow (basic)
- Storefront integration (grocery-storefront reads config from admin API)

### Out of Scope

- Full CMS / page builder / visual canvas editor
- Drag-anything-anywhere (Webflow/Pencil style)
- Arbitrary page creation
- Multi-tenant user management (single admin key for MVP)
- Scheduled content publishing (nice-to-have, not MVP)
- Per-page SEO overrides (MVP has global defaults only)
- Popup/notification/badge management (deferred post-MVP)
- ~~i18n for admin panel itself~~ *(now implemented — see Section 7)*
- Real-time preview iframe

---

## 4. MVP Features

### A. Branding
- Logo upload + preview
- Favicon upload
- Store name
- Color pickers for **15 theme colors** (maps to CSS custom properties)
- **CTA Button Colors** independently configurable from Brand Color — `checkoutBtnColor` (normal) + `checkoutBtnHoverColor` (hover)
- Each color shows a "Used in" annotation listing exactly where it appears in the storefront
- Live button preview in the "CTA Button Colors" card (side-by-side normal vs hovered)

### B. Homepage
- Hero banner: enable/disable, headline, subtitle, CTA text/link, background image
- Promo banners: CRUD list, drag-to-reorder, each has headline/subtext/CTA/gradient/image
- Sections: fixed whitelist (`deals`, `freshPicks`, `recipes`, `shopByZone`), enable/disable + drag-to-reorder

### C. Layout
- Header: nav items (add/remove/reorder/enable-disable), toggle search/wishlist/language/theme
- Footer: editable columns with title + links, tagline, copyright text
- Price position: `below-image` | `overlay` | `inline`
- Banner position: `above-products` | `below-hero`

### D. Tracking
- Facebook Pixel (toggle + pixel ID)
- Google Analytics GA4 (toggle + measurement ID)
- Google Tag Manager (toggle + container ID)
- Hotjar (toggle + site ID)

### E. SEO
- Default meta title + description
- OG image upload
- Canonical URL

### F. General
- Phone, email, address
- Social links (repeatable: platform + URL)
- Policy links (privacy, terms, about URLs)

### G. Draft/Publish
- Save changes as draft
- Explicit "Publish" action to make config live
- Storefront only reads published config

### H. Media Library *(added post-initial-scope)*
- Standalone `/admin/media` page: grid view of all uploaded images, copy URL, delete
- `GET /api/media` — list all uploaded files with metadata (size, date, URL)
- `DELETE /api/media?filename=xxx` — delete a file
- `MediaLibrary` modal reusable across all ImageUploader fields
- Every image field (logo, favicon, OG image, hero bg, banner images) gets "Upload" + "Library" buttons

---

## 5. Technical Decisions

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| Admin framework | Next.js 14 (App Router) | Reuse for both UI and API routes; one project, one deploy |
| Styling | TailwindCSS + shadcn/ui (planned) | Fast to build, consistent with storefront |
| Config storage (MVP) | JSON files on disk (`./data/`) | Zero DB hosting, instant setup, upgrade to SQLite later |
| Config storage (later) | SQLite via Prisma or Drizzle | Version history, query capability, still single-file DB |
| API auth | `x-api-key` header | Simple, sufficient for MVP; upgrade to JWT/session later |
| API shape | REST: `GET/PUT/PATCH /api/config/[slug]` | Simple, cacheable, easy for storefront to consume |
| Config model | Single `StorefrontConfig` JSON blob per site, keyed by `slug` | Avoids complex relational schema; entire config is one document |
| Section whitelist | `deals`, `freshPicks`, `recipes`, `shopByZone` | Predefined, not arbitrary. Matches storefront components. |
| Reordering UI | `dnd-kit` library | Lightweight, accessible, React-native drag-and-drop for lists only |
| Form handling | React Hook Form + Zod (planned) | Validation shared between client and API |
| State management | TanStack Query (planned) for API; local state for forms | Minimal, standard approach |
| Icons | Lucide React | Consistent with grocery-storefront |
| Deployment | Single container/process; Dockerize when ready | Minimum infra |
| Media storage (MVP) | Local `./public/uploads/` | No S3/cloud needed initially |
| CORS | Configurable via `CORS_ORIGIN` env var | Allow storefront origin in production, `*` in dev |

### Intentionally Postponed

- SQLite / version history — after MVP JSON storage is proven
- Per-page SEO — global defaults only for now
- Scheduled publishing — manual publish only
- Admin user accounts / roles — single API key for now
- Popup / notification / badge management
- Live preview iframe in admin

---

## 6. Data / Config Model

### Top-level shape

```
StorefrontConfig {
  branding    — logo, favicon, storeName, colors (15 hex values)
  homepage    — hero banner, promoBanners[], sections[]
  layout      — header (navItems[], cta?), footer (columns[]), priceDisplay?, bannerPosition
  tracking    — facebookPixel, googleAnalytics, googleTagManager, hotjar
  seo         — defaultTitle, defaultDescription, ogImageUrl, canonical
  general     — phone, email, address, socialLinks[], policyLinks
}
```

### Color fields (15 total)

| Group | Fields |
|-------|--------|
| Brand | `primary`, `primaryHover` |
| CTA Buttons | `checkoutBtnColor`, `checkoutBtnHoverColor` — **independent from Brand Color** |
| Page | `background`, `foreground`, `accent`, `accentForeground` |
| Components | `muted`, `mutedForeground`, `border`, `card`, `cardForeground`, `destructive`, `ring` |

All color keys are injected as `--color-{kebab-key}` CSS variables by `ConfigProvider` automatically. The storefront `globals.css` reads `--color-checkout-btn-color` and `--color-checkout-btn-hover-color` with fallbacks to maintain backward compatibility.

### Keyed by slug (siteKey)

- Each storefront is identified by a `slug` (e.g., `my-grocery-store`)
- Maps to Zyra's salon slug concept
- Config stored as `./data/config-{slug}.json`
- API: `/api/config/{slug}`

### Strict section types

- Homepage sections use a fixed union: `'deals' | 'freshPicks' | 'recipes' | 'shopByZone'`
- No arbitrary section creation — the storefront must have a matching component for each section ID
- New section types require a code change in both admin and storefront

### Published vs Draft (implemented)

- Config file stores both `draft` and `published` versions
- Admin panel edits `draft` via PUT/PATCH
- `POST /api/config/:slug/publish` copies `draft` → `published`
- `GET /api/config/:slug` returns `published` config (public, cached 5 min)
- `GET /api/config/:slug?draft=true` returns `draft` config (requires API key)

---

## 7. Current Status

### Done — Config API Layer (fully working + tested)
- [x] Safety branch `pre-admin-integration` created on `grocery-storefront` at commit `6a094a0`
- [x] Admin panel project scaffolded at `d:\store_front\admin-panel`
- [x] Project config: `package.json`, `tsconfig.json`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`
- [x] Environment files: `.env.example`, `.env.local`
- [x] `.gitignore` configured (ignores data/*.json, uploads, .next, node_modules)
- [x] App shell: `layout.tsx`, `page.tsx` (placeholder), `globals.css`
- [x] `StorefrontConfig` TypeScript types defined in `src/types/config.ts`
- [x] CORS headers configured in `next.config.js`
- [x] Directories created: `data/`, `public/uploads/`
- [x] Zod validation schema — `src/lib/validation.ts` (full + deep partial)
- [x] Default config values — `src/lib/defaults.ts` (mirrors grocery-storefront hard-coded values)
- [x] Auth middleware — `src/lib/auth.ts` (x-api-key header check)
- [x] JSON config repository — `src/lib/config-repository.ts` (read/write/patch/publish, atomic writes)
- [x] API: `GET /api/config/[slug]` — public, returns published config (or draft with `?draft=true` + key)
- [x] API: `PUT /api/config/[slug]` — full config replacement (saves to draft)
- [x] API: `PATCH /api/config/[slug]` — partial merge into draft
- [x] API: `POST /api/config/[slug]/publish` — copies draft → published
- [x] API: `GET /api/health` — health check
- [x] API: `POST /api/media/upload` — local file upload (5MB limit, images only)
- [x] `npm install` completed, dev server runs on port 4100
- [x] All endpoints tested: health ✓, GET config ✓, PATCH with auth ✓, 401 without auth ✓, publish ✓
- [x] Draft/Publish flow implemented and working
- [x] `PROJECT_CONTEXT.md` created

### Done — Admin UI (all pages compiled + loading)
- [x] Admin shell layout — sidebar navigation + topbar + responsive mobile menu (`src/app/admin/layout.tsx`)
- [x] Dashboard page — overview with links to all config sections (`src/app/admin/page.tsx`)
- [x] Shared components: `SaveBar`, `FormCard`, `FieldLabel`, `ImageUploader`, `ColorPicker`, `PageHeader`
- [x] Config hook: `useConfig()` — fetches draft, tracks dirty state, save/publish actions
- [x] API client: `src/lib/api-client.ts` — typed fetch wrappers for all endpoints
- [x] **BrandingPage** — store name, logo upload, favicon upload, 13 color pickers with native picker, live preview
- [x] **HomepagePage** — hero banner toggle + fields, promo banner CRUD + move up/down, section enable/disable + reorder
- [x] **LayoutPage** — header toggles (search, wishlist, lang, theme), nav item CRUD + reorder, price/banner position radios, footer tagline/copyright, footer column CRUD with link editor
- [x] **TrackingPage** — 4 tracking cards (FB Pixel, GA4, GTM, Hotjar) each with toggle + ID input
- [x] **SeoPage** — meta title/description, canonical URL, OG image upload, Google search preview
- [x] **GeneralPage** — phone, email, address, social links (platform dropdown + URL), policy page URLs
- [x] All pages wired to config API via `useConfig()` hook with save draft / publish buttons

### Done — Storefront Integration (core wiring complete)
- [x] `StorefrontConfig` types added to storefront — `src/types/storefront-config.ts`
- [x] `config-store.ts` — Zustand store fetching published config from admin API with localStorage cache (5min TTL)
- [x] `ConfigProvider.tsx` — fetches config on mount, injects CSS custom properties from `config.branding.colors`
- [x] `TrackingScripts.tsx` — conditionally renders FB Pixel, GA4, GTM, Hotjar `<Script>` tags
- [x] `layout.tsx` — wrapped with `<ConfigProvider>` and `<TrackingScripts>`
- [x] `Header.tsx` — reads logo, store name, nav items, header toggles from config (with fallback)
- [x] `Footer.tsx` — reads tagline, columns, copyright, logo from config (with fallback)
- [x] `PromoBanner.tsx` — reads banner slides from config (with fallback to i18n translations)
- [x] `.env.example` + `.env.local` — added `NEXT_PUBLIC_CONFIG_API_URL=http://localhost:4100`
- [x] Storefront compiles and serves on port 3008 with all changes
- [x] Root `/` of admin panel redirects to `/admin`

### Done — Bug Fixes (2025-03-25 evening)
- [x] Fixed hydration error: config store starts as `null` (matches server), loads cache only after mount in `fetchConfig()`
- [x] Fixed config not updating without restart: removed TTL cache, store always fetches fresh with `cache: 'no-store'`
- [x] Fixed slug mismatch: admin panel now uses `chesaigon` slug (synced with storefront's `.env.local`)
- [x] Fixed media upload: returns absolute URLs (`http://localhost:4100/uploads/...`) for cross-origin loading
- [x] Fixed i18n: Header nav + Footer columns map known labels to i18n translations (hrefToI18n / footerI18n lookup)
- [x] Fixed banner images: proper `<img>` with `object-fit: cover` instead of CSS `background`, any image size now works
- [x] Made banner headline/subtext/CTA optional — image-only banners are now possible
- [x] Implemented homepage dynamic section ordering: desktop sections render from `config.homepage.sections` order + enabled
- [x] Admin topbar shows dynamic slug from env var
- [x] Root `/` of admin panel redirects to `/admin`

### Done — Polish + Production Prep (2025-03-26)
- [x] Git init admin-panel repo — initial commit `aa91cc4`, polish commit `52038e3`
- [x] Toast notifications on save/publish (sonner) — success + error feedback
- [x] README.md with full setup, API docs, project structure
- [x] Dockerfile (multi-stage, standalone output) + docker-compose.yml
- [x] Storefront changes committed on `feature/config-integration` branch (`34f7826`)

### Done — Config Flash Fix (2025-03-26, eliminates 2s flash)

**Attempt 1 (`7b14cce`) — FAILED:** Passed `initialConfig` prop, called Zustand `initializeConfig()` during render. Zustand `set()` during render doesn't update current cycle.

**Attempt 2 (`8ada203`) — FAILED:** Injected config via `<Script strategy="beforeInteractive">` setting `window.__STOREFRONT_CONFIG__`. Zustand store read it at creation. But the **server-side render** still used `config: null` because `window` doesn't exist on the server. Server HTML had defaults → flash persisted.

**Attempt 3 (`a8998ad`) — CORRECT:** Replaced Zustand with **React Context** for config.
- `ConfigProvider` accepts `initialConfig` prop, uses `useState(initialConfig)`
- React Context is available during SSR (unlike Zustand or window globals)
- All components use `useStorefrontConfig()` hook (reads from context)
- Server HTML now contains correct logo/name/sections — **verified: no defaults in HTML**

- [x] `layout.tsx`: fetches config server-side, passes as `initialConfig` prop to ConfigProvider
- [x] `ConfigProvider.tsx`: provides config via React Context + `useState(initialConfig)`
- [x] Created `useStorefrontConfig()` hook (replaces `useConfigStore((s) => s.config)`)
- [x] Updated: Header.tsx, Footer.tsx, PromoBanner.tsx, page.tsx, TrackingScripts.tsx
- [x] Background refresh still runs after mount via `useEffect`
- [x] Verified: server HTML contains `alo123`, logo URL, no default `Grocery`
- [x] Committed as `a8998ad` on `feature/config-integration` branch

### Done — Admin Authentication (2025-03-26)
- [x] Login page at `/login` — username/password form, clean UI
- [x] Middleware (`src/middleware.ts`) protects all `/admin/*` routes — redirects to `/login` if no session
- [x] Login API (`/api/auth/login`) — validates against env vars, sets HttpOnly signed cookie (7 day)
- [x] Logout API (`/api/auth/logout`) — clears cookie
- [x] Logout button in admin sidebar footer
- [x] HMAC-SHA256 signed tokens — Web Crypto API in Edge middleware, Node crypto in API routes
- [x] Credentials in env vars: `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
- [x] Committed as `5294112`

### Done — Media Library (2026-03-27)
- [x] `GET /api/media` — list all uploaded files (filename, url, size, modifiedAt)
- [x] `DELETE /api/media?filename=xxx` — delete a file
- [x] `MediaLibrary` modal component — grid of all uploads, select, delete, file info
- [x] `ImageUploader` updated with "Upload" + "Library" buttons side-by-side
- [x] Standalone `/admin/media` page — upload, browse, copy URL, delete with stats
- [x] Media Library added to sidebar navigation (ImageIcon)
- [x] Committed as `d31bdcf`

### Done — Branding Preview Sync (2026-03-27)
- [x] Preview now faithfully mirrors actual storefront layout
- [x] Header: search bar, globe (language), heart (wishlist), cart with badge
- [x] Hero CTA: hover dims with `opacity: 0.9` + `scale(0.95)` — matches real storefront
- [x] Product cards: wishlist heart icon, quantity `− 1 +` selector, cart icon in button
- [x] Committed as `f1ae7b0`

### Done — Admin Panel i18n (2026-03-29)
- [x] Translation files created: `src/i18n/translations/en.ts`, `vi.ts`, `pl.ts`
- [x] `src/i18n/index.tsx` — `LanguageProvider` (localStorage-persisted), `useLanguage()` hook, `LangSwitcher` component
- [x] Root layout wrapped with `<LanguageProvider>`
- [x] Admin topbar — `LangSwitcher` (🇬🇧 EN / 🇻🇳 VI / 🇵🇱 PL) rendered in top-right header
- [x] All 7 admin pages fully translated: Branding, Homepage, Layout, Tracking, SEO, General, Media
- [x] All shared components translated: `SaveBar`, `ImageUploader`, `MediaLibrary`
- [x] Login page translated
- [x] Dashboard page translated
- [x] `showAdvanced` toggle uses `{n}` placeholder strings with `.replace()` — avoids function-type translations
- [x] TypeScript errors fixed: `cta`, `priceDisplay`, `checkoutBtnColor` all made optional to match Zod schema
- [x] `tsc --noEmit` passes with zero errors

### Done — Configurable Button Colors + Redesigned Branding UI (2026-03-28)
- [x] Added `checkoutBtnColor` and `checkoutBtnHoverColor` to config types, defaults, validation
- [x] Storefront `globals.css` updated: `.checkout-btn` uses `--color-checkout-btn-color` variable; `.checkout-btn:hover` uses `--color-checkout-btn-hover-color` (fallback: `#75c547`)
- [x] Both storefront CSS variables are auto-injected by `ConfigProvider` from config
- [x] Branding page color section redesigned into 4 groups: Brand Colors / CTA Button Colors / Page & Content Colors / Component Colors (collapsible)
- [x] Each color shows detailed hint + "Used in" tags listing exactly which storefront elements it affects
- [x] "CTA Button Colors" card has live side-by-side button preview (normal vs hovered state)
- [x] Preview Add to Cart hover now uses exact CSS values: `checkoutBtnHoverColor`, `brightness(1.1)`, `translateY(-1px) scale(1.02)`, `0 4px 14px rgba(0,0,0,0.15)`
- [x] Backward compat: `priceDisplay`, `headerCta`, `checkoutBtnColor`, `checkoutBtnHoverColor` all optional in Zod schema
- [x] Committed as `12b902e` (admin-panel)

### Done — Undo/Redo (2026-03-31)
- [x] In-memory history stack in `useConfig` hook (capped at 50 states, resets on page load)
- [x] `undo()` / `redo()` actions step through history; `canUndo` / `canRedo` booleans exposed
- [x] Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo) — skipped for INPUT/TEXTAREA
- [x] `SaveBar` updated with icon-only Undo/Redo buttons (Undo2/Redo2 from lucide-react) on the left side
- [x] All 6 config pages wired: branding, homepage, layout-config, tracking, seo, general
- [x] Translations added: `common.undo` / `common.redo` in EN, VI, PL

### Remaining
- [ ] Optional: dnd-kit drag-to-reorder for admin UI lists (currently uses move-up/move-down buttons)
- [ ] Optional: loading skeletons in admin pages
- [ ] Decision needed: production deploy target
- [ ] i18n: add more languages if needed (current: EN, VI, PL)

---

## 8. Progress Log

### 2025-03-25 (AM) — Config API
- **Decision:** Chose B-lite architecture — merged admin panel + config API in one Next.js app
- **Decision:** JSON file storage for MVP, SQLite upgrade path later
- **Decision:** Schema-driven config, not a visual builder / CMS
- **Decision:** Section whitelist approach (fixed IDs, not arbitrary)
- **Decision:** Drag-to-reorder for lists only (sections, banners, nav items) — not canvas drag
- **Decision:** Draft/Publish config model — admin edits draft, explicit publish action makes it live
- **Created:** Safety branch `pre-admin-integration` on grocery-storefront
- **Created:** Admin panel project scaffold at `d:\store_front\admin-panel`
- **Created:** `StorefrontConfig` TypeScript interfaces in `src/types/config.ts`
- **Created:** Zod validation schema (`src/lib/validation.ts`)
- **Created:** Default config matching grocery-storefront hard-coded values (`src/lib/defaults.ts`)
- **Created:** JSON config repository with atomic writes (`src/lib/config-repository.ts`)
- **Created:** Auth middleware with x-api-key (`src/lib/auth.ts`)
- **Created:** All API routes: config CRUD, publish, health, media upload
- **Tested:** All endpoints working — GET, PATCH, PUT, publish, health, auth rejection
- **Created:** `PROJECT_CONTEXT.md` (this file)

### 2025-03-25 (PM) — Admin UI
- **Created:** Admin shell layout with sidebar nav, topbar, responsive mobile menu
- **Created:** All 6 admin pages: Branding, Homepage, Layout, Tracking, SEO, General
- **Created:** Shared UI components: SaveBar, FormCard, FieldLabel, ImageUploader, ColorPicker, PageHeader
- **Created:** `useConfig()` hook — fetches draft config, tracks dirty state, save/publish
- **Created:** `api-client.ts` — typed fetch wrappers for all API endpoints
- **Decision:** Layout page route is `/admin/layout-config` (avoids conflict with Next.js `layout.tsx` convention)
- **Note:** Reorder uses move up/down buttons (ChevronUp/ChevronDown) — `dnd-kit` drag library deferred to polish phase
- **Verified:** All 7 admin routes compile and load: /admin, /admin/branding, /admin/homepage, /admin/layout-config, /admin/tracking, /admin/seo, /admin/general

### 2025-03-25 (PM) — Storefront Integration
- **Created:** `src/types/storefront-config.ts` — config types (mirrors admin-panel types)
- **Created:** `src/stores/config-store.ts` — Zustand store with fetch + localStorage cache
- **Created:** `src/components/ConfigProvider.tsx` — fetches config, injects CSS vars
- **Created:** `src/components/TrackingScripts.tsx` — conditional FB Pixel, GA4, GTM, Hotjar
- **Modified:** `src/app/layout.tsx` — wrapped with ConfigProvider + TrackingScripts
- **Modified:** `src/components/layout/Header.tsx` — reads logo, store name, nav, toggles from config
- **Modified:** `src/components/layout/Footer.tsx` — reads columns, tagline, copyright from config
- **Modified:** `src/components/grocery/PromoBanner.tsx` — reads banners from config
- **Added:** `NEXT_PUBLIC_CONFIG_API_URL` env var to storefront
- **Verified:** Storefront compiles and loads on port 3008 with all changes
- **Both servers running:** admin panel on :4100, storefront on :3008

### 2025-03-25 (Evening) — Bug Fixes
- **Fixed:** Hydration mismatch — config store init changed from `getCachedConfig()` to `null`
- **Fixed:** Config freshness — removed TTL, always fetch with `cache: 'no-store'`, stale-while-revalidate pattern
- **Fixed:** Slug mismatch — admin `.env.local` now uses `chesaigon`, config file copied from `my-grocery-store`
- **Fixed:** Media upload returns absolute URLs for cross-origin
- **Fixed:** i18n — Header nav uses `hrefToI18n` map, Footer uses `footerI18n` map for known labels
- **Fixed:** Banner images — switched from CSS `background` to `<img object-fit:cover>`, made text overlay optional
- **Implemented:** Homepage dynamic section ordering via `orderedSections` in `page.tsx`
- **All changes compiled and verified working**

### 2025-03-26 — Polish + Production Prep
- **Created:** Git repo for admin-panel, initial commit `aa91cc4` (40 files)
- **Added:** Toast notifications (sonner) for save draft + publish success/error
- **Created:** README.md with full docs (setup, env vars, API endpoints, project structure)
- **Created:** Dockerfile (multi-stage, node:20-alpine, standalone output) + docker-compose.yml
- **Added:** `output: 'standalone'` to next.config.js for Docker
- **Committed:** Storefront integration on `feature/config-integration` branch (`34f7826`)
- **Verified:** Both servers running, config API responding, end-to-end flow working

### 2025-03-26 — Admin Authentication
- **Created:** Login page at `/login`, login/logout API endpoints
- **Created:** Edge middleware protecting `/admin/*` routes with cookie check
- **Created:** Session library (`src/lib/session.ts`) for HMAC-SHA256 signed cookies
- **Added:** Logout button in admin sidebar
- **Env vars:** `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`
- **Tested:** Full flow: login → cookie set → admin access 200 → logout → redirect to login
- **Note:** Middleware uses Web Crypto API (Edge Runtime), login API uses Node.js crypto. Both produce identical HMAC output.
- **Committed:** `5294112`

### 2026-03-27 — Media Library
- **Created:** `GET /api/media` + `DELETE /api/media?filename` endpoints at `src/app/api/media/route.ts`
- **Created:** `MediaLibrary.tsx` modal — grid view, select, delete, file metadata
- **Modified:** `ImageUploader.tsx` — added "Library" button alongside "Upload"; opens MediaLibrary modal
- **Created:** `/admin/media` page — standalone media management page with stats, copy URL, upload
- **Modified:** `src/app/admin/layout.tsx` — added Media Library nav item (ImageIcon)
- **Fixed:** Backward compatibility — `priceDisplay` and `headerCta` made optional in Zod validation
- **Committed:** `d31bdcf`

### 2026-03-27 — Branding Preview Sync
- **Fixed:** Preview header now includes search bar, globe, heart, cart badge — matches real storefront Header.tsx
- **Fixed:** Hero CTA hover: was using `primaryHover` color (wrong), now `opacity: 0.9 + scale(0.95)` (correct)
- **Fixed:** Product cards: added wishlist heart, quantity `− 1 +` selector, shopping cart icon in button
- **Reference:** Changes verified against `ProductCard.tsx` lines 127–403
- **Committed:** `f1ae7b0`

### 2026-03-29 — Admin Panel i18n (EN / VI / PL)
- **Created:** `src/i18n/` directory: `index.tsx` (context + hook + switcher), `translations/en.ts`, `vi.ts`, `pl.ts`
- **Scope:** Every visible string in admin UI is now translatable — all 7 pages + all shared components
- **Language persistence:** `localStorage` key `adminLang`, defaults to `en`
- **Switcher:** Rendered in topbar right side, flag emoji + language code, 3 languages
- **Translation pattern:** All translations are `string` (no function-type values) — dynamic values use `{n}`/`{filename}` placeholder substitution via `.replace()`
- **TypeScript:** Fixed 4 TS errors introduced during cleanup: `cta?`, `priceDisplay?`, `checkoutBtnColor?`, `checkoutBtnHoverColor?` made optional in `config.ts` to match Zod schema
- **Committed:** pending

### 2026-03-28 — Configurable Button Colors + Redesigned Color UI
- **Root cause identified:** `.checkout-btn:hover` in `globals.css` used hardcoded `#75c547` — not tied to any config
- **Added:** `checkoutBtnColor` + `checkoutBtnHoverColor` to `BrandingConfig.colors` in types, defaults, validation (both repos)
- **Modified:** `globals.css` — `.checkout-btn` now reads `--color-checkout-btn-color` (fallback: `--color-primary`); hover reads `--color-checkout-btn-hover-color` (fallback: `#75c547`)
- **Redesigned:** Branding page color section — was 1 card with essential/advanced split, now 4 separate cards with grouped context
- **Added:** "Used in" tag chips on every color field — tells admin exactly what each color affects
- **Added:** Live button preview in CTA Button Colors card (real-time side-by-side normal vs hovered)
- **Fixed:** Preview Add to Cart hover effect matches exact `globals.css` values
- **Decision:** Button colors are independent from Brand Color. This allows e.g. green brand + different button shade.
- **Committed:** `12b902e` (admin-panel), storefront changes already on `feature/config-integration`

### 2025-03-26 — SSR Config Flash Fix (critical, 3 attempts)
- **Root cause:** Server renders with `config: null` → defaults in HTML → client hydrates → config loads → re-render = flash.
- **Attempt 1 (7b14cce):** Zustand `initializeConfig()` during render. FAILED — `set()` doesn't update current render.
- **Attempt 2 (8ada203):** `<Script beforeInteractive>` + `window.__STOREFRONT_CONFIG__`. FAILED — only helps client; server still renders defaults.
- **Attempt 3 (a8998ad):** **React Context** with `useState(initialConfig)`. **WORKS.** Context is available during SSR.
- **Key insight:** Zustand stores are created at module import time (before component render) and `window` doesn't exist on server. Only React Context propagates server props to client components during SSR.
- **Result:** Server HTML verified to contain correct config data. No defaults. No flash.
- **Committed:** `a8998ad` on `feature/config-integration`

---

## 9. Current Priorities

1. **Production deployment** — decide target, deploy admin panel + storefront
2. **Optional polish** — dnd-kit drag-to-reorder (lists), loading skeletons in admin pages
3. **Test end-to-end in production** — verify config flow, media uploads, button color changes propagate
4. **Potential next features** — banner scheduling (start/end dates), per-banner scheduling UI

---

## 10. Next Steps (in order)

1. Decide deploy target (VPS + Docker, Railway, Fly.io, etc.)
2. Deploy admin-panel (Dockerfile + docker-compose already ready)
3. Update storefront env to point to deployed admin API URL
4. Merge `feature/config-integration` into storefront main branch
5. Optional: add dnd-kit drag-to-reorder in admin (nav items, promo banners, sections)
6. Optional: add loading skeletons to admin pages
7. Optional: banner scheduling (start/end date fields in promo banner config)

---

## 11. Open Questions / Risks

| Item | Status | Notes |
|------|--------|-------|
| Admin auth long-term | **Resolved** | Standalone cookie auth implemented. Login at `/login`, credentials in env vars. Upgrade to multi-user accounts post-MVP if needed. |
| Image storage at scale | **Open** | MVP uses local `./public/uploads/`. May need S3/CDN for production. |
| Config versioning/rollback | **Deferred** | SQLite upgrade will add version history. JSON MVP has no rollback. |
| Multi-language config values | **Open** | Current schema stores strings directly. If storefront uses i18n, config values may need per-locale variants. |
| Admin panel i18n | **Done** | EN/VI/PL implemented. Additional languages can be added by creating a new file in `src/i18n/translations/` and registering it in `src/i18n/index.tsx`. |
| How storefront handles missing config | **Open** | Storefront needs graceful fallback to hard-coded defaults if config API is down or config is empty. |
| Deploy target | **Open** | Not decided yet. Options: VPS with Docker, Vercel (limited by file storage), Railway, Fly.io. |
| Tight timeline risk | **Resolved** | MVP fully built and working. Now in polish/deploy phase. |
| Button color vs brand color confusion | **Resolved** | Separate `checkoutBtnColor`/`checkoutBtnHoverColor` fields + redesigned UI with "Used in" tags. |

---

## 12. Rules for Future Updates

1. **Update this file after every major change** — new feature, architecture shift, scope change, key decision, or milestone completion.
2. **Keep decisions consistent.** If a previous decision is reversed, mark it clearly with date and reason. Do not silently change direction.
3. **Never expand scope without noting it.** If a new feature is added, update Scope and MVP Features sections. Note whether it's MVP or post-MVP.
4. **Update "Current Status" and "Next Steps"** after each work session.
5. **Add dated entries to Progress Log** for significant events.
6. **Preserve past decisions** in this file. They provide context for why things are the way they are.
7. **Keep it concise.** This is a reference document, not a diary. Bullet points over paragraphs.

---

## 13. Quick Start for Future AI

If you are an AI model picking up this project:

1. **Read this file first.** It is the single source of truth.
2. **Respect the current architecture:** merged Next.js admin + API, JSON file storage, schema-driven config. Do not propose a separate backend, database, or CMS unless explicitly asked.
3. **Respect the MVP scope.** Do not add features not listed in Section 4. If the user asks for something new, confirm it's intentional and update this file.
4. **Do not overengineer.** This is a tight-budget, 2–3 week project. Prefer simple, working code over elegant abstractions.
5. **The storefront (`grocery-storefront`) has a safety branch** (`pre-admin-integration`). Do not modify storefront code until the admin panel API is working and tested.
6. **Config types** are in `src/types/config.ts`. All API validation and UI forms must match this schema.
7. **Key files to know:**
   - `src/types/config.ts` — TypeScript interfaces for the entire config (15 color fields)
   - `src/lib/validation.ts` — Zod schemas for full validation + partial merge
   - `src/lib/defaults.ts` — Default config values (mirrors grocery-storefront hard-coded values)
   - `src/lib/config-repository.ts` — JSON file storage with atomic writes + draft/publish
   - `src/app/api/config/[slug]/route.ts` — Config CRUD API (GET/PUT/PATCH)
   - `src/app/api/config/[slug]/publish/route.ts` — Publish endpoint
   - `src/app/api/media/route.ts` — Media list (GET) and delete (DELETE)
   - `src/components/MediaLibrary.tsx` — Reusable media picker modal
   - `src/components/ImageUploader.tsx` — Upload + Library button combo
8. **Port 4100** for admin panel, **port 3008** for storefront.
9. When in doubt, check this file and the existing code before making assumptions.

---

## File Locations

| What | Path |
|------|------|
| This context file | `d:\store_front\admin-panel\PROJECT_CONTEXT.md` |
| Admin panel project | `d:\store_front\admin-panel\` |
| Grocery storefront | `d:\store_front\grocery-storefront\` |
| Config types | `d:\store_front\admin-panel\src\types\config.ts` |
| Config data files | `d:\store_front\admin-panel\data\config-{slug}.json` |
| Uploaded media | `d:\store_front\admin-panel\public\uploads\` |
| Storefront safety branch | `pre-admin-integration` (on grocery-storefront repo) |
