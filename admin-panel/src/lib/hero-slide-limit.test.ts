import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CONFIG } from './defaults';
import { storefrontConfigSchema } from './validation';

function configWithHeroSlides(count: number) {
  const config = structuredClone(DEFAULT_CONFIG);
  const hero = config.homepage.blocks.find((block) => block.type === 'hero');

  if (!hero || hero.type !== 'hero') {
    throw new Error('Expected default hero block');
  }

  const base = hero.slides[0];
  hero.slides = Array.from({ length: count }, (_, index) => ({
    ...base,
    id: `hero-slide-${index + 1}`,
    imageUrl: `/brand/hero/hero-${index + 1}.webp`,
  }));

  return config;
}

test('storefront config accepts all six Asia Deli Go hero slides', () => {
  assert.equal(storefrontConfigSchema.safeParse(configWithHeroSlides(6)).success, true);
});

test('storefront config still rejects more than six hero slides', () => {
  assert.equal(storefrontConfigSchema.safeParse(configWithHeroSlides(7)).success, false);
});
