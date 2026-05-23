# Kimchi Commercial Navigation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the storefront toward the production mechanics of kimchi.pl: clean live content, strong commercial shortcuts, curated landing surfaces, and a credible outlet entry point. Do not clone Kimchi's UI blindly; copy the conversion structure.

**Architecture:** Add a small top-level `commercial` config section shared by admin and storefront. Admin edits quick links, curated collections, and outlet settings. Storefront reads that config to render header/mobile shortcuts plus `/collections/[slug]` and `/outlet` landing routes. Outlet must not pretend to be a real discount listing unless the Zyra GraphQL API supports a sale/discount filter or the admin config explicitly curates the content.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind CSS, next-intl, Zod, Playwright, Node built-in test runner via `tsx`

---

## Scope Guardrails

- This is not a CMS/page-builder project. A page builder here would be bloated and slow down the actual production goal.
- Do not make a fake Outlet that samples the first page of products and filters client-side. That is not production-grade and will mislead customers.
- Keep category taxonomy and commercial shortcuts separate. Categories are for browsing the catalog; shortcuts are for selling seasonal/promotional intent.
- Use the actual repo docs at `.claude/docs/progress.md` and `.claude/docs/learnings.md`. The AGENTS instructions mention `.Codex/docs`, but this repo currently uses `.claude/docs`.
- Preserve the existing `href === '/categories'` mega-menu behavior in the header.
- Keep `StorefrontConfig` types synchronized between `admin-panel/src/types/config.ts` and `grocery-storefront/src/types/storefront-config.ts`.

## Reference Inputs

- Live reference: `https://kimchi.pl/`, checked on 2026-05-23.
- Product target: production storefront with Kimchi-like commercial navigation, not a cosmetic clone.
- Current local docs: `.claude/docs/progress.md`, `.claude/docs/learnings.md`.
- Current external wiki: `D:/kaipizz-second-brain/store-front-brain/wiki`.

## Proposed Config Shape

Add this top-level section to `StorefrontConfig` in both apps:

```ts
export type CommercialSurfaceKind = 'category' | 'collection' | 'outlet' | 'external';

export interface CommercialQuickLink {
  id: string;
  label: string;
  href: string;
  kind: CommercialSurfaceKind;
  description: string | null;
  imageUrl: string | null;
  enabled: boolean;
  order: number;
}

export interface CommercialCollectionTile {
  id: string;
  title: string;
  href: string;
  description: string | null;
  imageUrl: string | null;
  enabled: boolean;
  order: number;
}

export interface CommercialCollection {
  slug: string;
  title: string;
  subtitle: string | null;
  heroImageUrl: string | null;
  enabled: boolean;
  order: number;
  tiles: CommercialCollectionTile[];
}

export interface CommercialOutletConfig {
  enabled: boolean;
  label: string;
  collectionSlug: string | null;
}

export interface CommercialConfig {
  enabled: boolean;
  quickLinks: CommercialQuickLink[];
  collections: CommercialCollection[];
  outlet: CommercialOutletConfig;
}
```

Default config should include `commercial.enabled = false` with empty arrays. Production content can then be configured for Kamito without forcing default demo links into every tenant.

## File Structure

- Modify `admin-panel/src/types/config.ts`
  - Add commercial config interfaces and `commercial` to `StorefrontConfig`.
- Modify `grocery-storefront/src/types/storefront-config.ts`
  - Mirror admin commercial config interfaces exactly.
- Modify `admin-panel/src/lib/defaults.ts`
  - Add the disabled commercial default.
- Modify `admin-panel/src/lib/validation.ts`
  - Add Zod schemas for quick links, collections, collection tiles, and outlet config.
- Create `admin-panel/src/lib/commercial-config.test.ts`
  - Unit coverage for default shape, validation, sorting/filtering assumptions, and malformed content rejection.
- Create `admin-panel/src/components/CommercialConfigEditor.tsx`
  - Focused admin editor for quick links, collections, and outlet settings.
- Modify `admin-panel/src/app/admin/layout-config/page.tsx`
  - Mount the commercial editor near header navigation, because this is navigation/commercial surface management.
- Modify `admin-panel/src/i18n/translations/en.ts`
- Modify `admin-panel/src/i18n/translations/pl.ts`
- Modify `admin-panel/src/i18n/translations/vi.ts`
  - Add admin labels, helper text, validation copy, and action labels.
- Create `grocery-storefront/src/lib/storefront-config.ts`
  - Extract server config fetching from `grocery-storefront/src/app/layout.tsx` so commercial routes can fetch the same config.
- Modify `grocery-storefront/src/app/layout.tsx`
  - Reuse the extracted config fetcher.
- Create `grocery-storefront/src/lib/commercial-config.ts`
  - Pure helpers for enabled quick links, enabled collections, collection lookup, and outlet fallback lookup.
- Modify `grocery-storefront/src/components/layout/Header.tsx`
  - Render commercial quick links without breaking the category mega menu.
- Create `grocery-storefront/src/components/commercial/CommercialLanding.tsx`
  - Shared landing renderer for configured collection and outlet surfaces.
- Create `grocery-storefront/src/app/[locale]/(shop)/collections/[slug]/page.tsx`
  - Config-backed curated landing route.
- Create `grocery-storefront/src/app/[locale]/(shop)/outlet/page.tsx`
  - Outlet route backed by configured outlet collection unless real backend sale filtering is confirmed.
- Modify `grocery-storefront/src/messages/en.json`
- Modify `grocery-storefront/src/messages/pl.json`
  - Add storefront copy for empty/disabled commercial surfaces and breadcrumbs if needed.
- Create `grocery-storefront/tests/commercial-navigation.spec.ts`
  - E2E coverage for header shortcuts, mobile shortcuts, collection route, outlet route, and category mega-menu preservation.
- Modify `grocery-storefront/tests/mobile-fixtures.ts`
  - Add test config data for commercial quick links and collections.
- Modify `.claude/docs/progress.md`
  - Record status changes as work lands.
- Modify `.claude/docs/learnings.md` if implementation reveals a non-obvious constraint.
- Modify external wiki files under `D:/kaipizz-second-brain/store-front-brain/wiki` after the implementation is verified.

## Task 1: Production Content Audit Before Coding

**Files:**
- Read: `.claude/docs/progress.md`
- Read: `.claude/docs/learnings.md`
- Inspect only: `admin-panel/data/config-kamito.json`
- Inspect only: `admin-panel/data/config-chesaigon.json`

- [ ] **Step 1: Confirm the current dirty worktree**

Run:

```powershell
git status --short
```

Expected: local config/env changes may already exist. Do not overwrite them unless the owner explicitly confirms they are the intended production source.

- [ ] **Step 2: Audit production content**

Check published/draft admin config for:

- placeholder text such as `alo123`
- localhost or development media URLs
- stale brand names like Asia Deli or Chesaigon in Kamito config
- missing footer links for terms, privacy, delivery, returns, contact
- homepage banners that do not link to real product/category/commercial pages
- SEO defaults that still describe the template project instead of Kamito

- [ ] **Step 3: Decide the source of truth**

If `admin-panel/data/config-kamito.json` is the intended production config, use it as the only config file to clean. If not, stop and ask for the real production slug/config.

Success criteria: a short punch list exists before implementation, and no code work is blocked by unknown production content ownership.

## Task 2: Define And Test Commercial Config

**Files:**
- Create: `admin-panel/src/lib/commercial-config.test.ts`
- Modify: `admin-panel/src/types/config.ts`
- Modify: `admin-panel/src/lib/defaults.ts`
- Modify: `admin-panel/src/lib/validation.ts`
- Modify: `grocery-storefront/src/types/storefront-config.ts`

- [ ] **Step 1: Write failing admin unit tests first**

Cover:

- default config has `commercial.enabled === false`
- quick links are accepted only with valid `label`, `href`, `kind`, `enabled`, and `order`
- collection slugs reject empty/space-containing values
- collection tiles require valid internal or external links
- outlet config can be disabled without a collection
- outlet config cannot be enabled with an unknown/empty `collectionSlug` unless a real backend sale filter is implemented in the same slice

Run:

```powershell
cd admin-panel
npm run test:unit -- src/lib/commercial-config.test.ts
```

Expected: FAIL because the config shape does not exist yet.

- [ ] **Step 2: Add the smallest config model**

Add the interfaces listed above, update `DEFAULT_CONFIG`, and add Zod validation. Keep the default disabled and empty.

- [ ] **Step 3: Mirror storefront types**

Update `grocery-storefront/src/types/storefront-config.ts` in the same commit as the admin type change. Do not let the two drift.

- [ ] **Step 4: Verify tests and type checks**

Run:

```powershell
cd admin-panel
npm run test:unit -- src/lib/commercial-config.test.ts
npx tsc --noEmit
```

Expected: PASS.

## Task 3: Add Admin Editing UI

**Files:**
- Create: `admin-panel/src/components/CommercialConfigEditor.tsx`
- Modify: `admin-panel/src/app/admin/layout-config/page.tsx`
- Modify: `admin-panel/src/i18n/translations/en.ts`
- Modify: `admin-panel/src/i18n/translations/pl.ts`
- Modify: `admin-panel/src/i18n/translations/vi.ts`

- [ ] **Step 1: Add translation keys**

Add labels for:

- commercial navigation section
- enable commercial surfaces
- quick links
- collections
- outlet
- link kind
- image URL
- order controls
- add/remove item actions
- disabled outlet explanation

- [ ] **Step 2: Build the editor**

Use existing admin patterns:

- `FormCard`
- `FieldLabel`
- existing input styling from `layout-config/page.tsx`
- checkbox/toggle controls for booleans
- up/down buttons for ordering
- `ImageUploader` only if it already fits the URL/media workflow; otherwise plain URL fields are acceptable for this slice

Do not create a new design system. Do not split into micro-components unless one section becomes genuinely hard to read.

- [ ] **Step 3: Wire editor into layout config**

Mount the editor below existing header nav controls. The current `layout.header.navItems` remains the base navigation; `commercial.quickLinks` are the promotional layer.

- [ ] **Step 4: Verify admin**

Run:

```powershell
cd admin-panel
npx tsc --noEmit
npm run lint
npm run build
```

Expected: PASS, allowing only pre-existing warnings if they are documented before this task starts.

## Task 4: Storefront Config Utilities And Header Integration

**Files:**
- Create: `grocery-storefront/src/lib/storefront-config.ts`
- Modify: `grocery-storefront/src/app/layout.tsx`
- Create: `grocery-storefront/src/lib/commercial-config.ts`
- Modify: `grocery-storefront/src/components/layout/Header.tsx`

- [ ] **Step 1: Extract server config fetching**

Move the existing server config fetch logic out of `app/layout.tsx` into `src/lib/storefront-config.ts`. Keep behavior identical: same env vars, same cache TTL behavior, same fallback behavior.

- [ ] **Step 2: Add commercial helper functions**

Implement pure helpers:

- `getEnabledCommercialQuickLinks(config)`
- `getEnabledCommercialCollections(config)`
- `findCommercialCollection(config, slug)`
- `getOutletCollection(config)`

They should filter disabled items and sort by `order` without mutating config arrays.

- [ ] **Step 3: Render quick links in header**

Desktop:

- keep existing configured nav
- keep category mega menu attached only to `/categories`
- add enabled commercial quick links after the base nav, capped by available space with existing responsive behavior

Mobile:

- expose commercial quick links in the menu without hiding account/cart access
- use plain links, not a second mega menu

- [ ] **Step 4: Type check**

Run:

```powershell
cd grocery-storefront
npx tsc --noEmit
```

Expected: PASS.

## Task 5: Add Curated Collection And Outlet Routes

**Files:**
- Create: `grocery-storefront/src/components/commercial/CommercialLanding.tsx`
- Create: `grocery-storefront/src/app/[locale]/(shop)/collections/[slug]/page.tsx`
- Create: `grocery-storefront/src/app/[locale]/(shop)/outlet/page.tsx`
- Modify: `grocery-storefront/src/messages/en.json`
- Modify: `grocery-storefront/src/messages/pl.json`

- [ ] **Step 1: Build the shared landing renderer**

Render:

- hero title/subtitle
- optional hero image
- enabled tiles sorted by `order`
- tile image/title/description/link
- empty state only for admin/test visibility; disabled or missing public collections should `notFound()`

Follow existing storefront styling:

- Tailwind for layout/spacing
- CSS variables for colors
- no nested cards
- no explanatory marketing text about the feature itself

- [ ] **Step 2: Implement `/collections/[slug]`**

Fetch server config, find the enabled collection by slug, and render it. Missing or disabled collection returns `notFound()`.

- [ ] **Step 3: Implement `/outlet` honestly**

First check whether Zyra GraphQL supports a real sale/discount product filter.

If a real filter exists:

- document the field/input name in `.claude/docs/learnings.md`
- add the minimal listing support needed to pass a base sale filter into `ProductListingClient`
- keep search/sort/category behavior intact

If no real filter exists:

- render `/outlet` as the configured outlet collection landing page
- require `commercial.outlet.enabled === true`
- require `commercial.outlet.collectionSlug` to point to an enabled collection
- do not show a fake product grid

- [ ] **Step 4: Verify storefront type safety**

Run:

```powershell
cd grocery-storefront
npx tsc --noEmit
```

Expected: PASS.

## Task 6: E2E Coverage

**Files:**
- Create: `grocery-storefront/tests/commercial-navigation.spec.ts`
- Modify: `grocery-storefront/tests/mobile-fixtures.ts`

- [ ] **Step 1: Add test config data**

Extend fixtures with:

- `commercial.enabled = true`
- quick links for Outlet and one collection
- one enabled collection with two tiles
- outlet pointing to that collection

- [ ] **Step 2: Cover desktop behavior with a viewport override**

In the spec, override viewport to desktop size and verify:

- header shows commercial quick links
- clicking a collection quick link opens the configured collection page
- category nav still opens the category mega menu

- [ ] **Step 3: Cover mobile behavior**

Use the existing mobile projects and verify:

- mobile menu exposes commercial quick links
- `/en/outlet` renders the configured outlet landing
- disabled/missing collection returns a 404 state

- [ ] **Step 4: Run targeted E2E**

Run:

```powershell
cd grocery-storefront
npm run test:e2e -- tests/commercial-navigation.spec.ts tests/categories-browsing.spec.ts --project=pixel-7
```

Expected: PASS.

## Task 7: Production Content Cleanup

**Files:**
- Modify only after confirming ownership: `admin-panel/data/config-kamito.json`
- Do not commit: `.env.local`
- Do not commit unless intentionally part of the release: unrelated tenant configs

- [ ] **Step 1: Clean Kamito content**

Replace:

- placeholder labels
- placeholder banners
- localhost media URLs
- stale brand/footer/legal copy
- dead nav/footer links

Add production links:

- `/categories`
- `/products`
- `/outlet`
- `/collections/<real-slug>`
- `/privacy`
- `/terms`

- [ ] **Step 2: Configure commercial surfaces**

Create only a few high-signal surfaces first:

- Outlet
- Bestsellers or Nowosci
- Korean pantry / kimchi-style category shortcut
- one curated collection that maps to real inventory or real categories

Do not add ten weak categories just to imitate Kimchi's density. Weak shortcuts dilute the nav.

- [ ] **Step 3: Publish through admin**

Use the admin publish flow after content is clean. Verify the storefront receives the published config after the cache window.

## Task 8: Docs And Wiki Updates

**Files:**
- Modify: `.claude/docs/progress.md`
- Modify if warranted: `.claude/docs/learnings.md`
- Modify external wiki under `D:/kaipizz-second-brain/store-front-brain/wiki`

- [ ] **Step 1: Update progress**

Record:

- commercial config model
- admin editing UI
- storefront header quick links
- collection route
- outlet route behavior
- production content cleanup status

- [ ] **Step 2: Add learnings only for real discoveries**

Add an entry if:

- Zyra supports or lacks sale filtering
- server config extraction exposes a caching/detail constraint
- admin validation needs a non-obvious rule

- [ ] **Step 3: Update wiki**

Update:

- current status page
- backlog page
- project index
- session log for this implementation

Run:

```powershell
git -C D:/kaipizz-second-brain/store-front-brain diff --check
```

Expected: no output.

## Task 9: Final Verification

- [ ] **Step 1: Run admin verification**

```powershell
cd admin-panel
npm run test:unit -- src/lib/admin-readiness.test.ts src/lib/commercial-config.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

Expected: PASS.

- [ ] **Step 2: Run storefront verification**

```powershell
cd grocery-storefront
npx tsc --noEmit
npm run lint
npm run build
npm run test:e2e -- tests/commercial-navigation.spec.ts tests/categories-browsing.spec.ts --project=pixel-7
```

Expected: PASS.

- [ ] **Step 3: Manual browser verification**

Start both apps:

```powershell
cd admin-panel
npm run dev
```

```powershell
cd grocery-storefront
npm run dev
```

Open:

- `http://localhost:4100/admin/layout-config`
- `http://localhost:3008/en`
- `http://localhost:3008/en/outlet`
- `http://localhost:3008/en/collections/<real-slug>`

Verify:

- admin can add/edit/reorder quick links
- admin validation prevents broken enabled outlet config
- storefront header shows commercial shortcuts on desktop
- mobile menu shows commercial shortcuts without crowding cart/account
- `/categories` mega menu still works
- collection page renders configured tiles and links
- outlet route is honest: real sale listing if backend supports it, configured landing if it does not
- no visible placeholder production content remains

- [ ] **Step 4: Check diffs**

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors, and changed files are limited to the planned scope plus confirmed production config/wiki files.

## Commit Plan

Use small commits if implementing manually:

```powershell
git add admin-panel/src/types/config.ts admin-panel/src/lib/defaults.ts admin-panel/src/lib/validation.ts admin-panel/src/lib/commercial-config.test.ts grocery-storefront/src/types/storefront-config.ts
git commit -m "feat(config): add commercial storefront surfaces"

git add admin-panel/src/components/CommercialConfigEditor.tsx admin-panel/src/app/admin/layout-config/page.tsx admin-panel/src/i18n/translations/en.ts admin-panel/src/i18n/translations/pl.ts admin-panel/src/i18n/translations/vi.ts
git commit -m "feat(admin): edit commercial navigation"

git add grocery-storefront/src/lib/storefront-config.ts grocery-storefront/src/app/layout.tsx grocery-storefront/src/lib/commercial-config.ts grocery-storefront/src/components/layout/Header.tsx
git commit -m "feat(storefront): show commercial quick links"

git add grocery-storefront/src/components/commercial/CommercialLanding.tsx grocery-storefront/src/app/[locale]/(shop)/collections/[slug]/page.tsx grocery-storefront/src/app/[locale]/(shop)/outlet/page.tsx grocery-storefront/src/messages/en.json grocery-storefront/src/messages/pl.json grocery-storefront/tests/commercial-navigation.spec.ts grocery-storefront/tests/mobile-fixtures.ts
git commit -m "feat(storefront): add commercial landing routes"

git add .claude/docs/progress.md .claude/docs/learnings.md
git commit -m "docs: record commercial navigation progress"
```

Only commit `admin-panel/data/config-kamito.json` after confirming it is the intended production config. Never commit `.env.local`.
