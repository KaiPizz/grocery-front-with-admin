# Learnings

> This is an error log. Every entry records a mistake that was made during development, what caused it, and how it was fixed. Before starting any task, read this file to avoid repeating past mistakes.
>
> **Last updated:** 2026-05-12

---

## Performance Errors

### Used `background-attachment: fixed` on body gradient
- **Error:** Homepage gradient used `background-attachment: fixed` on `<body>`, causing full-page repaint on every scroll frame. FPS dropped to ~30 on mobile.
- **Cause:** `background-attachment: fixed` forces the browser to repaint the entire element on every scroll because the background doesn't move with the content.
- **Fix:** Replaced with a `position: fixed` pseudo-element (`body::before`) with `will-change: transform` to promote it to a GPU layer. See `globals.css`.
- **Rule:** Never use `background-attachment: fixed`. Use a fixed pseudo-element instead.

### Added scroll listener without throttling
- **Error:** Header hide-on-scroll had a bare `addEventListener('scroll', handler)` that caused layout thrashing and jank on mobile.
- **Cause:** Scroll fires dozens of times per frame. Without throttling, each call triggers layout recalculation.
- **Fix:** Wrapped handler in `requestAnimationFrame` with a guard (`if (rafId) return`). Added `{ passive: true }` to all scroll/pointer listeners. See `Header.tsx`.
- **Rule:** Every scroll listener must use rAF throttling. Never add a bare scroll handler.

---

## React State Bugs

### Read React state immediately after `setState` — got stale value
- **Error:** In checkout, `handleSavedAddressSelect()` called `setForm(nextForm)` then immediately called `handleDeliveryContinue()` which read `form` — but got the old form, not the one just set.
- **Cause:** React `setState` is async. The state isn't updated until the next render.
- **Fix:** Pass the form snapshot as an explicit argument: `handleDeliveryContinue(nextForm)` instead of relying on React state.
- **Rule:** When you need to act on state you just set, pass the value directly — don't read it back from state.

### Destructured entire Zustand store, caused excess re-renders
- **Error:** Components re-rendered on every store change even when their data hadn't changed.
- **Cause:** `const { items, removeItem } = useCartStore()` subscribes to the entire store, not just the fields you destructured.
- **Fix:** Use individual selectors: `const items = useCartStore((s) => s.items)`. Each selector creates a targeted subscription.
- **Rule:** Always use selector functions with Zustand. Never destructure the whole store.

---

## Zyra API Errors

### Assumed GraphQL response fields were non-null
- **Error:** Code like `product.pricing.priceRange.start.gross.amount` crashed with "Cannot read property of null" because intermediate fields were null.
- **Cause:** Zyra returns nullable fields at every nesting level. A variant can have `pricing: null` even though the product has a price elsewhere.
- **Fix:** Chain every access with `?.` and provide fallbacks: `product?.pricing?.priceRange?.start?.gross?.amount ?? 0`.
- **Rule:** Never assume a nested field from Zyra exists. Always use optional chaining with defaults.

### Wishlist sync returned success but empty items
- **Error:** After syncing wishlist to server, querying the wishlist returned zero items even though sync said `success: true`. The UI cleared the wishlist.
- **Cause:** Server-side persistence for wishlist is unreliable — it acknowledges the mutation but doesn't always persist.
- **Fix:** Kept local items as the source of truth. On sync, if server returns empty but we sent items, keep local state and store `pendingSyncProductIds` for retry. See `wishlist-store.ts`.
- **Rule:** Treat wishlist server sync as best-effort. Never clear local items based on an empty server response.

### Product image URLs from Zyra pointed to broken CDN
- **Error:** Product thumbnails from `img.zira.pl` returned 404s, showing broken images.
- **Cause:** The CDN at `img.zira.pl` was down/migrated, but the same image IDs existed on `images.unsplash.com`.
- **Fix:** Added hostname rewriting in `normalizeImageUrl()` in `lib/utils.ts`. Also fixed double-slash paths and Unsplash `.webp` in `fit` parameter.
- **Rule:** Always run image URLs through `normalizeImageUrl()` before using them.

---

## Zustand Persistence Errors

### Store hydration crashed after schema change
- **Error:** After renaming `items` to `guestItems` in the wishlist store, existing users' localStorage had the old shape and the store threw during hydration.
- **Cause:** Zustand `persist` deserializes the old localStorage data and merges it with the initial state. Without a custom `merge`, it assumes the shape matches.
- **Fix:** Added a `merge` function to the persist config that handles both old (`items`) and new (`guestItems`) shapes. See `wishlist-store.ts`.
- **Rule:** When changing the shape of a persisted Zustand store, always add a `merge` function that handles migration from the old shape.

---

## CSS & Theming Errors

### Assumed the icon library covered every social platform
- **Error:** Treating "use lucide-react for social icons" as if the installed icon set covered every admin platform would have left TikTok, LINE, WhatsApp, Telegram, and Pinterest without reliable icons or pushed the project toward an unnecessary dependency.
- **Cause:** `lucide-react` ships some brand icons (Facebook, Instagram, Twitter, YouTube, LinkedIn) but not the full admin `PLATFORM_OPTIONS` list.
- **Fix:** Verified the local `lucide-react` exports before implementation, used lucide where available, and colocated tiny inline SVG fallbacks in `SocialBar.tsx` for the missing platforms.
- **Rule:** Before mapping admin-controlled platform names to icons, inspect the installed icon package and add small colocated SVG fallbacks for gaps; do not add a dependency for a handful of static icons.

### Used Tailwind color class instead of CSS variable — broke admin theming
- **Error:** A component used `text-green-600` for the primary color. When the admin changed the store's primary color, this component didn't update.
- **Cause:** Tailwind color classes are compile-time. CSS variables (`var(--color-primary)`) are runtime and get updated by `ConfigProvider`.
- **Fix:** Replaced with `style={{ color: 'var(--color-primary)' }}`.
- **Rule:** Never use Tailwind color classes for any color that's in the admin config. Always use inline `style` with CSS variables.

### Used `rgba()` for overlay — looked wrong in dark mode
- **Error:** A hover overlay used `rgba(0, 0, 0, 0.05)` which was invisible on dark backgrounds.
- **Cause:** Fixed RGBA values don't adapt to the color scheme. Black at 5% is fine on white but invisible on dark.
- **Fix:** Replaced with `color-mix(in srgb, var(--color-foreground) 5%, transparent)`. Since `--color-foreground` flips between light/dark themes, the overlay adapts.
- **Rule:** Use `color-mix()` with CSS variables instead of fixed `rgba()` for any semi-transparent effect.

### Used Tailwind `font-serif` — overrode custom font stack
- **Error:** Using `font-serif` on a heading applied the browser's default serif font instead of Fraunces.
- **Cause:** Tailwind's `font-serif` maps to `Georgia, serif` by default, not the project's `var(--font-display)`.
- **Fix:** Used `.heading-display` or `.heading-section` CSS classes instead, or inline `style={{ fontFamily: 'var(--font-display)' }}`.
- **Rule:** Use `.heading-display`/`.heading-section` for headings. Don't use Tailwind's `font-serif` or `font-sans`.

### Treating admin-controlled images like static Next images
- **Error:** The lint output tempts a blanket replacement of storefront `<img>` tags with `next/image`, but those warnings are on admin/runtime-configured logo and banner media.
- **Cause:** `next/image` optimization needs a known remote domain policy or an intentional unoptimized/custom-loader path. The production admin/CDN image domain is still undecided, and MVP uploads currently come from the admin panel.
- **Fix:** Fixed unrelated hook dependency warnings immediately, but left the runtime image warnings documented as production debt until deployment image storage/domain policy is chosen.
- **Rule:** Do not convert admin-configured image URLs to optimized `next/image` without first defining production media hosting and remote-pattern/loader behavior.

---

## Checkout Errors

### Didn't split `fullName` into first/last for Zyra checkout
- **Error:** Submitting the full name as `firstName` caused Zyra to reject the shipping address.
- **Cause:** Zyra expects separate `firstName` and `lastName` fields, but saved addresses store a single `fullName`.
- **Fix:** Split on whitespace: last word → `lastName`, everything before → `firstName`. See `handleSavedAddressSelect()`.
- **Rule:** When mapping between Zyra's split name fields and our single `fullName`, always do the split explicitly.

---

## Cleanup Errors

### Committed temp files from cloud sync
- **Error:** `.tmp.driveupload` and `.pen` files appeared in the repo after a cloud sync tool ran in the background.
- **Cause:** Cloud sync tools (Google Drive, OneDrive) create temp files in the working directory.
- **Fix:** Added patterns to `.gitignore`. Ran a cleanup pass to remove existing ones.
- **Rule:** Check for and remove temp files before committing. Keep `.gitignore` patterns up to date.

---

## Testing Errors

### Tested server-rendered config with browser-only route mocks
- **Error:** A SEO metadata test would have been unable to prove admin-configured metadata if it only used `page.route('**/api/config/**')`, because that intercepts browser requests but not the Next.js server render.
- **Cause:** `generateMetadata()` and root layout config fetches run in the Next dev server process. Browser route mocks only affect client-side refreshes after hydration.
- **Fix:** Added a tiny Playwright config API mock server and pointed the test Next server at it via `NEXT_PUBLIC_CONFIG_API_URL`, while keeping `page.route()` for client-refresh scenarios like tracking script injection.
- **Rule:** For SSR behavior, provide a real mock HTTP service through the app environment. Use `page.route()` only for browser-side fetches.

### Left admin SEO config out of Next metadata generation
- **Error:** Publishing SEO defaults in admin did not change the storefront document title, description, canonical link, or Open Graph tags; the root layout always used static env fallback metadata.
- **Cause:** `src/app/layout.tsx` exported a static `metadata` object and never consulted `StorefrontConfig.seo` during server metadata generation.
- **Fix:** Replaced static metadata with `generateMetadata()` that fetches published storefront config and falls back to env/default values when config fields are blank or unavailable.
- **Rule:** Any admin-configured SEO field must be wired through Next.js server metadata, not only through client context.

### Wrote implementation-shaped tests instead of spec-shaped tests
- **Error:** A mobile products E2E test asserted overlay action buttons were `<=36px` because that matched an earlier UI implementation. After the app intentionally moved to 44px tap targets for accessibility, the test failed even though the product requirement was better satisfied.
- **Cause:** The assertion was derived from the existing UI shape, not from the PRD/user need. It optimized for "what was built" instead of "what the shopper/admin workflow requires."
- **Fix:** Updated the testing rule to require reading the PRD/progress/task plan before writing tests and deriving assertions from product requirements. The stale assertion was changed to protect the actual accessibility contract: tap targets must be at least 44px while staying compact.
- **Rule:** Tests must be spec-first. Start from PRD goals, user stories, workflow requirements, accessibility/compliance constraints, and documented backend contracts. Only assert implementation details when the spec explicitly makes them part of the contract.

### Assumed a fixed scroll distance forces mobile sticky CTA state
- **Error:** `mobile-pd-extras.spec.ts` used `scrollBy(800)` and opacity polling to assert the product-detail sticky add-to-cart state. On taller mobile viewports, the inline CTA remained visible even at the page bottom, so the sticky CTA correctly stayed hidden and the test failed.
- **Cause:** The test encoded one viewport's mechanics instead of the user contract. It did not create the precondition it claimed to test: the inline CTA being out of view.
- **Fix:** Rewrote the sticky tests to use a short mobile viewport for out-of-view scenarios, scroll the inline CTA explicitly in/out of view, and assert the accessibility contract via `aria-hidden`.
- **Rule:** When testing viewport-dependent UI, first make the viewport satisfy the scenario precondition, then assert user-visible or accessibility state. Do not rely on magic scroll distances or raw opacity thresholds.

### Wrote implementation-shaped tests instead of spec-shaped tests (second occurrence)
- **Error:** Shipped `mobile-config-thresholds.spec.ts` for B21+B22+B23 with tests written AFTER the implementation. Tests verified the code did what was just written, not what the spec demanded. Missed: B21 threshold=0 (always-free), B22 minute-precision contract (an hour-only regression would have passed), B23 boundary qty=threshold (off-by-one would have passed), B23 threshold=0 (never-show).
- **Cause:** Skipped step 0 of the spec-first rule — did not open `.claude/docs/PRD.md` before writing tests; relied on the backlog entry only, which is itself a spec but lighter on edge-case implications. The agent optimised toward what the implementation just exercised rather than reverse-engineering the contract from the spec.
- **Fix:** Rewrote the file spec-first (commit `28ba763`). Each describe block now cites its PRD/backlog source. Added four edge-case tests derived from the spec (zero, minute-precision via `page.clock.install`, exact-boundary). All 22 runs pass — fortunately the original implementation already handled these correctly, so no source change needed, but the tests now lock those handlings in as contracts.
- **Rule:** Before writing or changing any test: open `.claude/docs/PRD.md` first, read the relevant § sections, list spec-implied edge cases (zero / negative / boundary / interaction / missing config) in writing, THEN write the test, THEN write or change the implementation. If you have already implemented, write the spec-first test anyway and confirm whether the implementation matches the spec — if it does not, fix the implementation, do not relax the assertion.

### Playwright config mocks fire on client refresh, not on SSR
- **Error:** New spec-first tests for admin-configurable thresholds asserted UI text directly and intermittently failed because the page rendered the SSR config first and only flipped to the mocked value after the client-side refresh fired.
- **Cause:** `page.route()` intercepts browser network calls. The storefront fetches `StorefrontConfig` twice — server-side in `app/layout.tsx`'s `fetchServerConfig` (not interceptable) and again client-side in `ConfigProvider.refreshConfig` on mount (interceptable). The first paint uses whatever the SSR call returned (admin's real values or `null` → fallback); the mock only lands after the post-mount refresh updates the React context.
- **Fix:** Wrap config-dependent assertions in `expect.poll(...)` so they wait for the eventual state. Treat the initial paint as throwaway in these tests.
- **Rule:** When a Playwright test depends on admin-configured behavior, always poll the assertion. Configure the route handler before `page.goto`, then poll the rendered text/state until it reflects the mocked config.

### Playwright clock install does not freeze wall time during navigation
- **Error:** B8 countdown tests initially expected exactly `03:30:00` after `page.clock.install({ time })`, but the app rendered `03:29:5x` because mocked wall time still advanced while Next loaded and hydrated.
- **Cause:** `clock.install({ time })` starts fake time at the requested instant but lets it progress. Navigation/hydration time consumes seconds before the assertion runs.
- **Fix:** Install the clock one minute before the target wall time, let the page load, then call `page.clock.pauseAt(targetTime)` before asserting exact countdown text. Use `page.clock.runFor(1000)` to prove one-second ticks.
- **Rule:** For exact countdown tests, do not rely on `clock.install({ time })` alone. Install early, navigate, `pauseAt()` the target time, then advance with `runFor()` for deterministic ticks.

### Homepage specs inherited real admin config and asserted deferred category UI
- **Error:** `mobile-homepage.spec.ts` failed on `mobile-home-quick-categories`, and targeted runs could also fail on missing hero/desktop hero because the test did not mock storefront config.
- **Cause:** The spec mixed a future category-browse placeholder with shipped homepage behavior. Real multi-level categories and `/categories` are B1/B2 and remain backend-blocked. The test also depended on whatever the real admin config returned for hero/section visibility instead of setting the homepage contract explicitly.
- **Fix:** Added a deterministic homepage config route mock and changed the mobile browse assertion to the shipped Shop-by-Zone links documented in `progress.md`. Removed the blocked quick-categories/scroll-track assertions.
- **Rule:** Homepage tests must mock `StorefrontConfig` before `page.goto()` and assert shipped PRD/progress behavior. Do not assert deferred backlog features as if they already exist.

### Tested skip navigation as an anchor under WebKit mobile emulation
- **Error:** The homepage skip navigation test passed on the Pixel project but failed on the iPhone project after adding a standard anchor skip link.
- **Cause:** WebKit/Safari-style tab traversal can skip anchor links unless full keyboard navigation is enabled, so an anchor-only fragment link did not reliably become the first keyboard focus target in this Playwright matrix.
- **Fix:** Implemented the storefront skip control as the first DOM button with `aria-controls="main-content"` and programmatic focus on `main#main-content`; kept the test on a narrow viewport with touch-only emulation disabled for keyboard traversal.
- **Rule:** For this storefront's skip-to-content affordance, prefer a focusable button that moves focus to the main landmark over an anchor-only fragment link.

### Chased browser-injected console warnings as app bugs
- **Error:** Console warnings pointed at the storefront, including `Extra attributes from the server: bis_skin_checked` near `ShippingCountdown` and a Summarizer API warning about a missing output language.
- **Cause:** Neither `bis_skin_checked` nor Summarizer API usage is emitted anywhere in source, tests, or `.next`; a clean Playwright Chromium run on `/en` captured no matching console messages and no `[bis_skin_checked]` DOM attributes. These warnings come from browser/extension tooling mutating or calling APIs in the page context.
- **Fix:** Verified the strings are absent from source/build output and reproduced the page in a clean browser before touching code. Do not add `suppressHydrationWarning` or Summarizer shims to storefront components for these warnings; use a clean browser profile or disable the injecting extension/tool when validating hydration.
- **Rule:** For console warnings naming unknown attributes or browser APIs, search source and built output, then reproduce in a clean browser. If the warning disappears, fix the browser environment instead of masking real app mismatches in code.
