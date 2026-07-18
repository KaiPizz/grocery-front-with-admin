import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import { DEFAULT_CONFIG } from './defaults';
import { partialStorefrontConfigSchema, storefrontConfigSchema } from './validation';

import type { BannerBlock, StorefrontConfig } from '../types/config';

type ConfigMutator = (config: StorefrontConfig, value: string) => void;

function blockOfType<T extends BannerBlock['type']>(
  config: StorefrontConfig,
  type: T
): Extract<BannerBlock, { type: T }> {
  const block = config.homepage.blocks.find((candidate) => candidate.type === type);
  if (!block) throw new Error(`Missing ${type} block in validation fixture`);
  return block as Extract<BannerBlock, { type: T }>;
}

function securityFixture(): StorefrontConfig {
  const config = structuredClone(DEFAULT_CONFIG);

  config.homepage.blocks = [
    config.homepage.blocks[0],
    {
      id: 'horizontal-security-fixture',
      type: 'horizontal',
      enabled: true,
      order: 1,
      imageUrl: '/uploads/horizontal.jpg',
      mobileImageUrl: '/uploads/horizontal-mobile.jpg',
      title: 'Horizontal',
      ctaText: 'Open',
      ctaLink: '/products',
    },
    {
      id: 'grid-security-fixture',
      type: 'grid',
      enabled: true,
      order: 2,
      columns: 3,
      items: [{
        id: 'grid-item-security-fixture',
        imageUrl: '/uploads/grid.jpg',
        title: 'Grid item',
        href: '/categories/grid',
        enabled: true,
      }],
    },
    {
      id: 'round-grid-security-fixture',
      type: 'round_grid',
      enabled: true,
      order: 3,
      columns: 3,
      items: [{
        id: 'round-grid-item-security-fixture',
        imageUrl: '/uploads/round-grid.jpg',
        title: 'Round grid item',
        href: '/categories/round-grid',
        enabled: true,
      }],
    },
    {
      id: 'sidebar-security-fixture',
      type: 'sidebar',
      enabled: true,
      order: 4,
      imageUrl: '/uploads/sidebar.jpg',
      title: 'Sidebar',
      ctaText: 'Open',
      ctaLink: '/products',
    },
    {
      id: 'sticky-security-fixture',
      type: 'small_sticky',
      enabled: true,
      order: 5,
      desktopImageUrl: '/uploads/sticky.jpg',
      mobileImageUrl: '/uploads/sticky-mobile.jpg',
      title: 'Sticky',
      ctaText: 'Open',
      ctaLink: '/products',
      position: 'bottom',
      dismissible: true,
    },
  ];

  const heroBlock = blockOfType(config, 'hero');
  heroBlock.slides[0].imageUrl = '/uploads/hero.jpg';
  heroBlock.slides[0].mobileImageUrl = '/uploads/hero-mobile.jpg';

  config.general.socialLinks = [{ platform: 'Facebook', url: 'https://facebook.com/example' }];
  config.commercial = {
    enabled: true,
    quickLinks: [{
      id: 'quick-link-security-fixture',
      label: 'Quick link',
      href: '/products',
      kind: 'category',
      description: null,
      imageUrl: '/uploads/quick-link.jpg',
      enabled: true,
      order: 0,
    }],
    collections: [{
      slug: 'security-fixture',
      title: 'Security fixture',
      subtitle: null,
      heroImageUrl: '/uploads/collection.jpg',
      enabled: true,
      order: 0,
      tiles: [{
        id: 'collection-tile-security-fixture',
        title: 'Tile',
        href: '/products',
        description: null,
        imageUrl: '/uploads/tile.jpg',
        enabled: true,
        order: 0,
      }],
    }],
    outlet: {
      enabled: false,
      label: 'Outlet',
      collectionSlug: null,
    },
  };

  return config;
}

const navigationFields: Array<[string, ConfigMutator]> = [
  ['homepage hero CTA', (config, value) => { config.homepage.hero.ctaLink = value; }],
  ['homepage promo CTA', (config, value) => { config.homepage.promoBanners[0].ctaLink = value; }],
  ['hero slide CTA', (config, value) => { blockOfType(config, 'hero').slides[0].ctaLink = value; }],
  ['horizontal banner CTA', (config, value) => { blockOfType(config, 'horizontal').ctaLink = value; }],
  ['grid item href', (config, value) => { blockOfType(config, 'grid').items[0].href = value; }],
  ['round grid item href', (config, value) => { blockOfType(config, 'round_grid').items[0].href = value; }],
  ['sidebar banner CTA', (config, value) => { blockOfType(config, 'sidebar').ctaLink = value; }],
  ['sticky banner CTA', (config, value) => { blockOfType(config, 'small_sticky').ctaLink = value; }],
  ['header navigation href', (config, value) => { config.layout.header.navItems[0].href = value; }],
  ['header CTA', (config, value) => { config.layout.header.cta!.link = value; }],
  ['footer href', (config, value) => { config.layout.footer.columns[0].links[0].href = value; }],
  ['social URL', (config, value) => { config.general.socialLinks[0].url = value; }],
  ['privacy policy href', (config, value) => { config.general.policyLinks.privacy = value; }],
  ['terms policy href', (config, value) => { config.general.policyLinks.terms = value; }],
  ['about policy href', (config, value) => { config.general.policyLinks.about = value; }],
  ['SEO canonical URL', (config, value) => { config.seo.canonical = value; }],
  ['commercial quick-link href', (config, value) => { config.commercial.quickLinks[0].href = value; }],
  ['commercial collection tile href', (config, value) => { config.commercial.collections[0].tiles[0].href = value; }],
];

const resourceUrlFields: Array<[string, ConfigMutator]> = [
  ['branding logo', (config, value) => { config.branding.logoUrl = value; }],
  ['branding favicon', (config, value) => { config.branding.faviconUrl = value; }],
  ['legacy hero image', (config, value) => { config.homepage.hero.backgroundImageUrl = value; }],
  ['promo image', (config, value) => { config.homepage.promoBanners[0].imageUrl = value; }],
  ['hero slide image', (config, value) => { blockOfType(config, 'hero').slides[0].imageUrl = value; }],
  ['hero slide mobile image', (config, value) => { blockOfType(config, 'hero').slides[0].mobileImageUrl = value; }],
  ['horizontal image', (config, value) => { blockOfType(config, 'horizontal').imageUrl = value; }],
  ['horizontal mobile image', (config, value) => { blockOfType(config, 'horizontal').mobileImageUrl = value; }],
  ['grid image', (config, value) => { blockOfType(config, 'grid').items[0].imageUrl = value; }],
  ['round-grid image', (config, value) => { blockOfType(config, 'round_grid').items[0].imageUrl = value; }],
  ['sidebar image', (config, value) => { blockOfType(config, 'sidebar').imageUrl = value; }],
  ['sticky desktop image', (config, value) => { blockOfType(config, 'small_sticky').desktopImageUrl = value; }],
  ['sticky mobile image', (config, value) => { blockOfType(config, 'small_sticky').mobileImageUrl = value; }],
  ['SEO Open Graph image', (config, value) => { config.seo.ogImageUrl = value; }],
  ['commercial quick-link image', (config, value) => { config.commercial.quickLinks[0].imageUrl = value; }],
  ['commercial collection image', (config, value) => { config.commercial.collections[0].heroImageUrl = value; }],
  ['commercial tile image', (config, value) => { config.commercial.collections[0].tiles[0].imageUrl = value; }],
];

const unsafeUrlPayloads = [
  'javascript:alert(document.domain)',
  '  JaVaScRiPt:alert(1)  ',
  'data:text/html,<script>alert(1)</script>',
  '//attacker.example/payload',
  '/\\attacker.example/payload',
];

test('accepts every current stored admin config', async () => {
  const dataDir = new URL('../../data/', import.meta.url);
  const filenames = (await fs.readdir(dataDir)).filter(
    (filename) => filename.startsWith('config-') && filename.endsWith('.json')
  );

  for (const filename of filenames) {
    const stored = JSON.parse(await fs.readFile(new URL(filename, dataDir), 'utf8')) as {
      published: unknown;
      draft: unknown;
    };

    assert.equal(
      storefrontConfigSchema.safeParse(stored.published).success,
      true,
      `${filename} published config should remain valid`
    );
    assert.equal(
      storefrontConfigSchema.safeParse(stored.draft).success,
      true,
      `${filename} draft config should remain valid`
    );
  }
});

test('accepts and trims legitimate navigation and resource URLs', () => {
  const config = securityFixture();
  config.homepage.hero.ctaLink = '  /products?zone=CHILLED#offers  ';
  config.homepage.promoBanners[0].ctaLink = '#weekly-deals';
  blockOfType(config, 'hero').slides[0].ctaLink = '?sort=price_asc';
  blockOfType(config, 'horizontal').ctaLink = 'https://shop.example/products';
  config.layout.header.cta!.link = 'mailto:hello@example.com';
  config.general.policyLinks.about = 'tel:+48 123 456 789';
  config.branding.logoUrl = '  https://cdn.example/logo.png  ';

  const result = storefrontConfigSchema.safeParse(config);
  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.data.homepage.hero.ctaLink, '/products?zone=CHILLED#offers');
  assert.equal(result.data.branding.logoUrl, 'https://cdn.example/logo.png');
});

test('rejects scriptable and protocol-relative values in every navigation field', () => {
  for (const [field, mutate] of navigationFields) {
    for (const payload of unsafeUrlPayloads) {
      const config = securityFixture();
      mutate(config, payload);
      assert.equal(
        storefrontConfigSchema.safeParse(config).success,
        false,
        `${field} should reject ${JSON.stringify(payload)}`
      );
    }
  }
});

test('rejects scriptable and protocol-relative values in persisted resource URLs', () => {
  for (const [field, mutate] of resourceUrlFields) {
    for (const payload of unsafeUrlPayloads) {
      const config = securityFixture();
      mutate(config, payload);
      assert.equal(
        storefrontConfigSchema.safeParse(config).success,
        false,
        `${field} should reject ${JSON.stringify(payload)}`
      );
    }
  }
});

test('normalizes valid tracking IDs', () => {
  const config = securityFixture();
  config.tracking.facebookPixel.pixelId = ' 123456789012345 ';
  config.tracking.googleAnalytics.measurementId = ' g-ab12cd34ef ';
  config.tracking.googleTagManager.containerId = ' gtm-ab12cd3 ';
  config.tracking.hotjar.siteId = ' 1234567 ';

  const parsed = storefrontConfigSchema.parse(config);

  assert.equal(parsed.tracking.facebookPixel.pixelId, '123456789012345');
  assert.equal(parsed.tracking.googleAnalytics.measurementId, 'G-AB12CD34EF');
  assert.equal(parsed.tracking.googleTagManager.containerId, 'GTM-AB12CD3');
  assert.equal(parsed.tracking.hotjar.siteId, '1234567');
});

test('rejects malformed or injectable tracking IDs even when tracking is disabled', () => {
  const invalidTrackingIds: Array<[string, (config: StorefrontConfig) => void]> = [
    ['Facebook Pixel', (config) => { config.tracking.facebookPixel.pixelId = "12345');alert(1);//"; }],
    ['Facebook Pixel prefix', (config) => { config.tracking.facebookPixel.pixelId = 'FB-123456789'; }],
    ['GA measurement', (config) => { config.tracking.googleAnalytics.measurementId = "G-ABC');alert(1);//"; }],
    ['GA legacy property', (config) => { config.tracking.googleAnalytics.measurementId = 'UA-123456-1'; }],
    ['GTM container', (config) => { config.tracking.googleTagManager.containerId = "GTM-ABC');alert(1);//"; }],
    ['GTM wrong prefix', (config) => { config.tracking.googleTagManager.containerId = 'G-AB12CD34'; }],
    ['Hotjar site', (config) => { config.tracking.hotjar.siteId = '12345};alert(1);//'; }],
    ['Hotjar zero', (config) => { config.tracking.hotjar.siteId = '0'; }],
  ];

  for (const [field, mutate] of invalidTrackingIds) {
    const config = securityFixture();
    mutate(config);
    assert.equal(
      storefrontConfigSchema.safeParse(config).success,
      false,
      `${field} should reject an invalid ID`
    );
  }
});

test('applies URL and tracking validation to partial draft updates', () => {
  assert.equal(
    partialStorefrontConfigSchema.safeParse({
      homepage: { hero: { ctaLink: 'javascript:alert(1)' } },
    }).success,
    false
  );
  assert.equal(
    partialStorefrontConfigSchema.safeParse({
      general: { policyLinks: { privacy: 'data:text/html,payload' } },
    }).success,
    false
  );
  assert.equal(
    partialStorefrontConfigSchema.safeParse({
      tracking: { googleTagManager: { containerId: "GTM-ABC');alert(1);//" } },
    }).success,
    false
  );

  const normalized = partialStorefrontConfigSchema.parse({
    tracking: { googleAnalytics: { measurementId: ' g-ab12cd34 ' } },
  });
  assert.equal(normalized.tracking?.googleAnalytics?.measurementId, 'G-AB12CD34');
});
