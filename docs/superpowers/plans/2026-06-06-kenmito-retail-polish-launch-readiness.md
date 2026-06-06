# Kenmito Retail Polish And Launch Readiness Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Kenmito catalog, product detail, and checkout readiness surfaces feel like a credible specialty grocery storefront while backend finishes the required payment, pickup, warehouse, and order-notification wiring.

**Architecture:** Keep this as a focused storefront polish slice, not a redesign. Fix product imagery, card density, gallery behavior, checkout empty-state truth, and launch documentation using existing components and Zyra GraphQL fields; defer backend-owned checkout activation and owner-owned content.

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind layout utilities, next-intl, Zustand, Zyra Storefront GraphQL, Playwright.

---

## Ground Truth

- Shopper-facing brand is `Kenmito`; technical channel/config slug remains `kamito`.
- Backend audit from 2026-06-06 is the current source of truth: production browse works, but checkout is **NO-GO** because `availablePaymentMethods(channel:"kamito")` and `availableShippingMethods(channel:"kamito")` both return `[]`.
- Historical wiki notes saying `PICKUP` and `bank_transfer` were active are stale for current production.
- Stock remains placeholder seed data; frontend must keep `availability_only` behavior and never show exact `100` as live inventory.
- Listing queries currently fetch `thumbnail`; PDP fetches `media { url alt type sortOrder }`.
- Kamito media can contain duplicate image bytes under different URLs; frontend should not hash CDN images client-side.

## File Structure

- Modify `grocery-storefront/src/components/product/ProductCard.tsx`
  - Desktop card image policy, action hierarchy, catalog facts density, secondary-image hover/focus if media is available.
- Modify `grocery-storefront/src/components/product/MobileProductCard.tsx`
  - Mobile card density, touch-first quick-add behavior, stepper only after item is in cart, image count badge if media count is available.
- Modify `grocery-storefront/src/app/[locale]/(shop)/products/[id]/page.tsx`
  - PDP gallery `object-contain`, `1/n` counter, previous/next controls, mobile swipe or touch navigation, index-specific aria labels.
- Modify `grocery-storefront/src/lib/graphql/operations/grocery.ts`
  - Add listing `media { url alt type sortOrder }` only if needed for desktop hover image and image-count badge. Do not add unsupported pagination args to `media`.
- Modify `grocery-storefront/src/types/index.ts`
  - Add a narrow optional product media shape only if listing media is consumed by cards.
- Modify `grocery-storefront/src/app/[locale]/(shop)/checkout/page.tsx`
  - Replace misleading empty payment/shipping copy with launch-readiness copy when backend returns no methods.
- Modify `grocery-storefront/src/messages/en.json`
  - Add or update user-facing copy for gallery counters, unavailable checkout setup, compact fulfillment/trust labels.
- Modify `grocery-storefront/src/messages/pl.json`
  - Same as English, with correct Polish diacritics.
- Modify `grocery-storefront/tests/product-card-scan-value.spec.ts`
  - Update card-density and fulfillment-chip expectations.
- Modify `grocery-storefront/tests/listing-cart-controls.spec.ts`
  - Lock mobile stepper-after-add behavior and desktop focus/hover-safe purchase controls.
- Modify `grocery-storefront/tests/mobile-pd-extras.spec.ts`
  - Add gallery counter, object-contain/no-crop, previous/next, and aria-label coverage.
- Modify `grocery-storefront/tests/kamito-launch-hardening.spec.ts`
  - Add no-shipping/no-payment backend readiness empty-state coverage.
- Modify `.claude/docs/progress.md`
  - Record completed polish and remaining backend/owner blockers after implementation.
- Modify `.claude/docs/learnings.md`
  - Record any non-obvious behavior discovered during implementation.

## Non-Goals

- No technical rename from `kamito` to `kenmito`.
- No fake shipping, fake bank-transfer setup, fake stock, fake sale, fake notification, fake owner details.
- No backend mutation from the frontend repo.
- No hover-only primary purchase action on mobile.
- No client-side CDN image hashing to hide backend duplicate-media debt.
- No broad homepage redesign; the previous catalog-first homepage slice already handled that lane.

---

### Task 1: Lock Product Image Policy And Card Density Tests

- [ ] Read `.claude/docs/progress.md`, `.claude/docs/learnings.md`, and `D:\kaipizz-second-brain\store-front-brain\wiki\ops\now\kamito-mobile-storefront-production-flow.md`.
- [ ] In `grocery-storefront/tests/product-card-scan-value.spec.ts`, update the mobile card requirement: fulfillment truth must not repeat three operational chips on every product card.
- [ ] In the same spec, assert listing cards still show product essentials: image, name, price, unit price when present, broad availability, wishlist, and add affordance.
- [ ] Add a desktop assertion that the product image is rendered with a no-crop policy for package imagery.
- [ ] Add a mobile assertion that the card does not expose a full quantity stepper before the item is added to cart.
- [ ] Run:

```powershell
cd grocery-storefront
npx playwright test tests/product-card-scan-value.spec.ts --project=pixel-7
```

Expected: RED for current card density and pre-add stepper assumptions.

### Task 2: Apply Product Image No-Crop Policy

- [ ] In `ProductCard.tsx`, change the listing product image from `object-cover scale-[1.06]` to `object-contain` with modest internal padding.
- [ ] Keep the square reserved canvas to avoid layout shift.
- [ ] In `MobileProductCard.tsx`, keep `object-contain` and increase padding only if real Kenmito package images still feel cramped.
- [ ] In `page.tsx` PDP gallery, change main and thumbnail package images from `object-cover` to `object-contain`.
- [ ] Verify the no-image placeholder is unchanged.
- [ ] Run:

```powershell
cd grocery-storefront
npx playwright test tests/product-card-scan-value.spec.ts tests/mobile-pd-extras.spec.ts --project=pixel-7
```

Expected: image-policy assertions pass; unrelated gallery/card tests stay green.

### Task 3: Reduce Product Card Operational Noise

- [ ] In both card components, remove pickup/bank-transfer/manual-confirmation chips from per-product catalog facts.
- [ ] Preserve broad availability and trustworthy product facts such as category, origin, or storage when present.
- [ ] Keep page-level/home-level trust strips as the place for fulfillment promises.
- [ ] In `ProductCard.tsx`, keep desktop purchase controls keyboard-reachable with `focus-within`; do not rely on pointer hover alone.
- [ ] In `MobileProductCard.tsx`, keep 44px touch targets for add and wishlist.
- [ ] Run:

```powershell
cd grocery-storefront
npx playwright test tests/product-card-scan-value.spec.ts --project=pixel-7
```

Expected: no repeated operational chips; add/wishlist remain visible and accessible.

### Task 4: Make Mobile Quantity Controls Intentional

- [ ] Update `MobileProductCard.tsx` so the full quantity stepper renders only when `isInCart` is true.
- [ ] Before add, keep a compact quick-add affordance and avoid duplicate purchase controls.
- [ ] Ensure tapping add creates one cart line and then reveals the stepper with quantity `1`.
- [ ] Update `listing-cart-controls.spec.ts` to assert the pre-add state has no full stepper and the post-add state has the synced stepper.
- [ ] Run:

```powershell
cd grocery-storefront
npx playwright test tests/listing-cart-controls.spec.ts --project=pixel-7
```

Expected: mobile list-to-cart flow remains green after the UI density change.

### Task 5: Add PDP Gallery Counter And Navigation

- [ ] In `page.tsx`, derive `activeIndex`, `gallerySize`, and label text from `galleryImages`.
- [ ] Render a visible `1/n` counter only when more than one image exists.
- [ ] Add previous/next controls for multi-image galleries.
- [ ] Update thumbnail aria labels from generic `View {alt}` to index-specific labels such as `View image 2 of 5: {alt}`.
- [ ] Add keyboard-safe button handlers and wraparound or disabled-edge behavior; choose one and lock it in the test.
- [ ] Use `aria-live="polite"` for the counter if it changes after click.
- [ ] Keep the existing thumbnail row overflow fix for 320px.
- [ ] Run:

```powershell
cd grocery-storefront
npx playwright test tests/mobile-pd-extras.spec.ts --project=pixel-7
```

Expected: gallery counter, ordering, fallback, and 320px overflow coverage pass.

### Task 6: Add Desktop Secondary Image Hover/Focus Carefully

- [ ] Add an optional media field to the listing product shape only if the existing listing operation can fetch `media { url alt type sortOrder }` without backend errors.
- [ ] Do **not** use `media(first: 2)`; production rejects arguments on `Product.media`.
- [ ] In `ProductCard.tsx`, select the first two unique image URLs by URL, sorted by `sortOrder` when available.
- [ ] On desktop pointer hover and keyboard focus, crossfade from image 1 to image 2 when a second image exists.
- [ ] Respect reduced motion by avoiding animated crossfade under `prefers-reduced-motion`.
- [ ] On mobile, do not create an in-card swipe carousel; optionally show a small image-count badge if `media.length > 1`.
- [ ] Add Playwright coverage with a fixture product containing multiple media images.
- [ ] Run:

```powershell
cd grocery-storefront
npx playwright test tests/product-card-scan-value.spec.ts --project=pixel-7
```

Expected: desktop hover/focus image changes; mobile remains scroll-safe and tap-first.

### Task 7: Make Checkout Backend-Not-Ready States Honest

- [ ] In `checkout/page.tsx`, replace the current no-payment copy that implies a handoff bug with copy that says payment methods are not available for this store yet.
- [ ] Add a matching no-shipping copy for `availableShippingMethods=[]`.
- [ ] Keep the error banner + toast pattern when the shopper attempts to continue.
- [ ] Do not hardcode `bank_transfer` or `PICKUP` as fake frontend fallbacks.
- [ ] Add Playwright coverage in `kamito-launch-hardening.spec.ts` where backend mocks return empty shipping and payment arrays.
- [ ] Run:

```powershell
cd grocery-storefront
npx playwright test tests/kamito-launch-hardening.spec.ts --project=pixel-7
```

Expected: checkout blocks honestly when backend has no methods and does not expose fake alternatives.

### Task 8: Polish Polish Copy And UI Labels

- [ ] Search `grocery-storefront/src/messages/pl.json` and nearby inline Polish copy for missing diacritics such as `Dostepny`, `Platnosc`, `spozywcze`, `koszyka` variants.
- [ ] Fix only shopper-visible strings touched by this slice or clearly launch-facing copy.
- [ ] Add inline `useMemo` locale text only for narrow one-off copy; otherwise prefer message files.
- [ ] Run:

```powershell
cd grocery-storefront
npm run lint -- --max-warnings=0
```

Expected: lint stays clean.

### Task 9: Update Docs

- [ ] Update `.claude/docs/progress.md` with the completed retail-polish slice and the unchanged NO-GO backend blockers.
- [ ] Update `.claude/docs/learnings.md` if implementation uncovers non-obvious GraphQL, image, or layout behavior.
- [ ] Add backend blockers to Known Issues & Debt if not already represented by the latest audit.
- [ ] Do not mark launch ready until backend payment, shipping, warehouse/test-order, and notification gates are closed.

### Task 10: Full Verification

- [ ] Run targeted tests:

```powershell
cd grocery-storefront
npx playwright test tests/product-card-scan-value.spec.ts tests/listing-cart-controls.spec.ts tests/mobile-pd-extras.spec.ts tests/kamito-launch-hardening.spec.ts --project=pixel-7
```

- [ ] Run storefront static/config and contract tests:

```powershell
cd grocery-storefront
npm run test:static-config
npm run test:checkout-contract
```

- [ ] Run storefront typecheck, lint, and build:

```powershell
cd grocery-storefront
npx tsc --noEmit
npm run lint -- --max-warnings=0
npm run build
```

- [ ] Run admin config audit to confirm remaining failures are only owner data, not accidental config regressions:

```powershell
cd admin-panel
npm run audit:kamito-config
```

- [ ] Browser-smoke local storefront at 390, 768, and 1440 widths:
  - `/pl/categories/herbaty`
  - `/pl/products`
  - one multi-image product detail page
  - `/pl/cart`
  - `/pl/checkout`

Expected: product images are not cropped, cards are shorter and less noisy, PDP gallery is understandable, checkout states backend readiness honestly, and no page overflows at 320/390px.

## Backend-Gated Launch Checklist

- [ ] `availablePaymentMethods(channel:"kamito")` returns active bank transfer.
- [ ] `availableShippingMethods(channel:"kamito")` returns active pickup at `0 PLN`.
- [ ] Kamito channel has a warehouse mapping if checkout allocation/reservation requires it.
- [ ] Backend proves one guest test order and one authenticated test order in a safe environment.
- [ ] Staff can see the order in the correct salon/channel queue.
- [ ] New-order alert or a strict manual monitoring process exists.
- [ ] `salons.primary_language` mismatch is resolved or explicitly accepted.
- [ ] Owner supplies IBAN, transfer title/deadline, pickup address/hours, legal/contact/policy data, and production media.
