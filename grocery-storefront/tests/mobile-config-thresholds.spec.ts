import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront, seedCartStorage } from './mobile-fixtures';

// ─────────────────────────────────────────────────────────────────────────────
// SPEC SOURCES (read BEFORE writing these tests; do not optimize toward the
// current implementation — derive assertions from these sources only).
//
// 1. PRD `.claude/docs/PRD.md` v2.0:
//    - §2.1 Goals: "Let store owners fully customize storefront appearance
//      without touching code" — admin-configurable behaviour is a top-level
//      product goal, not an implementation convenience.
//    - §5.3 Key Screens — Cart: "Zone-grouped items, shipping progress bar".
//    - §5.1 Design Principles: mobile-first, fast, warm.
//
// 2. Backlog `wiki/ops/backlog/enail-storefront-backlog.md` §10
//    (Tier 4 — config-lift shipped 2026-05-12), with closed entries
//    B21 / B22 / B23 in §4. Acceptance criteria:
//    - B21 — free-shipping threshold: per-store-configurable PLN floor;
//      default 150 preserves previous behaviour.
//    - B22 — same-day shipping cutoff: per-store-configurable HH:MM wall
//      time, minute-precise; default "12:00".
//    - B23 — low-stock display threshold: per-store-configurable qty
//      cutoff for the "Only N left" microcopy; default 10.
//
// 3. Customer-visible contract (deduced from above):
//    - The admin can change these three values and the customer-facing
//      storefront reflects them on the next page load.
//    - Defaults preserve the previously shipped behaviour (regression
//      protection for stores that have not customised).
//    - Each threshold has spec-implied boundaries (zero, exact match,
//      minute granularity) that the implementation must handle.
//
// What is NOT specified in any of the three sources above (gaps to flag,
// not to test):
//    - qty = 0 (out of stock) PD rendering — backlog only addresses the
//      low-stock microcopy; OOS is silent. Current implementation renders
//      "Only 0 left" which is awkward UX but no spec contradicts it.
//      Logged as a follow-up in the vault session note.
//    - Negative thresholds — guarded at the admin-write layer via Zod
//      (`z.number().min(0)`); not reachable from the customer surface.
// ─────────────────────────────────────────────────────────────────────────────

interface ConfigOverrides {
  freeShippingThreshold?: number;
  sameDayShippingCutoff?: string;
  lowStockThreshold?: number;
}

function configEnvelope(overrides: ConfigOverrides = {}) {
  return {
    slug: 'test',
    config: {
      branding: {
        logoUrl: null,
        faviconUrl: null,
        storeName: 'Test Store',
        colors: {
          primary: '#16a34a',
          primaryHover: '#15803d',
          background: '#ffffff',
          foreground: '#0a0a0a',
          accent: '#f59e0b',
          accentForeground: '#ffffff',
          muted: '#f5f5f5',
          mutedForeground: '#525252',
          border: '#e5e5e5',
          card: '#ffffff',
          cardForeground: '#0a0a0a',
          destructive: '#dc2626',
          ring: '#16a34a',
        },
      },
      homepage: {
        hero: {
          enabled: false,
          headline: '',
          subtitle: '',
          ctaText: '',
          ctaLink: '',
          backgroundImageUrl: null,
        },
        promoBanners: [],
        blocks: [],
        sections: [],
      },
      layout: {
        header: {
          navItems: [],
          showSearch: true,
          showWishlist: true,
          showLanguageSwitcher: true,
        },
        footer: { tagline: '', columns: [], copyrightText: '' },
        bannerPosition: 'below-hero',
      },
      tracking: {
        facebookPixel: { enabled: false, pixelId: '' },
        googleAnalytics: { enabled: false, measurementId: '' },
        googleTagManager: { enabled: false, containerId: '' },
        hotjar: { enabled: false, siteId: '' },
      },
      seo: {
        defaultTitle: 'Test',
        defaultDescription: 'Test',
        ogImageUrl: null,
        canonical: '',
      },
      general: {
        phone: '',
        email: '',
        address: '',
        socialLinks: [],
        policyLinks: { privacy: '/privacy', terms: '/terms', about: '#' },
        freeShippingThreshold: overrides.freeShippingThreshold ?? 150,
        sameDayShippingCutoff: overrides.sameDayShippingCutoff ?? '12:00',
        lowStockThreshold: overrides.lowStockThreshold ?? 10,
      },
    },
    version: 1,
    updatedAt: '2026-05-12T00:00:00.000Z',
  };
}

async function mockStorefrontConfig(page: Page, overrides: ConfigOverrides) {
  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(configEnvelope(overrides)),
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// B21 — admin-configurable free-shipping threshold
//
// SPEC: cart free-shipping progress strip nudges the shopper toward a
// per-store-configurable PLN threshold. Below threshold → "Add X more for
// free shipping". At or above threshold → "You qualify for free shipping".
// Default fallback (150 PLN) is covered by existing
// `mobile-cart-extras.spec.ts` — those tests rely on the implicit default,
// so this file does not duplicate the fallback assertion.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('B21 — admin-configurable free-shipping threshold', () => {
  test('shows the remaining-to-free-shipping amount when subtotal is below a custom high threshold', async ({ page }) => {
    // Protects: the per-store-configurable nudge copy (backlog B21).
    // Setup: subtotal 12.99 PLN (single-item) vs admin-configured threshold 300 PLN.
    // Expected: cart shows "Add 287 zł more for free shipping" (or locale variant containing 287).
    await mockStorefrontConfig(page, { freeShippingThreshold: 300 });
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const freeShipping = page.getByTestId('mobile-cart-free-shipping');
    await expect(freeShipping).toBeVisible();
    await expect(freeShipping).toContainText(/free shipping/i);
    await expect.poll(async () => (await freeShipping.textContent()) ?? '', { timeout: 5000 }).toMatch(/287/);
  });

  test('shows the reached state when subtotal clears a custom low threshold', async ({ page }) => {
    // Protects: the per-store-configurable congratulation copy (backlog B21).
    // Setup: subtotal 12.99 PLN > threshold 10 PLN.
    // Expected: cart shows the "qualify" copy, not the "Add X more" copy.
    await mockStorefrontConfig(page, { freeShippingThreshold: 10 });
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const freeShipping = page.getByTestId('mobile-cart-free-shipping');
    await expect(freeShipping).toBeVisible();
    await expect.poll(async () => (await freeShipping.textContent()) ?? '', { timeout: 5000 }).toMatch(/qualify/i);
  });

  test('threshold = 0 means free shipping is always available — reached state shows regardless of subtotal', async ({ page }) => {
    // Protects: the always-free semantics implied by the spec ("per-store
    // configurable" — a store that ships free on every order should be able
    // to express that via threshold 0). Without explicit handling, division
    // by zero would compute progress as Infinity / NaN; the implementation
    // must short-circuit.
    await mockStorefrontConfig(page, { freeShippingThreshold: 0 });
    await seedCartStorage(page);
    await mockMobileStorefront(page, { cart: 'single-item' });
    await page.goto('/en/cart');

    const freeShipping = page.getByTestId('mobile-cart-free-shipping');
    await expect(freeShipping).toBeVisible();
    await expect.poll(async () => (await freeShipping.textContent()) ?? '', { timeout: 5000 }).toMatch(/qualify/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B22 — admin-configurable same-day shipping cutoff
//
// SPEC: shopper sees "ships today" when ordering before the per-store cutoff
// wall time, "ships tomorrow" at or after. The cutoff is HH:MM
// (minute-precise per backlog B22); the previous implementation was
// hour-only and the spec lift explicitly upgrades granularity.
// Default fallback ("12:00") is covered by existing
// `mobile-pd-extras.spec.ts` — those tests deliberately don't assert on the
// "today/tomorrow" half to remain clock-independent.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('B22 — admin-configurable same-day shipping cutoff', () => {
  test('cutoff later than any real wall time (23:59) produces "ships today"', async ({ page }) => {
    // Protects: the per-store-configurable ship-today branch. Bracket value
    // keeps the assertion independent of the system clock without needing
    // clock mocking.
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '23:59' });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/ships today/i);
  });

  test('cutoff earlier than any real wall time (00:01) produces "ships tomorrow"', async ({ page }) => {
    // Protects: the per-store-configurable ship-tomorrow branch.
    // (Tiny clock-window risk inside 00:00..00:01 is accepted; alternative
    // is full clock mocking, used below for the minute-precision tests.)
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '00:01' });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/ships tomorrow/i);
  });

  test('minute-precise: cutoff 12:30 at wall time 12:15 → ships today', async ({ page }) => {
    // Protects: the HH:MM minute-precision contract. An hour-only
    // implementation (e.g. `getHours() < 12`) would treat 12:15 as
    // already-past-noon and incorrectly return "ships tomorrow". This test
    // would catch that regression.
    await page.clock.install({ time: new Date('2026-05-12T12:15:00') });
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '12:30' });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/ships today/i);
  });

  test('minute-precise: cutoff 12:30 at wall time 12:45 → ships tomorrow', async ({ page }) => {
    // Protects: the same HH:MM contract on the other side of the boundary.
    await page.clock.install({ time: new Date('2026-05-12T12:45:00') });
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '12:30' });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/ships tomorrow/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B23 — admin-configurable low-stock display threshold
//
// SPEC: shopper sees "Only N left" microcopy when stock qty is at or below
// the per-store threshold; "In stock" otherwise. The threshold is the
// inclusive upper bound for the low-stock branch (`qty <= threshold`).
// Default fallback (10) is covered by existing `mobile-pd-extras.spec.ts`
// (apples qty 20 → "In stock"; ravioli qty 9 → "Only 9 left").
// ─────────────────────────────────────────────────────────────────────────────

test.describe('B23 — admin-configurable low-stock display threshold', () => {
  test('"In stock" when qty exceeds the custom threshold', async ({ page }) => {
    // Protects: the high-stock branch with a custom threshold.
    // Apples fixture qty = 20 > threshold 15.
    await mockStorefrontConfig(page, { lowStockThreshold: 15 });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/in stock/i);
    await expect(promise).not.toContainText(/only \d+ left/i);
  });

  test('"Only N left" when qty is at or below the custom threshold', async ({ page }) => {
    // Protects: the low-stock branch with a custom threshold higher than
    // the qty. Apples qty 20 ≤ threshold 25 → low-stock microcopy.
    await mockStorefrontConfig(page, { lowStockThreshold: 25 });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/only 20 left/i);
  });

  test('boundary: qty exactly equals threshold → "Only N left" (inclusive)', async ({ page }) => {
    // Protects: the inclusive-upper-bound semantics. Spec says qty ≤
    // threshold; off-by-one implementation (`qty < threshold`) would treat
    // qty 9 with threshold 9 as in-stock and miss the urgency cue.
    // Ravioli fixture qty = 9. Set threshold to exactly 9.
    await mockStorefrontConfig(page, { lowStockThreshold: 9 });
    await mockMobileStorefront(page);
    await page.goto('/en/products/spinach-ravioli-family-pack');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/only 9 left/i);
  });

  test('threshold = 0 means low-stock microcopy never shows for in-stock products', async ({ page }) => {
    // Protects: the "never-nudge" semantics — a store that does not want to
    // reveal stock counts on PD can set threshold 0. Apples qty 20 with
    // threshold 0 → 20 > 0 → "In stock", no "Only N left".
    // (Spec is silent on qty = 0 with threshold = 0; that edge falls into
    // the out-of-stock UX gap noted in the vault session follow-ups.)
    await mockStorefrontConfig(page, { lowStockThreshold: 0 });
    await mockMobileStorefront(page);
    await page.goto('/en/products/organic-gala-apples');

    const promise = page.getByTestId('pd-stock-promise');
    await expect(promise).toBeVisible();
    await expect.poll(async () => (await promise.textContent()) ?? '', { timeout: 5000 }).toMatch(/in stock/i);
    await expect(promise).not.toContainText(/only \d+ left/i);
  });
});
