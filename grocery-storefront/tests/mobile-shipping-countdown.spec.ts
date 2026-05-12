import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCES (read before writing this file):
// - PRD `.claude/docs/PRD.md` section 2.1: mobile-first storefront that lets
//   store owners customize customer-facing behavior without code changes.
// - PRD section 3.2: no explicit countdown story exists; B8 is backlog-defined
//   and PRD-implied by fast mobile grocery shopping and delivery reassurance.
// - PRD section 5.1: mobile-first, fast, warm, branded experience.
// - Backlog `wiki/ops/backlog/enail-storefront-backlog.md` B8: header utility
//   bar or above-the-fold widget, live HH:MM:SS countdown, static no-JS fallback.
// - Backlog B22 / Tier 4: `general.sameDayShippingCutoff` is HH:MM,
//   minute-precise, default "12:00".
// - Existing PD consumer `products/[id]/page.tsx`: cutoff comparison is strict
//   before-cutoff; exact cutoff time is the tomorrow branch.
//
// Customer-visible contract protected here:
// - Before cutoff: "Order in HH:MM:SS for same-day shipping".
// - At/after cutoff: "Ships tomorrow at HH:MM".
// - The value comes from admin config, with "12:00" fallback when unavailable.
// - The live countdown ticks once per second after hydration.
// - The server render remains useful without JS: static "Order before HH:MM...".
// - Polish routes render Polish copy.
//
// Spec gaps documented, not over-tested:
// - "Next business day" has no business calendar in PRD/backlog, so this spec
//   follows the explicit customer copy requested for B8: "tomorrow".
// - Browser route mocks cannot intercept the server-side initial config fetch;
//   config fallback coverage uses a mocked config with the cutoff field absent,
//   which exercises the same storefront fallback expression.

interface ConfigOverrides {
  sameDayShippingCutoff?: string;
  omitSameDayShippingCutoff?: boolean;
}

function configEnvelope(overrides: ConfigOverrides = {}) {
  const general: Record<string, unknown> = {
    phone: '',
    email: '',
    address: '',
    socialLinks: [],
    policyLinks: { privacy: '/privacy', terms: '/terms', about: '#' },
    freeShippingThreshold: 150,
    lowStockThreshold: 10,
  };

  if (!overrides.omitSameDayShippingCutoff) {
    general.sameDayShippingCutoff = overrides.sameDayShippingCutoff ?? '12:00';
  }

  return {
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
          showThemeToggle: true,
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
      general,
    },
    version: 1,
    updatedAt: '2026-05-12T00:00:00.000Z',
  };
}

async function mockStorefrontConfig(page: Page, overrides: ConfigOverrides = {}) {
  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(configEnvelope(overrides)),
    });
  });
}

function wallTime(hours: number, minutes: number, seconds = 0) {
  return new Date(2026, 4, 12, hours, minutes, seconds);
}

async function installClockBefore(page: Page, target: Date) {
  await page.clock.install({ time: new Date(target.getTime() - 60_000) });
}

function shippingStatus(page: Page) {
  return page.getByRole('banner').getByRole('status');
}

test.describe('B8 - live shipping cutoff countdown', () => {
  test('counts down before a future cutoff and ticks once per second', async ({ page }) => {
    // Protects: backlog B8 live HH:MM:SS countdown before cutoff, plus the
    // "live" requirement deduced as a one-second ticking customer-visible timer.
    const now = wallTime(14, 30);
    await installClockBefore(page, now);
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '18:00' });
    await mockMobileStorefront(page);
    await page.goto('/en/products');
    await page.clock.pauseAt(now);

    const status = shippingStatus(page);
    await expect.poll(async () => (await status.textContent()) ?? '', { timeout: 5000 }).toMatch(
      /Order in 03:30:00 for same-day shipping/i,
    );

    await page.clock.runFor(1000);
    await expect(status).toContainText(/Order in 03:29:59 for same-day shipping/i);
  });

  test('switches to the tomorrow message after today cutoff has passed', async ({ page }) => {
    // Protects: backlog B8 after-cutoff branch: after cutoff, customer sees
    // the next shipping promise with the configured HH:MM.
    const now = wallTime(14, 30);
    await installClockBefore(page, now);
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '12:00' });
    await mockMobileStorefront(page);
    await page.goto('/en/products');
    await page.clock.pauseAt(now);

    await expect.poll(async () => (await shippingStatus(page).textContent()) ?? '', { timeout: 5000 }).toMatch(
      /Ships tomorrow at 12:00/i,
    );
  });

  test('uses the tomorrow branch at the exact cutoff boundary', async ({ page }) => {
    // Protects: Tier 4 cutoff semantics reused by B8. The existing PD consumer
    // treats only `now < cutoff` as today; exact match is not before cutoff.
    const now = wallTime(12, 0);
    await installClockBefore(page, now);
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '12:00' });
    await mockMobileStorefront(page);
    await page.goto('/en/products');
    await page.clock.pauseAt(now);

    await expect.poll(async () => (await shippingStatus(page).textContent()) ?? '', { timeout: 5000 }).toMatch(
      /Ships tomorrow at 12:00/i,
    );
  });

  test('falls back to 12:00 when the cutoff field is absent from config', async ({ page }) => {
    // Protects: B8 fallback. Browser route mocks cannot intercept server-side
    // config fetches, so this covers the same storefront fallback path by
    // refreshing client config without `general.sameDayShippingCutoff`.
    const now = wallTime(14, 30);
    await installClockBefore(page, now);
    await mockStorefrontConfig(page, { omitSameDayShippingCutoff: true });
    await mockMobileStorefront(page);
    await page.goto('/en/products');
    await page.clock.pauseAt(now);

    await expect.poll(async () => (await shippingStatus(page).textContent()) ?? '', { timeout: 5000 }).toMatch(
      /Ships tomorrow at 12:00/i,
    );
  });

  test('treats 00:00 as a start-of-day cutoff', async ({ page }) => {
    // Protects: B8 corner case. With a midnight cutoff, the same-day window
    // closes at the start of the day; a normal post-midnight visit is after it.
    const now = wallTime(0, 1);
    await installClockBefore(page, now);
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '00:00' });
    await mockMobileStorefront(page);
    await page.goto('/en/products');
    await page.clock.pauseAt(now);

    await expect.poll(async () => (await shippingStatus(page).textContent()) ?? '', { timeout: 5000 }).toMatch(
      /Ships tomorrow at 00:00/i,
    );
  });

  test('renders localized Polish copy on Polish routes', async ({ page }) => {
    // Protects: PRD multi-language storefront plus B8 locale-equivalent copy.
    const now = wallTime(14, 30);
    await installClockBefore(page, now);
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '18:00' });
    await mockMobileStorefront(page);
    await page.goto('/pl/products');
    await page.clock.pauseAt(now);

    const status = shippingStatus(page);
    await expect.poll(async () => (await status.textContent()) ?? '', { timeout: 5000 }).toContain('03:30:00');
    await expect(status).not.toContainText(/Order in|same-day shipping|Ships tomorrow/i);
    await expect(status).toContainText(/Zam|wysy/i);
  });

  test('keeps mobile header controls reachable from the utility-bar placement', async ({ page }) => {
    // Protects: backlog B8 placement option plus PRD section 5.1 mobile-first
    // requirement. The countdown may live in the header band, but it must not
    // make primary mobile header controls unreachable.
    const now = wallTime(14, 30);
    await installClockBefore(page, now);
    await mockStorefrontConfig(page, { sameDayShippingCutoff: '18:00' });
    await mockMobileStorefront(page);
    await page.goto('/en/products');
    await page.clock.pauseAt(now);

    await expect.poll(async () => (await shippingStatus(page).textContent()) ?? '', { timeout: 5000 }).toContain(
      '03:30:00',
    );

    const openSearch = page.getByRole('banner').getByRole('button', { name: /open search/i });
    await expect(openSearch).toBeVisible();
    await openSearch.click();
    await expect(page.locator('#mobile-search')).toBeVisible();
  });
});

test.describe('B8 - no-JS static fallback', () => {
  test.use({ javaScriptEnabled: false });

  test('server-renders static cutoff copy when JavaScript is disabled', async ({ page }) => {
    // Protects: backlog B8 no-JS fallback. Countdown enhancement is client-side,
    // but the server render still needs useful static cutoff copy.
    await page.goto('/en/products');

    await expect(page.getByRole('banner').getByText(/Order before 12:00 for same-day shipping/i)).toBeVisible();
  });
});
