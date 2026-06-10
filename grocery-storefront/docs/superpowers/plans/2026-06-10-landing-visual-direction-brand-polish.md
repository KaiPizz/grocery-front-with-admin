# Landing Visual Direction / Brand Polish Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Kenmito landing page toward the visual and retail quality of japoniacentralna.pl and sklep.nasushi.pl while preserving the current Kenmito identity: green palette, serif headline, pickup-first positioning, and Asian grocery focus.

**Architecture:** Keep the current homepage as the orchestration layer and improve existing primitives instead of replacing the storefront shell. Reuse live category/product data for visual richness, add small focused components only when they clarify repeated behavior, and never introduce fake trust claims, fake delivery promises, fake reviews, or inactive newsletter/payment affordances.

**Tech Stack:** Next.js App Router, React client/server components, next-intl, urql storefront data, Zustand wishlist/cart stores, Playwright visual and interaction tests.

**Reference Audit Inputs:**
- `https://japoniacentralna.pl/`: practical product-first ecommerce density, visible add-to-cart controls, strong mobile product grid, clear contact/payment footer.
- `https://sklep.nasushi.pl/`: polished retail header, campaign hero, category chips, trust strip, wishlist hover popover, rich footer/newsletter/social sections.

---

### Task 1: Lock The Landing Baseline With Focused Tests

**Files:**
- Modify: `tests/mobile-homepage.spec.ts`
- Modify: `tests/product-card-scan-value.spec.ts`
- Modify: `tests/wishlist-accessibility.spec.ts`
- Modify: `tests/kamito-launch-hardening.spec.ts` if existing launch config assertions need updated copy/structure

- [x] **Step 1: Add desktop landing assertions**

Add a desktop test that verifies the first viewport contains the Kenmito wordmark, usable search, cart, wishlist, hero CTA, real hero product imagery, category entry points, and no blank trust-slot placeholder.

- [x] **Step 2: Add mobile landing assertions**

Add a mobile test that verifies the header retains brand recognition, search/menu controls open cleanly, product/category sections render real content, the bottom nav does not cover primary actions, and touch targets remain at least 44px.

- [x] **Step 3: Cover wishlist and search micro-interactions**

Extend the wishlist accessibility coverage so desktop top-wishlist hover/focus exposes helpful save-for-later copy. Keep the existing search suggestion behavior covered so brand polish does not regress the current strong search dropdown.

- [x] **Step 4: Run targeted tests to establish RED/GREEN scope**

Run:
`npm run test:e2e -- tests/mobile-homepage.spec.ts --project=pixel-7`
`npm run test:e2e -- tests/product-card-scan-value.spec.ts`
`npm run test:e2e -- tests/wishlist-accessibility.spec.ts`

Expected before implementation: fail only for newly planned polish expectations.

### Task 2: Polish The First Viewport And Retail Header

**Files:**
- Modify: `src/app/[locale]/(shop)/page.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/pl.json`
- Modify other locale files only for new user-facing strings

- [x] **Step 1: Tighten the hero composition**

Keep the serif headline and green identity, but reduce empty vertical space and make the right-side product collage feel like a live campaign rather than a generic grid. Use current product images and labels; do not add decorative filler.

- [x] **Step 2: Add retail utility signals without fake promises**

Enrich the header/top strip with only true store facts from config or existing copy: pickup/self-collection, manual confirmation, cart state, language, account, and search. Do not invent shipping countdowns, free delivery thresholds, reviews, or phone details unless the data/config exists.

- [x] **Step 3: Improve mobile brand recognition**

Make the mobile header identify Kenmito beyond the leaf icon when space allows, while keeping search and menu easy to reach.

- [x] **Step 4: Reveal useful content sooner**

Adjust first-viewport spacing so the next commercial section is visibly hinted on desktop and mobile. The landing should feel like a shop immediately, not a sparse brand page.

### Task 3: Upgrade Categories And Trust Strip

**Files:**
- Modify: `src/app/[locale]/(shop)/page.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/pl.json`
- Modify other locale files only for new user-facing strings

- [x] **Step 1: Add compact popular-category entry points near the hero**

Introduce a NaSushi-style row of compact category chips or shortcuts near the hero using real categories. Keep the larger category cards below if they still add value.

- [x] **Step 2: Replace category placeholder visuals**

Replace large initial-letter category placeholders with category imagery, product thumbnails, or a consistent fallback that still feels intentional. Avoid blank pale blocks that read as loading skeletons.

- [x] **Step 3: Complete the trust strip**

Replace the current two-item-plus-blank trust strip with a complete 4-5 item strip using true Kenmito claims, such as pickup availability, manual confirmation, live catalog availability, saved wishlist/reorder convenience, and secure checkout/account flows if supported.

- [x] **Step 4: Validate responsive density**

On mobile, keep trust cards compact and scannable. On desktop, keep the strip visually balanced and do not leave gray empty cells.

### Task 4: Make Product Cards More Transactional

**Files:**
- Modify: `src/components/product/ProductCard.tsx`
- Modify: `src/components/product/MobileProductCard.tsx`
- Modify: `src/app/[locale]/(shop)/page.tsx` if homepage-specific card options are needed
- Modify: `src/messages/en.json`
- Modify: `src/messages/pl.json`

- [x] **Step 1: Make desktop buy actions easier to discover**

For homepage product cards, make price, stock, category, wishlist, quantity, and add-to-cart actions visible or predictably discoverable without relying only on hover. Keep hover as enhancement, not the only way to understand the card.

- [x] **Step 2: Preserve the current strong hover image behavior**

Keep the image swap/progress behavior that already makes Kenmito feel modern, but ensure it never hides primary purchase controls or creates layout shift.

- [x] **Step 3: Tune mobile card density**

Keep mobile cards transactional like JaponiaCentralna: product image, name, price, stock/category, wishlist, and cart action should scan quickly in two-column layout.

- [x] **Step 4: Re-run card scan tests**

Run:
`npm run test:e2e -- tests/product-card-scan-value.spec.ts`

Expected: PASS with visible commercial affordances and stable mobile touch targets.

### Task 5: Add Wishlist, Menu, And Header Micro-Polish

**Files:**
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/MobileBottomNav.tsx`
- Modify: `src/components/product/ProductCard.tsx`
- Modify: `src/components/product/MobileProductCard.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/pl.json`

- [x] **Step 1: Add desktop wishlist hover/focus popover**

Model this after NaSushi: hovering or focusing the top wishlist icon should show a small popover explaining that saved products can be bought later. Include count/status if available from the existing wishlist store.

- [x] **Step 2: Improve product wishlist feedback**

Ensure product-card wishlist hover, focus, active, and saved states are visually distinct on desktop and mobile. Preserve accessible labels for add/remove states.

- [x] **Step 3: Upgrade the mobile menu drawer**

Make the drawer feel like a shopping drawer, not a plain link list: group account/wishlist/cart actions, main navigation, and category shortcuts. Keep close/search controls unambiguous.

- [x] **Step 4: Fix mobile bottom-nav spacing if needed**

Ensure bottom navigation uses safe-area padding and the page content has enough bottom padding so it does not cover cards or footer actions.

### Task 6: Enrich Below-The-Fold Content And Footer

**Files:**
- Modify: `src/app/[locale]/(shop)/page.tsx`
- Modify: `src/components/layout/Footer.tsx` if footer is centralized there
- Modify: `src/messages/en.json`
- Modify: `src/messages/pl.json`

- [x] **Step 1: Add practical inspiration content only where data exists**

If recipe or collection data is already available, add a compact inspiration/recipe strip below products. Do not create a fake blog/newsletter flow without a working destination.

- [x] **Step 2: Strengthen footer commercial confidence**

Add clearer shop links, account links, legal links, pickup/service notes, and contact/social/payment information only if backed by existing config or real data.

- [x] **Step 3: Avoid marketing-page bloat**

Keep the landing as a usable shop first. Any SEO/inspiration copy should be short, scannable, and secondary to products/categories.

### Task 7: Verify, Document, And Commit

**Files:**
- Modify: `.claude/docs/progress.md`
- Modify: `.claude/docs/learnings.md` only if implementation reveals a new reusable lesson
- Use: `docs/superpowers/plans/2026-06-10-landing-visual-direction-brand-polish.md`

- [ ] **Step 1: Run focused visual QA**

Capture/inspect desktop and mobile screenshots for:
`/en`
`/pl`
with viewports around `1440x1100`, `390x844`, and one narrow mobile width.

- [x] **Step 2: Run targeted tests**

Run:
`npm run test:e2e -- tests/mobile-homepage.spec.ts --project=pixel-7`
`npm run test:e2e -- tests/product-card-scan-value.spec.ts`
`npm run test:e2e -- tests/wishlist-accessibility.spec.ts`

Expected: PASS.

- [x] **Step 3: Run static verification**

Run:
`npm run lint`
`npx tsc --noEmit`

Expected: PASS.

- [x] **Step 4: Update progress docs**

Record the landing polish result, remaining visual debt, and any intentionally skipped reference-site ideas that would be dishonest for Kenmito right now, such as fake shipping countdowns or fake review widgets.

- [ ] **Step 5: Commit with conventional commit style**

Commit the implementation and docs with a conventional commit, likely:
`fix: polish Kenmito landing brand direction`


**Current status note:** Implementation and automated checks are complete through targeted E2E/static verification. Screenshot artifact QA and commit are intentionally still open until requested.
