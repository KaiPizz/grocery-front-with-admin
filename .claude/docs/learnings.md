# Learnings

> This is an error log. Every entry records a mistake that was made during development, what caused it, and how it was fixed. Before starting any task, read this file to avoid repeating past mistakes.
>
> **Last updated:** 2026-05-23

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

### Reused UI `GroceryProduct` type for raw GraphQL variant pricing
- **Error:** After extracting shared listing helpers, `npx tsc --noEmit` failed because `ProductVariant` in `src/types/index.ts` does not expose nested `variant.pricing`, even though live GraphQL product fragments do.
- **Cause:** `GroceryProduct` is an older UI-facing shape, while raw Zyra GraphQL products still carry Saleor-style nested pricing objects in several listing paths.
- **Fix:** Kept the global type unchanged and narrowed only the local price-reader helper before reading `variant.pricing`.
- **Rule:** Do not casually expand shared UI product types to match one raw GraphQL operation. Use an operation-specific interface or a tight local narrowing at the boundary that reads raw GraphQL fields.

### Got local dev IP banned by fail2ban from GraphQL 400 bursts
- **Error:** Storefront dev could load Next pages but `/api/graphql` hung with `UND_ERR_CONNECT_TIMEOUT`, and `Test-NetConnection zira-ai.com -Port 443` failed even though DNS and ping worked.
- **Cause:** Zyra production `fail2ban` jail `nginx-bad-request` banned the current NAT IP after repeated `POST /graphql/storefront` requests returned HTTP 400 during schema/probe iteration. After ban, traffic was dropped at the iptables `f2b-nginx-bad-request` chain before nginx, so there were no nginx access logs.
- **Fix:** Backend unbanned the current public IP (`46.134.113.125`). Verified `https://zira-ai.com/api/v1/health` and a valid `/api/graphql` category query through the local Next proxy returned 200.
- **Rule:** Do not run bursty malformed GraphQL probes against production. In PowerShell, avoid hand-quoted curl JSON with `$variables`; use Node `JSON.stringify`, a saved JSON file, or a GraphQL client. If dev probing is needed, whitelist the current dev IP in fail2ban or use a local backend.

### Assumed GraphQL response fields were non-null
- **Error:** Code like `product.pricing.priceRange.start.gross.amount` crashed with "Cannot read property of null" because intermediate fields were null.
- **Cause:** Zyra returns nullable fields at every nesting level. A variant can have `pricing: null` even though the product has a price elsewhere.
- **Fix:** Chain every access with `?.` and provide fallbacks: `product?.pricing?.priceRange?.start?.gross?.amount ?? 0`.
- **Rule:** Never assume a nested field from Zyra exists. Always use optional chaining with defaults.

### Reused stale Zyra checkout/category assumptions after backend contract changed
- **Error:** Frontend planning still treated category slugs as unsafe, payment methods as `{ code, name }` with `countryCode`, and promo codes as cart-level discounts even after backend confirmed the live contract.
- **Cause:** Important backend-bot findings were living in chat/downloaded notes instead of durable docs. The live backend schema has `Category.slug: String!` fixed by production commit `f0c0133a`, `availablePaymentMethods(channel)` with `PaymentMethod.id`, and legacy checkout promo mutations that run after `checkoutCreateFull`.
- **Fix:** Recorded the contract in the wiki vault at `D:\kaipizz-second-brain\store-front-brain\wiki\decisions\enail-storefront-zyra-storefront-contract.md`. Frontend work should use category slug routes, query `availablePaymentMethods(channel) { id name description provider isActive fee { amount currency } }`, pass `id` as `CheckoutPaymentInput.gateway`, and apply promo codes with `checkoutPromoCodeAdd(input: { checkoutId, promoCode })` after checkout creation.
- **Rule:** Before changing Zyra GraphQL operations, read the vault contract page first. Do not resurrect old probes or stale schema guesses unless live verification disproves the documented contract.

### Trusted a recent live product-count snapshot as if it were durable
- **Error:** Treated the 2026-05-13 `chesaigon` snapshot of 121 storefront-visible products as still true while planning the next slice on 2026-05-15.
- **Cause:** Backend catalog data is mutable, and a wiki note that was accurate two days ago is not an invariant.
- **Fix:** Re-ran a fresh live GraphQL probe on 2026-05-15, found `products(channel:"chesaigon")` had regressed to `totalCount: 1`, and updated the wiki/SCR to make the data drift explicit.
- **Rule:** Recheck live channel counts and representative sample values before any product-data-dependent work; treat old snapshots as history, not current truth.

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

## Config & Navigation Errors

### Removed config env but code still had localhost fallback
- **Error:** Treating "drop `NEXT_PUBLIC_CONFIG_API_URL`" as an env-only change would still make the storefront call `http://localhost:4100/api/config/{slug}`.
- **Cause:** Both server metadata/layout config fetch and client `ConfigProvider` used `process.env.NEXT_PUBLIC_CONFIG_API_URL || 'http://localhost:4100'`.
- **Fix:** Made config API opt-in: missing or blank `NEXT_PUBLIC_CONFIG_API_URL` returns `null` on the server and skips client refresh.
- **Rule:** When disabling an optional integration, remove the fallback call path; deleting the env var is not enough if code supplies a default URL.

### Confused admin UI URL with config API integration
- **Error:** Adding `NEXT_PUBLIC_ADMIN_URL=http://localhost:4100/admin` did not make storefront use admin config, and admin stayed on `chesaigon` while storefront used `kamito`.
- **Cause:** Admin UI URL is only an operator link; storefront config reads from `NEXT_PUBLIC_CONFIG_API_URL` and `NEXT_PUBLIC_SALON_SLUG`. The homepage also rendered the hardcoded legacy hero before admin banner blocks.
- **Fix:** Re-enabled `NEXT_PUBLIC_CONFIG_API_URL`, aligned admin/storefront slug to `kamito`, published `config-kamito.json`, and promoted admin hero blocks into the first homepage hero slot with a regression test.
- **Rule:** For admin integration, verify all three layers: admin slug, config API URL, and storefront render surface. A URL bookmark is not a data integration.

### Tracked tenant config overwrote local admin banner content
- **Error:** Merging the commercial-navigation branch into `main` made the Kamito storefront lose admin-created homepage banners and fall back to the legacy text hero.
- **Cause:** The branch added a tracked `admin-panel/data/config-kamito.json` whose `homepage.blocks` arrays were empty. That tracked file replaced the local tenant data that the admin API had been serving.
- **Fix:** Restored Kamito `homepage.blocks` from the surviving Chesaigon config media block data, kept Kamito branding/commercial settings, and removed the misleading `.gitignore` entry for a file that is tracked.
- **Rule:** Never add a tenant config file to a branch unless its draft and published content are the intended source of truth. If tenant data is local-only, untrack it before merging; `.gitignore` does not protect files once they are tracked.

### Left a transparent hover gap between the header and category mega menu
- **Error:** Moving from the Categories nav item into the desktop mega menu was brittle, and the page could still scroll behind the open category overlay.
- **Cause:** The fixed menu wrapper used top padding below the header, so the pointer crossed a dead zone that triggered immediate `onMouseLeave`. The menu also had no body scroll lock and Escape handling was scoped too narrowly to focused header elements.
- **Fix:** Removed the physical gap, shared pointer ownership between the trigger and panel, added a short close delay, locked `document.body` scroll on desktop while open, and added document-level Escape close. Added Playwright regressions for attached geometry and background scroll lock.
- **Rule:** Hover overlays must be physically contiguous with their trigger or have an intentional hover bridge plus close delay; modal-like navigation overlays should lock background scroll and close from global Escape.

### Treated an empty configured nav list as an intentional empty desktop nav
- **Error:** Header rendered no desktop nav links when `layout.header.navItems` existed but was an empty array in the mock/admin config. This hid the Categories link before the new mega-menu behavior could even be reached.
- **Cause:** The code checked `headerCfg?.navItems` for truthiness. Empty arrays are truthy, so the fallback nav was skipped even though there were no enabled configured items.
- **Fix:** Build the enabled configured nav list first and only use it when `length > 0`; otherwise fall back to Home/Categories/Products/Recipes. Added RED→GREEN Playwright coverage through the desktop category mega-menu test.
- **Rule:** For admin-configured arrays where an empty list means "unset", check the filtered list length before replacing defaults.

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

### Imported Lucide `Image` directly on an admin page and triggered a false accessibility warning
- **Error:** `next lint` reported `jsx-a11y/alt-text` on the admin dashboard even though the node was a Lucide icon component, not an HTML `<img>`.
- **Cause:** Naming the imported icon `Image` makes the JSX lint rule treat `<Image />` like an image element that requires `alt`.
- **Fix:** Aliased the icon import to `ImageIcon` before using it in the dashboard.
- **Rule:** In React admin pages, alias Lucide's `Image` export to `ImageIcon` (or similar) so lint can distinguish it from real image elements.

### Ran `next build` while Playwright was running `next dev`
- **Error:** `npm run build` failed during page data collection with `PageNotFoundError: Cannot find module for page: /_document`.
- **Cause:** The build was started in parallel with Playwright, whose web server was running `npx next dev` in the same app directory. Both processes touched `.next` at the same time.
- **Fix:** Waited for Playwright to finish, then reran `npm run build` sequentially; the build passed.
- **Rule:** Do not run `next build` concurrently with Playwright or any active `next dev` process for the same workspace. Run Next build and Playwright sequentially.

### `npm run dev` failed because port 3008 was already held by stale Next dev
- **Error:** Storefront `npm run dev` failed with `listen EADDRINUSE: address already in use :::3008`.
- **Cause:** A prior `node ...next/dist/server/lib/start-server.js` process for `grocery-storefront` was still listening on port 3008.
- **Fix:** Identified the listener with `Get-NetTCPConnection -LocalPort 3008` and `Get-CimInstance Win32_Process`, then stopped only that owning process. Confirmed `NO_LISTENER_3008` afterward.
- **Rule:** Before starting storefront dev or build work, check for stale `:3008` listeners and stop the old Next process if it belongs to this workspace.

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

### Reused generic labels on repeated cart item actions
- **Error:** Each cart line exposed the same `Save for later` button name to assistive tech, so a keyboard or screen-reader shopper could not tell which product would be saved when multiple cart items exist.
- **Cause:** The button reused the visible wishlist copy and missed the product-specific accessible naming pattern already used by remove and quantity controls.
- **Fix:** Added a cart-scoped `saveForLaterItem` i18n label, applied it as `aria-label`, and covered the cart page with a RED→GREEN Playwright accessibility spec.
- **Rule:** Any repeated per-product action in cart, wishlist, or product grids must include the product name in its accessible name, even when the visible label stays short.

### Left collapsed checkout panels in the accessibility tree
- **Error:** Payment choices stayed discoverable by `getByRole()` while the payment accordion panel was collapsed, and invalid delivery fields showed errors without moving focus or associating the error text with the input.
- **Cause:** Checkout sections were visually collapsed with `max-height`, `opacity`, and `overflow`, but the subtree was still accessible. Delivery validation set `aria-invalid` only, with no `aria-describedby` or first-error focus handoff.
- **Fix:** Inactive checkout panels now use `aria-hidden` plus `inert`; delivery validation focuses the first invalid field and links each field to its error text. Shipping and payment choice buttons also expose selected state through `aria-pressed`.
- **Rule:** Do not rely on CSS-only collapsed panels for accessibility. Hide inactive interactive subtrees from assistive tech and make validation errors both focusable and programmatically associated with their fields.

### OMS cart cost can be zero while product metadata has the real price
- **Error:** Header cart, mini cart, cart page, and checkout summary showed `0,00 zł` after adding a product whose card displayed a positive price.
- **Cause:** The OMS cart payload can return `0` for `line.cost.amountPerQuantity`, `line.cost.totalAmount`, and `cart.cost.subtotalAmount` immediately after add-to-cart. The cart store trusted those zero server amounts over the positive price captured from product metadata, and checkout read `cost.subtotalAmount` directly.
- **Fix:** Cart line mapping and subtotal calculation now fall back to positive product metadata when the matching server amount is zero. Checkout uses the corrected cart subtotal, and product-detail/recipe add-to-cart paths have price fallbacks for missing nested variant pricing.
- **Rule:** Treat external cart cost `0` as suspect when the same line has positive local product metadata. Centralize the fallback in cart state and cover it with a regression test before touching UI surfaces.

### Playwright can report all tests ok but hang during teardown on Windows
- **Error:** The B1 category browsing and BottomNav targeted Pixel run printed 15/15 `ok`, but the `playwright.cmd` process never returned and the shell killed it on timeout.
- **Cause:** The app routes and test assertions completed; no `:3018` or `:4199` listener remained afterward. The failure is consistent with Playwright webServer/process teardown hanging on Windows, not with a storefront behavior failure. Replacing `npx next dev` with a direct Next CLI command did not fix the hang.
- **Fix:** Treat the per-test `ok` output as useful signal, but not a clean command pass. Verify the app with `next build`, inspect artifacts/ports when needed, and track the teardown issue as test harness debt before relying on this command as a hard CI gate.
- **Rule:** When Playwright output shows all target tests passed but the process times out after test completion, do not churn product code. Separate product failures from harness teardown failures and document the residual risk.

### Used hover to open desktop UI inside a touch-emulated Playwright project
- **Error:** `cart-price-integrity.spec.ts` tried to open the desktop mini cart with `cartLink.hover()` while running under the `pixel-7` project. The test forced a 1280px viewport, but the browser context still had touch/mobile emulation, so the hover path did not reliably open the dialog.
- **Cause:** The test mixed desktop layout assertions with a mobile-emulated project and depended on pointer hover instead of the component's keyboard/focus accessibility path.
- **Fix:** Open the mini cart with `cartLink.focus()` for the price-integrity assertion, which exercises the same dialog without relying on hover availability.
- **Rule:** In mobile-emulated Playwright projects, avoid hover as the only way to reveal UI. Prefer focus/click paths for behavior tests unless hover itself is the contract under test.

### Trusted a URL assertion after desktop navigation in a mobile-emulated project
- **Error:** The first commercial-navigation RED/GREEN spec asserted `toHaveURL()` after clicking a desktop quick link while running in the `pixel-7` project with a forced desktop viewport. The assertion reported the old `/en` URL even though the failure snapshot showed the collection page content and the link had the correct `/en/collections/korean-pantry` href.
- **Cause:** The test mixed desktop layout with a mobile-emulated browser context, and the URL assertion became stale while the app-rendered route content had already changed.
- **Fix:** Assert the quick link's `href`, assert the collection page content after click, and keep direct route tests for `/collections/[slug]` and `/outlet`.
- **Rule:** When a Playwright project uses mobile emulation but a test forces desktop layout, do not rely on URL alone for SPA navigation. Verify the link target plus rendered route content, and keep direct route/status tests for bookmarkable URLs.

### Validated unrelated schema blockers in a narrow config test
- **Error:** A RED test for removing `showThemeToggle` from the admin config schema failed first on `homepage.blocks[0].slides[0].imageUrl` being null, not on the legacy theme flag.
- **Cause:** `DEFAULT_CONFIG` is useful as an app fallback but is not directly schema-valid for publishable banner blocks because enabled hero slides require images.
- **Fix:** The test fixture now sets a valid hero image before checking that validation strips the legacy theme flag.
- **Rule:** When testing one config field through the full storefront schema, first make unrelated required config branches valid so the failure proves the target behavior.
