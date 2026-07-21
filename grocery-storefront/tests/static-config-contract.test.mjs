import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const serverConfigSource = readFileSync(new URL('../src/lib/storefront-config.ts', import.meta.url), 'utf8');
const clientProviderSource = readFileSync(new URL('../src/components/ConfigProvider.tsx', import.meta.url), 'utf8');
const heroBannerSource = readFileSync(new URL('../src/components/blocks/HeroBanner.tsx', import.meta.url), 'utf8');
const staticConfigUrl = new URL('../public/config/kenmito.json', import.meta.url);
const asiaDeliGoConfigUrl = new URL('../public/config/asiandeligo.json', import.meta.url);
const adminConfigUrl = new URL('../../admin-panel/data/config-asiandeligo.json', import.meta.url);
const adminAliasConfigUrl = new URL('../../admin-panel/data/config-kenmito.json', import.meta.url);
const plMessages = readFileSync(new URL('../src/messages/pl.json', import.meta.url), 'utf8');
const enMessages = readFileSync(new URL('../src/messages/en.json', import.meta.url), 'utf8');

function readWebpDimensions(bytes) {
  let offset = 12;

  while (offset + 8 <= bytes.length) {
    const chunkType = bytes.subarray(offset, offset + 4).toString('ascii');
    const chunkSize = bytes.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;

    if (chunkType === 'VP8 ' && dataOffset + 10 <= bytes.length) {
      assert.equal(bytes.subarray(dataOffset + 3, dataOffset + 6).toString('hex'), '9d012a');
      return {
        width: bytes.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: bytes.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    if (chunkType === 'VP8L' && dataOffset + 5 <= bytes.length) {
      assert.equal(bytes[dataOffset], 0x2f);
      const dimensions = bytes.readUInt32LE(dataOffset + 1);
      return {
        width: (dimensions & 0x3fff) + 1,
        height: ((dimensions >>> 14) & 0x3fff) + 1,
      };
    }

    if (chunkType === 'VP8X' && dataOffset + 10 <= bytes.length) {
      return {
        width: bytes.readUIntLE(dataOffset + 4, 3) + 1,
        height: bytes.readUIntLE(dataOffset + 7, 3) + 1,
      };
    }

    offset = dataOffset + chunkSize + (chunkSize % 2);
  }

  assert.fail('Missing a supported WebP image chunk');
}

test('storefront can load a static config source when no admin config API is configured', () => {
  assert.match(serverConfigSource, /NEXT_PUBLIC_STATIC_CONFIG_URL/);
  assert.match(clientProviderSource, /getStorefrontConfigUrls/);
  assert.match(serverConfigSource, /extractStorefrontConfig/);
  assert.match(clientProviderSource, /extractStorefrontConfig/);
});

test('tracked Kenmito static config carries Asia Deli Go launch truth', () => {
  assert.equal(existsSync(staticConfigUrl), true, 'Missing public/config/kenmito.json');

  const raw = readFileSync(staticConfigUrl, 'utf8');
  assert.doesNotMatch(raw, /localhost|alo123|Chesaigon|BasenGreen/i);

  const envelope = JSON.parse(raw);
  const config = envelope.config;
  const adminEnvelope = JSON.parse(readFileSync(adminConfigUrl, 'utf8'));
  const dealsSection = config.homepage.sections.find((section) => section.id === 'deals');
  const categorySection = config.homepage.sections.find((section) => section.id === 'shopByZone');
  const koreanPantryBanner = config.homepage.promoBanners.find((banner) => banner.id === 'banner-korean-pantry');
  const heroBlock = config.homepage.blocks.find((block) => block.type === 'hero');
  const footerLinks = config.layout.footer.columns.flatMap((column) => column.links);

  assert.equal(config.branding.storeName, 'Asia Deli Go');
  assert.equal(config.branding.logoUrl, '/brand/asia-deli-go-logo-header.png');
  assert.equal(config.homepage.hero.headline, 'Azjatyckie produkty spożywcze na co dzień');
  assert.equal(config.general.fulfillment.mode, 'pickup');
  assert.equal(config.general.fulfillment.paymentPromise, 'backend');
  assert.equal(config.general.fulfillment.stockDisplayMode, 'availability_only');
  assert.match(config.seo.defaultTitle, /^Asia Deli Go\b/);
  assert.equal(categorySection?.enabled, true);
  assert.equal(dealsSection?.enabled, false);
  assert.equal(koreanPantryBanner?.enabled, false);
  assert.equal(config.commercial.outlet.enabled, false);
  assert.equal(config.commercial.outlet.collectionSlug, null);
  assert.equal(config.commercial.quickLinks.some((link) => link.kind === 'outlet' && link.enabled), false);
  assert.equal(footerLinks.some((link) => link.label === 'Kontakt' && link.href === '/privacy'), false);
  assert.equal(footerLinks.some((link) => link.label === 'Dostawa' && link.href === '/terms'), false);
  assert.equal(readFileSync(asiaDeliGoConfigUrl, 'utf8'), raw);
  assert.equal(readFileSync(adminAliasConfigUrl, 'utf8'), readFileSync(adminConfigUrl, 'utf8'));
  assert.deepEqual(adminEnvelope.published, config);
  assert.deepEqual(adminEnvelope.draft, config);
  assert.ok(heroBlock);
  assert.equal(heroBlock.id, 'asiandeligo-drive-hero-20260713');
  assert.equal(heroBlock.slides.length, 6);

  const categoryImageUrls = config.homepage.blocks
    .filter((block) => block.type === 'grid' || block.type === 'round_grid')
    .flatMap((block) => block.items)
    .map((item) => item.imageUrl);
  const expectedCategoryImageUrls = [
    '/brand/categories/sauces-pastes.webp',
    '/brand/categories/drinks.webp',
    '/brand/categories/ready-meals.webp',
    '/brand/categories/kimchi-pickles.webp',
    '/brand/categories/noodles-rice.webp',
    '/brand/categories/snacks-sweets.webp',
    '/brand/categories/sushi-seaweed.webp',
    '/brand/categories/mushrooms-tofu.webp',
    '/brand/categories/kitchen-tools.webp',
  ];

  assert.deepEqual(categoryImageUrls, expectedCategoryImageUrls);
  for (const imageUrl of categoryImageUrls) {
    const assetUrl = new URL(`../public${imageUrl}`, import.meta.url);
    assert.equal(existsSync(assetUrl), true, `Missing category asset: ${imageUrl}`);
    assert.ok(statSync(assetUrl).size <= 120 * 1024, `Category asset exceeds 120 KB: ${imageUrl}`);
    const bytes = readFileSync(assetUrl);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.deepEqual(readWebpDimensions(bytes), { width: 800, height: 800 });
  }

  for (const [index, slide] of heroBlock.slides.entries()) {
    const number = String(index + 1).padStart(2, '0');
    assert.equal(slide.imageUrl, `/brand/hero/asia-deli-go-hero-${number}.webp`);
    assert.equal(slide.mobileImageUrl, `/brand/hero/asia-deli-go-hero-${number}-mobile.webp`);
    assert.equal(slide.title, '');
    assert.equal(slide.ctaText, '');

    const assetUrl = new URL(`../public${slide.imageUrl}`, import.meta.url);
    const mobileAssetUrl = new URL(`../public${slide.mobileImageUrl}`, import.meta.url);
    assert.equal(existsSync(assetUrl), true, `Missing hero asset: ${slide.imageUrl}`);
    assert.equal(existsSync(mobileAssetUrl), true, `Missing mobile hero asset: ${slide.mobileImageUrl}`);
    const bytes = readFileSync(assetUrl);
    const mobileBytes = readFileSync(mobileAssetUrl);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.equal(mobileBytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(mobileBytes.subarray(8, 12).toString('ascii'), 'WEBP');
  }

  assert.match(heroBannerSource, /aspect-\[3\.2\/1\]/);
  assert.match(heroBannerSource, /<picture/);
  assert.match(heroBannerSource, /<source/);
  assert.doesNotMatch(heroBannerSource, /hasDedicatedMobileArtwork|aspect-\[1\.6\/1\]/);
});

test('homepage campaign copy uses Asia Deli Go branding', () => {
  assert.match(plMessages, /Wybór Asia Deli Go/);
  assert.match(enMessages, /Asia Deli Go picks/);
  assert.doesNotMatch(plMessages, /Wybór Kenmito/);
  assert.doesNotMatch(enMessages, /Kenmito picks/);
});
