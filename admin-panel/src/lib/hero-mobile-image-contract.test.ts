import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { imageSize } from 'image-size';

const configFiles = ['config-asiandeligo.json', 'config-kenmito.json'];

test('Asia Deli Go hero mobile artwork uses the full-frame 768x240 contract', () => {
  for (const filename of configFiles) {
    const envelope = JSON.parse(readFileSync(path.join(process.cwd(), 'data', filename), 'utf8'));

    for (const state of ['published', 'draft']) {
      const hero = envelope[state].homepage.blocks.find((block: { type: string }) => block.type === 'hero');
      assert.ok(hero, `${filename} ${state} hero block is missing`);
      assert.equal(hero.slides.length, 6);

      for (const [index, slide] of hero.slides.entries()) {
        const number = String(index + 1).padStart(2, '0');
        const expectedUrl = `/brand/hero/asia-deli-go-hero-${number}-mobile.webp`;
        assert.equal(slide.mobileImageUrl, expectedUrl);

        const assetPath = path.resolve(
          process.cwd(),
          '../grocery-storefront/public',
          expectedUrl.slice(1)
        );
        const dimensions = imageSize(readFileSync(assetPath));
        assert.equal(dimensions.width, 768);
        assert.equal(dimensions.height, 240);
      }
    }
  }
});
