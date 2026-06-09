# Landing Product Card Media Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `verification-before-completion` before claiming the implementation is done. Use `systematic-debugging` if any browser, Playwright, or hydration behavior differs from the plan.

**Goal:** Improve landing-page product cards so media previews communicate progression through all available images, and cart/bookmark actions do not create constant visual noise on the landing page.

**Architecture:** Keep the existing product-card components and make the behavior opt-in from the homepage. Product listing/search cards keep their current fast-shopping behavior.

**Tech Stack:** Next.js, React, TypeScript, Tailwind for layout, CSS custom properties for runtime theme colors, Playwright for verification.

---

## Research Findings

Reference pages inspected:

- `https://japoniacentralna.pl/`
- `https://sklep.nasushi.pl/Promocja-spromo-pol.html`
- Local page: `http://localhost:3008/en`

Firecrawl CLI was not available in this checkout, so the research used the in-app browser and live DOM inspection instead. A full crawl was intentionally not used because only two specific interaction patterns were needed.

Observed reference behavior:

- Japonia Centralna injects a hover-only carousel over the product image. Its `g01_script.js` config uses `expositionTime: 3000`, `maxImgCount: 5`, starts the hover cycle at image `2/n`, stacks images absolutely, crossfades opacity, and renders the timebar as a counter pill with the progress fill inside the pill.
- NaSushi does not fully hide cart/bookmark controls in the inspected listing. Favorite and add-to-cart controls remain present, but the layout reduces visual noise by placing actions in a clearer hierarchy.
- The local landing card previously showed a `1/3` badge but hover only switched between image 1 and image 2. Image 3 was never previewed.
- The local desktop landing card keeps add-to-cart and wishlist visible all the time.
- The local mobile landing card shows `1/n` but has no preview progression, and both add/wishlist overlays are always visible.

Important correction: "hide cart/bookmark like NaSushi" is a weak assumption. The better implementation is not to copy a nonexistent hidden-state pattern. The useful pattern is lower visual priority on landing cards, while keeping listing cards optimized for quick buying.

---

## Success Criteria

- Desktop homepage product cards cycle through all product media while hovered or keyboard-focused.
- Hover starts the same way as the reference: the carousel enters at image `2/n`, then advances on a visible 3000ms timing affordance.
- The image counter reflects the active preview image: `1/3`, `2/3`, `3/3`, then loops.
- Leaving hover/focus resets the card to the primary image and `1/n`.
- Add-to-cart and wishlist are not permanently visible on desktop landing cards unless the product is already in that state.
- Mobile homepage cards do not show the current noisy pair of floating add/wishlist controls by default.
- Product listing, catalog, and mobile product listing cards keep their existing quick action behavior.
- Reduced-motion users do not get forced auto-cycling animation.
- Focused Playwright tests cover the new landing behavior and prove listing behavior is not regressed.

---

## Implementation Plan

### 1. Add a real desktop media preview state

File: `grocery-storefront/src/components/product/ProductCard.tsx`

Replace the boolean `previewingSecondImage` state with explicit slideshow state:

```tsx
const PRODUCT_PREVIEW_INTERVAL_MS = 3000;
const PRODUCT_PREVIEW_MAX_IMAGES = 5;

const [previewingImages, setPreviewingImages] = useState(false);
const [activeImageIndex, setActiveImageIndex] = useState(0);
```

Behavior:

- On `onMouseEnter` and `onFocus`, make the carousel layer ready and fade it in.
- Start at image index `1` (`2/n`) to match the reference hover behavior.
- While active, advance `activeImageIndex` with modulo over the preview image set.
- On `onMouseLeave` and `onBlur`, stop previewing and reset `activeImageIndex` to `0`.
- If `cardImages.length < 2`, do not start interval or render progress.
- Respect `prefers-reduced-motion: reduce` by not starting the interval.

### 2. Render any active media image, not only image 2

File: `grocery-storefront/src/components/product/ProductCard.tsx`

Current behavior only defines `primaryImage` and `secondaryImage`. Change it to:

```tsx
const primaryImage = cardImages[0] ?? null;
const activeImage = cardImages[activeImageIndex] ?? primaryImage;
const hasPreviewImages = cardImages.length > 1;
```

Keep the primary image as the stable base layer for layout and thumbnail fallback. Render a stacked carousel layer with up to five images, then crossfade slide opacity so media changes do not remount abruptly.

### 3. Put the timing affordance inside the counter pill

Files:

- `grocery-storefront/src/components/product/ProductCard.tsx`
- `grocery-storefront/src/app/globals.css`

Use the existing image counter as the timebar, matching the reference model. The counter pill contains a filler layer behind the text. The filler animates with `transform: scaleX(...)`, not `width`, to follow the project performance rules.

Use theme-aware CSS custom properties, for example:

```tsx
style={{
  backgroundColor: 'color-mix(in srgb, var(--color-foreground) 25%, transparent)',
}}
```

Keep `product-card-image-progress` inside `product-card-image-counter` so tests prove the progress indicator is not rendered as a separate strip.

### 4. Make landing desktop actions reveal-only

File: `grocery-storefront/src/components/product/ProductCard.tsx`

Add an opt-in prop:

```tsx
type ProductCardActionVisibility = 'always' | 'reveal';

interface ProductCardProps {
  actionVisibility?: ProductCardActionVisibility;
}
```

Default: `always`.

For `actionVisibility="reveal"`:

- Hide wishlist if the product is not already wishlisted.
- Hide add-to-cart if the product is not already in cart.
- Reveal hidden actions on card hover and `focus-within`.
- Keep already-active state visible. A filled wishlist or existing cart quantity should not disappear because that hides state from the user.

Use opacity/transform/pointer-events only. Do not animate dimensions or background color.

### 5. Use reveal mode only on landing desktop cards

File: `grocery-storefront/src/app/[locale]/(shop)/page.tsx`

Pass the new prop only in homepage sections:

```tsx
<ProductCard
  product={product}
  actionVisibility="reveal"
/>
```

Apply this to the desktop landing deal and fresh-pick product cards. Do not change catalog/listing usage.

### 6. Reduce mobile landing quick-action noise without relying on hover

File: `grocery-storefront/src/components/product/MobileProductCard.tsx`

Add an opt-in prop:

```tsx
type MobileProductQuickActions = 'always' | 'landing-compact';

interface MobileProductCardProps {
  quickActions?: MobileProductQuickActions;
}
```

Default: `always`.

For `quickActions="landing-compact"`:

- Hide the idle wishlist overlay on homepage mobile cards.
- Hide the idle add-to-cart overlay on homepage mobile cards.
- Keep visible state if the product is already in cart or already wishlisted.
- Leave product listing mobile cards unchanged.

This is intentionally different from desktop. Touch devices do not have reliable hover, so hiding actions behind hover would be a bad interaction.

### 7. Apply compact mode only on landing mobile cards

File: `grocery-storefront/src/app/[locale]/(shop)/page.tsx`

Pass compact mode only to:

- `mobile-home-deal-card`
- `mobile-home-product-card`

Do not pass it to catalog or product-listing cards.

### 8. Update focused Playwright coverage

Files:

- `grocery-storefront/tests/product-card-scan-value.spec.ts`
- `grocery-storefront/tests/mobile-homepage.spec.ts`

Desktop test updates:

- Assert local landing product card starts at `1/3`.
- Hover the card.
- Assert `product-card-image-progress` becomes visible.
- Assert the counter advances to `2/3`.
- Assert the counter advances to `3/3`.
- Move mouse away and assert it resets to `1/3`.
- Assert listing cards still show add-to-cart and wishlist by default.

Mobile homepage test updates:

- Assert landing mobile cards still render and link correctly.
- Assert idle floating add/wishlist controls are hidden for landing compact cards.
- Keep existing mobile listing tests unchanged so default quick actions remain covered elsewhere.

### 9. Verification commands

Run from `C:\grocery-front-with-admin\grocery-storefront`:

```powershell
npm run lint
npm run test:e2e -- product-card-scan-value.spec.ts mobile-homepage.spec.ts
```

Manual verification after tests:

- Open `http://localhost:3008/en` on desktop.
- Scroll to landing product cards.
- Hover a product with 3 images and confirm `1/3 -> 2/3 -> 3/3`.
- Confirm add-to-cart/wishlist reveal only on hover/focus for landing desktop cards.
- Check mobile viewport and confirm homepage cards are quieter while listing pages still show quick actions.

---

## Risks

- If the product card remains wrapped in a `Link`, hidden buttons can still receive keyboard focus. The reveal-on-`focus-within` behavior must make the focused control visible before interaction.
- Next Image overlays can trigger extra requests if every image is rendered at once. Limit the stacked carousel to the first five images, matching the reference cap.
- A carousel on mobile landing cards would conflict with scroll and tap navigation. The plan deliberately avoids mobile auto-preview unless a later design explicitly asks for it.
- Hiding all purchase affordances globally would damage catalog conversion. Keep the behavior landing-only.

---

## Out Of Scope

- Rebuilding the product card layout.
- Changing product data fetching.
- Changing catalog/listing shopping behavior.
- Adding swipe gestures or a full mobile image carousel.
- Updating admin-panel behavior.
