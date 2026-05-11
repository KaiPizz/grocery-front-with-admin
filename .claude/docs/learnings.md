# Learnings

> This is an error log. Every entry records a mistake that was made during development, what caused it, and how it was fixed. Before starting any task, read this file to avoid repeating past mistakes.
>
> **Last updated:** 2026-05-11

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

### Wrote implementation-shaped tests instead of spec-shaped tests
- **Error:** A mobile products E2E test asserted overlay action buttons were `<=36px` because that matched an earlier UI implementation. After the app intentionally moved to 44px tap targets for accessibility, the test failed even though the product requirement was better satisfied.
- **Cause:** The assertion was derived from the existing UI shape, not from the PRD/user need. It optimized for "what was built" instead of "what the shopper/admin workflow requires."
- **Fix:** Updated the testing rule to require reading the PRD/progress/task plan before writing tests and deriving assertions from product requirements. The stale assertion was changed to protect the actual accessibility contract: tap targets must be at least 44px while staying compact.
- **Rule:** Tests must be spec-first. Start from PRD goals, user stories, workflow requirements, accessibility/compliance constraints, and documented backend contracts. Only assert implementation details when the spec explicitly makes them part of the contract.
