import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CONFIG } from './defaults';
import { storefrontConfigSchema } from './validation';

import type { GridBannerBlock, StorefrontConfig } from '../types/config';

function configWithGrid(imageFit?: GridBannerBlock['imageFit']): StorefrontConfig {
  const config = structuredClone(DEFAULT_CONFIG);
  const hero = config.homepage.blocks.find((block) => block.type === 'hero');

  if (!hero) throw new Error('Missing hero block in grid image contract fixture');
  hero.slides[0].imageUrl = '/uploads/hero.jpg';
  config.homepage.blocks.push({
    id: 'grid-image-contract',
    type: 'grid',
    enabled: true,
    order: 1,
    columns: 3,
    imageFit,
    items: [{
      id: 'grid-image-contract-item',
      imageUrl: '/uploads/category.webp',
      title: 'Noodles and rice',
      href: '/categories/noodles-and-rice',
      enabled: true,
    }],
  });

  return config;
}

test('keeps legacy grid banners valid when imageFit is absent', () => {
  const config = configWithGrid();
  const grid = config.homepage.blocks.find((block) => block.type === 'grid');

  if (grid) delete grid.imageFit;

  const parsed = storefrontConfigSchema.parse(config);
  const parsedGrid = parsed.homepage.blocks.find((block) => block.type === 'grid');

  assert.ok(parsedGrid);
  assert.equal(parsedGrid.imageFit, undefined);
});

test('preserves the supported grid banner image fit modes', () => {
  for (const imageFit of ['contain', 'cover'] as const) {
    const parsed = storefrontConfigSchema.parse(configWithGrid(imageFit));
    const parsedGrid = parsed.homepage.blocks.find((block) => block.type === 'grid');

    assert.ok(parsedGrid);
    assert.equal(parsedGrid.imageFit, imageFit);
  }
});

test('rejects unsupported grid banner image fit modes', () => {
  const payload = structuredClone(configWithGrid()) as unknown as {
    homepage: { blocks: Array<Record<string, unknown>> };
  };
  const grid = payload.homepage.blocks.find((block) => block.type === 'grid');

  assert.ok(grid);
  grid.imageFit = 'stretch';
  assert.equal(storefrontConfigSchema.safeParse(payload).success, false);
});
