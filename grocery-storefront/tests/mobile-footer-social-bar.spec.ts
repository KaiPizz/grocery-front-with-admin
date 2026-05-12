import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { mockMobileStorefront } from './mobile-fixtures';

// SPEC SOURCES (read before writing this test file):
// - PRD `.claude/docs/PRD.md` §2.1: store owners can customize the storefront
//   without code, and §5.1: customer UI is mobile-first, branded, and fast.
// - PRD §4.1 lists "Navigation & footer" with social links as an MVP feature,
//   but PRD §3.2 has no explicit social-link user story. That is a spec gap;
//   backlog B19 is the controlling task spec for this slice.
// - Vault backlog `wiki/ops/backlog/enail-storefront-backlog.md` §4 B19:
//   storefront must render admin `general.socialLinks` as footer icon links,
//   including TikTok and the full admin platform list, with graceful fallback.
// - User clarification 2026-05-12: malformed URLs render defensively as links;
//   storefront does not validate, rewrite, skip, or sort social links.
//
// Color-token assertions are intentionally omitted. Computed CSS variable and
// hover-color checks in Playwright are brittle, and "no inline color" would
// over-constrain implementation style. The implementation review enforces that
// the component uses footer CSS tokens instead of hardcoded colors.

interface SocialLink {
  platform: string;
  url: string;
}

const SUPPORTED_PLATFORMS = [
  'Facebook',
  'Instagram',
  'Twitter/X',
  'TikTok',
  'YouTube',
  'LINE',
  'WhatsApp',
  'Telegram',
  'LinkedIn',
  'Pinterest',
] as const;

function configEnvelope(socialLinks: SocialLink[]) {
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
          showThemeToggle: true,
        },
        footer: {
          tagline: 'Fresh groceries configured for this store.',
          columns: [],
          copyrightText: '',
        },
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
        socialLinks,
        policyLinks: { privacy: '/privacy', terms: '/terms', about: '#' },
        freeShippingThreshold: 150,
        sameDayShippingCutoff: '12:00',
        lowStockThreshold: 10,
      },
    },
    version: 1,
    updatedAt: '2026-05-12T00:00:00.000Z',
  };
}

async function mockStorefrontConfig(page: Page, socialLinks: SocialLink[]) {
  await page.route('**/api/config/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(configEnvelope(socialLinks)),
    });
  });
}

async function openProductsWithFooterConfig(page: Page, socialLinks: SocialLink[]) {
  await mockStorefrontConfig(page, socialLinks);
  await mockMobileStorefront(page);
  await page.goto('/en/products');
  await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
}

async function socialLabels(page: Page) {
  const socialNav = page.getByRole('navigation', { name: 'Social links' });

  return socialNav.locator('a').evaluateAll((links) =>
    links.map((link) => link.getAttribute('aria-label') ?? '')
  );
}

test.describe('B19 storefront footer SocialBar', () => {
  test('renders nothing when the admin socialLinks array is empty', async ({ page }) => {
    // Protects: backlog B19 empty-array contract; no configured links means
    // no social-icon bar, no empty wrapper, and no footer gap.
    await openProductsWithFooterConfig(page, []);

    await expect.poll(async () =>
      page.getByRole('navigation', { name: 'Social links' }).count()
    ).toBe(0);
  });

  test('renders a single configured platform as an accessible external icon link', async ({ page }) => {
    // Protects: backlog B19 icon-link contract and user clarification that
    // each SocialLink becomes exactly one external anchor.
    await openProductsWithFooterConfig(page, [
      { platform: 'Instagram', url: 'https://instagram.com/test-store' },
    ]);

    const socialNav = page.getByRole('navigation', { name: 'Social links' });
    const instagram = socialNav.getByRole('link', { name: 'Instagram' });
    await expect(instagram).toBeVisible();
    await expect(instagram).toHaveAttribute('target', '_blank');
    await expect(instagram).toHaveAttribute('rel', /noopener/);
    await expect(instagram).toHaveAttribute('rel', /noreferrer/);
    await expect(instagram.locator('svg')).toHaveCount(1);
  });

  test('renders every admin-supported platform in the configured array order', async ({ page }) => {
    // Protects: backlog B19 full platform list plus user clarification that
    // visual order is admin array order; the storefront must not re-sort.
    await openProductsWithFooterConfig(
      page,
      SUPPORTED_PLATFORMS.map((platform) => ({
        platform,
        url: `https://example.com/${platform.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      }))
    );

    await expect.poll(async () => socialLabels(page)).toEqual([...SUPPORTED_PLATFORMS]);
  });

  test('keeps duplicate platform entries instead of deduplicating them', async ({ page }) => {
    // Protects: deduced B19 contract from admin-owned data ordering. Duplicate
    // entries are content, not an error, and each configured row must render.
    const configuredOrder = ['Instagram', 'Facebook', 'Instagram', 'TikTok'];

    await openProductsWithFooterConfig(page, [
      { platform: 'Instagram', url: 'https://instagram.com/test-store' },
      { platform: 'Facebook', url: 'https://facebook.com/test-store' },
      { platform: 'Instagram', url: 'https://instagram.com/test-store-alt' },
      { platform: 'TikTok', url: 'https://tiktok.com/@test-store' },
    ]);

    await expect.poll(async () => socialLabels(page)).toEqual(configuredOrder);
  });

  test('renders unknown platforms and malformed URLs without dropping the entry', async ({ page }) => {
    // Protects: backlog B19 graceful-fallback requirement plus user clarification
    // that malformed URLs are not validated or rewritten by the storefront.
    await openProductsWithFooterConfig(page, [
      { platform: 'Mastodon', url: 'not a url' },
    ]);

    const fallback = page
      .getByRole('navigation', { name: 'Social links' })
      .getByRole('link', { name: 'Mastodon' });
    await expect(fallback).toBeVisible();
    await expect(fallback.locator('svg')).toHaveCount(1);
  });

  test('meets the 44 by 44 mobile tap-target floor for icon links', async ({ page }) => {
    // Protects: PRD §5.1 mobile-first principle and the project accessibility
    // convention documented in progress.md: mobile primary tap targets use the
    // WCAG 2.5.5 AAA / Apple HIG 44x44 minimum.
    await openProductsWithFooterConfig(page, [
      { platform: 'WhatsApp', url: 'https://wa.me/48123123123' },
      { platform: 'Telegram', url: 'https://t.me/teststore' },
    ]);

    const links = page.getByRole('navigation', { name: 'Social links' }).locator('a');
    await expect(links).toHaveCount(2);

    for (let index = 0; index < await links.count(); index += 1) {
      const box = await links.nth(index).boundingBox();
      expect(box).not.toBeNull();
      expect(Math.round(box!.width)).toBeGreaterThanOrEqual(44);
      expect(Math.round(box!.height)).toBeGreaterThanOrEqual(44);
    }
  });
});
