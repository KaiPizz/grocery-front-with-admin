import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CONFIG } from './defaults';
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
