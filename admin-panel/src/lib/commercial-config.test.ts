import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { DEFAULT_CONFIG, DEFAULT_TRUST_ROW } from './defaults';
import { storefrontConfigSchema } from './validation';

import type { StorefrontConfig } from '../types/config';

function cloneConfig(): StorefrontConfig {
  const config = structuredClone(DEFAULT_CONFIG);
  const heroBlock = config.homepage.blocks[0];

  if (heroBlock.type !== 'hero') {
    throw new Error('Expected default hero block');
  }

  heroBlock.slides[0].imageUrl = '/uploads/hero.jpg';
  return config;
}

function addCommercialFixture(config: StorefrontConfig): StorefrontConfig {
  config.commercial = {
    enabled: true,
    trustRow: structuredClone(DEFAULT_TRUST_ROW),
    categoryHub: {
      enabled: true,
      items: [
        {
          id: 'category-hub-noodles',
          categorySlug: 'makaron-i-noodle',
          imageUrl: '/uploads/noodles.jpg',
          enabled: true,
          order: 0,
        },
      ],
    },
    quickLinks: [
      {
        id: 'quick-outlet',
        label: 'Outlet',
        href: '/outlet',
        kind: 'outlet',
        description: 'Discounted items and short-date offers',
        imageUrl: null,
        enabled: true,
        order: 0,
      },
      {
        id: 'quick-pantry',
        label: 'Korean pantry',
        href: '/collections/korean-pantry',
        kind: 'collection',
        description: null,
        imageUrl: '/uploads/pantry.jpg',
        enabled: true,
        order: 1,
      },
    ],
    collections: [
      {
        slug: 'korean-pantry',
        title: 'Korean pantry',
        subtitle: 'Rice, sauces, noodles, and daily staples',
        heroImageUrl: '/uploads/korean-pantry.jpg',
        enabled: true,
        order: 0,
        tiles: [
          {
            id: 'tile-kimchi',
            title: 'Kimchi',
            href: '/categories/kimchi',
            description: 'Fermented essentials',
            imageUrl: null,
            enabled: true,
            order: 0,
          },
        ],
      },
    ],
    outlet: {
      enabled: true,
      label: 'Outlet',
      collectionSlug: 'korean-pantry',
    },
  };

  return config;
}

test('commercial surfaces are disabled by default', () => {
  assert.equal(DEFAULT_CONFIG.commercial.enabled, false);
  assert.deepEqual(DEFAULT_CONFIG.commercial.categoryHub, {
    enabled: true,
    items: [],
  });
  assert.deepEqual(DEFAULT_CONFIG.commercial.quickLinks, []);
  assert.deepEqual(DEFAULT_CONFIG.commercial.collections, []);
  assert.deepEqual(DEFAULT_CONFIG.commercial.outlet, {
    enabled: false,
    label: 'Outlet',
    collectionSlug: null,
  });
});

test('applies a backward-compatible category hub default to legacy configs', () => {
  const config = cloneConfig() as StorefrontConfig & {
    commercial: Omit<StorefrontConfig['commercial'], 'categoryHub'>;
  };
  delete (config.commercial as Partial<StorefrontConfig['commercial']>).categoryHub;

  const result = storefrontConfigSchema.safeParse(config);

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data.commercial.categoryHub, {
    enabled: true,
    items: [],
  });
});

test('validates configured commercial quick links and collections', () => {
  const result = storefrontConfigSchema.safeParse(addCommercialFixture(cloneConfig()));

  assert.equal(result.success, true);
});

test('rejects collection slugs with spaces', () => {
  const config = addCommercialFixture(cloneConfig());
  config.commercial.collections[0].slug = 'korean pantry';

  const result = storefrontConfigSchema.safeParse(config);

  assert.equal(result.success, false);
});

test('rejects invalid or duplicate category hub slugs', () => {
  const invalid = addCommercialFixture(cloneConfig());
  invalid.commercial.categoryHub.items[0].categorySlug = 'Makaron i noodle';
  assert.equal(storefrontConfigSchema.safeParse(invalid).success, false);

  const duplicate = addCommercialFixture(cloneConfig());
  duplicate.commercial.categoryHub.items.push({
    id: 'category-hub-noodles-duplicate',
    categorySlug: 'makaron-i-noodle',
    imageUrl: null,
    enabled: true,
    order: 1,
  });
  assert.equal(storefrontConfigSchema.safeParse(duplicate).success, false);
});

test('rejects duplicate category hub item IDs', () => {
  const config = addCommercialFixture(cloneConfig());
  config.commercial.categoryHub.items.push({
    id: 'category-hub-noodles',
    categorySlug: 'sosy-i-pasty',
    imageUrl: null,
    enabled: true,
    order: 1,
  });

  assert.equal(storefrontConfigSchema.safeParse(config).success, false);
});

test('rejects enabled outlet config without a collection slug', () => {
  const config = addCommercialFixture(cloneConfig());
  config.commercial.outlet.collectionSlug = null;

  const result = storefrontConfigSchema.safeParse(config);

  assert.equal(result.success, false);
});

test('rejects enabled outlet config with an unknown collection slug', () => {
  const config = addCommercialFixture(cloneConfig());
  config.commercial.outlet.collectionSlug = 'missing-collection';

  const result = storefrontConfigSchema.safeParse(config);

  assert.equal(result.success, false);
});

test('allows disabled outlet config without a collection slug', () => {
  const config = addCommercialFixture(cloneConfig());
  config.commercial.outlet.enabled = false;
  config.commercial.outlet.collectionSlug = null;

  const result = storefrontConfigSchema.safeParse(config);

  assert.equal(result.success, true);
});

test('schema keeps trust row, featured leaves and seo text, and fills them for configs saved before wave 2', () => {
  const config = cloneConfig();
  config.commercial.trustRow = {
    enabled: true,
    items: [{
      id: 'trust-x', icon: 'map-pin', title: 'T', description: 'D', titleEn: 'TE', descriptionEn: 'DE', enabled: true, order: 0,
    }],
  };
  config.homepage.featured = { categorySlugs: ['kimchi', ' buldak-i-ramyun-ostre '] };
  config.homepage.seoText = { enabled: true, headline: 'H', paragraphs: ['P1', '  ', 'P2'], headlineEn: 'HE', paragraphsEn: [] };

  const parsed = storefrontConfigSchema.safeParse(config);
  assert.equal(parsed.success, true, JSON.stringify(parsed.success ? null : parsed.error.flatten()));
  assert.deepEqual(parsed.data?.commercial.trustRow, config.commercial.trustRow);
  assert.deepEqual(parsed.data?.homepage.featured, { categorySlugs: ['kimchi', 'buldak-i-ramyun-ostre'] });
  assert.deepEqual(parsed.data?.homepage.seoText, { ...config.homepage.seoText, paragraphs: ['P1', 'P2'] });

  const legacy = cloneConfig();
  delete (legacy.commercial as Partial<StorefrontConfig['commercial']>).trustRow;
  delete (legacy.homepage as Partial<StorefrontConfig['homepage']>).featured;
  delete (legacy.homepage as Partial<StorefrontConfig['homepage']>).seoText;
  const legacyParsed = storefrontConfigSchema.safeParse(legacy);
  assert.equal(legacyParsed.success, true);
  assert.equal(legacyParsed.data?.commercial.trustRow.enabled, true);
  assert.equal(legacyParsed.data?.commercial.trustRow.items.length, 4);
  assert.deepEqual(legacyParsed.data?.homepage.featured, { categorySlugs: [] });
  assert.equal(legacyParsed.data?.homepage.seoText.enabled, false);
});

test('schema refuses an enabled trust row item without a title, but lets a disabled one stay blank', () => {
  const item = {
    id: 'trust-x', icon: 'map-pin' as const, title: '   ', description: 'D', titleEn: '', descriptionEn: '', enabled: true, order: 0,
  };
  const config = cloneConfig();
  config.commercial.trustRow = { enabled: true, items: [item] };

  const parsed = storefrontConfigSchema.safeParse(config);
  assert.equal(parsed.success, false);
  assert.deepEqual(
    parsed.success ? null : parsed.error.issues.map((issue) => issue.path.join('.')),
    ['commercial.trustRow.items.0.title'],
  );

  config.commercial.trustRow = { enabled: true, items: [{ ...item, enabled: false }] };
  assert.equal(storefrontConfigSchema.safeParse(config).success, true);
});

test('schema keeps the showcase landing and refuses unsafe links in it', () => {
  const showcase = JSON.parse(readFileSync(new URL('../../data/config-asiandeligo.json', import.meta.url), 'utf8')).published.homepage.showcase;
  const config = cloneConfig();
  (config.homepage as StorefrontConfig['homepage'] & { showcase: unknown }).showcase = showcase;

  const parsed = storefrontConfigSchema.safeParse(config);
  assert.equal(parsed.success, true, JSON.stringify(parsed.success ? null : parsed.error.issues.slice(0, 3)));
  assert.deepEqual((parsed.data?.homepage as { showcase?: unknown }).showcase, showcase);

  const hostile = structuredClone(showcase);
  hostile.heroSlides[0].ctaLink = 'javascript:alert(1)';
  hostile.store.mapsUrl = 'javascript:alert(1)';
  (config.homepage as StorefrontConfig['homepage'] & { showcase: unknown }).showcase = hostile;
  const refused = storefrontConfigSchema.safeParse(config);
  assert.equal(refused.success, false);
  assert.deepEqual(
    refused.success ? [] : refused.error.issues.map((issue) => issue.path.join('.')).sort(),
    ['homepage.showcase.heroSlides.0.ctaLink', 'homepage.showcase.store.mapsUrl'],
  );
});
