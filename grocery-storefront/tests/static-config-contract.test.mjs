import { existsSync, readFileSync, statSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const serverConfigSource = readFileSync(new URL('../src/lib/storefront-config.ts', import.meta.url), 'utf8');
const sharedConfigSource = readFileSync(new URL('../src/lib/storefront-config-shared.ts', import.meta.url), 'utf8');
const clientProviderSource = readFileSync(new URL('../src/components/ConfigProvider.tsx', import.meta.url), 'utf8');
const heroBannerSource = readFileSync(new URL('../src/components/blocks/HeroBanner.tsx', import.meta.url), 'utf8');
const seoMetadataSource = readFileSync(new URL('../src/lib/seo-metadata.ts', import.meta.url), 'utf8');
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
  assert.match(sharedConfigSource, /NEXT_PUBLIC_STATIC_CONFIG_URL/);
  assert.match(clientProviderSource, /getStorefrontConfigUrls/);
  assert.match(serverConfigSource, /extractStorefrontConfig/);
  assert.match(clientProviderSource, /extractStorefrontConfig/);
  assert.match(serverConfigSource, /readFile\(filePath, 'utf8'\)/);
  assert.match(serverConfigSource, /resolve\(process\.cwd\(\), 'public', 'config', fileName\)/);
  assert.match(clientProviderSource, /storefront-config-shared/);
  assert.doesNotMatch(clientProviderSource, /from '@\/lib\/storefront-config'/);
});

test('tracked Kenmito static config carries Asia Deli Go launch truth', () => {
  assert.equal(existsSync(staticConfigUrl), true, 'Missing public/config/kenmito.json');

  const raw = readFileSync(asiaDeliGoConfigUrl, 'utf8');
  assert.doesNotMatch(raw, /localhost|alo123|Chesaigon|BasenGreen/i);

  const envelope = JSON.parse(raw);
  const config = envelope.config;
  const adminEnvelope = JSON.parse(readFileSync(adminConfigUrl, 'utf8'));
  const legacyStaticEnvelope = JSON.parse(readFileSync(staticConfigUrl, 'utf8'));
  const legacyAdminEnvelope = JSON.parse(readFileSync(adminAliasConfigUrl, 'utf8'));
  const dealsSection = config.homepage.sections.find((section) => section.id === 'deals');
  const categorySection = config.homepage.sections.find((section) => section.id === 'shopByZone');
  const koreanPantryBanner = config.homepage.promoBanners.find((banner) => banner.id === 'banner-korean-pantry');
  const koreanPantryCollection = config.commercial.collections.find((collection) => collection.slug === 'korean-pantry');
  const heroBlock = config.homepage.blocks.find((block) => block.type === 'hero');
  const categoryGridBlocks = config.homepage.blocks.filter((block) => block.type === 'grid');
  const roundCategoryBlock = config.homepage.blocks.find((block) => block.type === 'round_grid');
  const footerLinks = config.layout.footer.columns.flatMap((column) => column.links);

  assert.equal(config.branding.storeName, 'Asia Deli Go');
  assert.equal(config.branding.logoUrl, '/brand/asia-deli-go-logo-header.png');
  assert.equal(config.homepage.hero.headline, 'Azjatyckie produkty spożywcze na co dzień');
  assert.equal(config.general.fulfillment.mode, 'pickup');
  assert.equal(config.general.fulfillment.paymentPromise, 'backend');
  assert.equal(config.general.fulfillment.stockDisplayMode, 'availability_only');
  assert.match(config.seo.defaultTitle, /^Asia Deli Go\b/);
  assert.equal(config.seo.canonical, 'https://asiadeligo.com');
  assert.equal(categorySection?.enabled, true);
  assert.equal(dealsSection?.enabled, false);
  assert.equal(koreanPantryBanner?.enabled, false);
  // Asia Deli Go is not a Korean shop: the pantry collection, its quick link and
  // its footer link are retired in favour of the "Kuchnie" menu by country of origin.
  assert.equal(koreanPantryCollection?.enabled, false);
  assert.equal(koreanPantryCollection?.heroImageUrl, '/brand/hero/korean-pantry-hero.webp');
  assert.equal(config.commercial.quickLinks.some((link) => link.enabled), false);
  assert.equal(footerLinks.some((link) => link.href === '/collections/korean-pantry'), false);
  assert.equal(config.commercial.outlet.enabled, false);
  assert.equal(config.commercial.outlet.collectionSlug, null);
  assert.equal(config.commercial.quickLinks.some((link) => link.kind === 'outlet' && link.enabled), false);
  assert.equal(config.commercial.categoryHub.enabled, true);
  assert.equal(config.commercial.categoryHub.items.length, 10);
  assert.equal(new Set(config.commercial.categoryHub.items.map((item) => item.id)).size, 10);
  assert.equal(new Set(config.commercial.categoryHub.items.map((item) => item.categorySlug)).size, 10);
  assert.deepEqual(
    config.commercial.categoryHub.items.map((item) => item.order),
    Array.from({ length: 10 }, (_, index) => index),
  );
  assert.equal(footerLinks.some((link) => link.label === 'Kontakt' && link.href === '/privacy'), false);
  assert.equal(footerLinks.some((link) => link.label === 'Dostawa' && link.href === '/terms'), false);
  assert.equal(legacyStaticEnvelope.slug, envelope.slug);
  assert.equal(legacyStaticEnvelope.config.seo.canonical, 'https://asiadeligo.com');
  assert.equal(legacyAdminEnvelope.published.seo.canonical, 'https://asiadeligo.com');
  assert.equal(legacyAdminEnvelope.draft.seo.canonical, 'https://asiadeligo.com');
  for (const legacyConfig of [
    legacyStaticEnvelope.config,
    legacyAdminEnvelope.published,
    legacyAdminEnvelope.draft,
  ]) {
    assert.deepEqual(
      { ...legacyConfig, seo: { ...legacyConfig.seo, canonical: config.seo.canonical } },
      config,
    );
  }
  assert.deepEqual(adminEnvelope.published, config);
  assert.deepEqual(adminEnvelope.draft, config);
  assert.ok(heroBlock);
  assert.equal(heroBlock.id, 'asiandeligo-drive-hero-20260713');
  assert.equal(heroBlock.slides.length, 6);
  // The online catalog carries no frozen goods, so the "PRODUKTY MROŻONE" slide (01)
  // and the "wysyłka 24h" slide (02, pickup-only shop) stay off.
  assert.deepEqual(
    heroBlock.slides.filter((slide) => slide.enabled === false).map((slide) => slide.id),
    ['asiandeligo-drive-hero-slide-1', 'asiandeligo-drive-hero-slide-2'],
  );
  // Link previews use the default og:image while seo.ogImageUrl is null: it must be artwork
  // the shop still shows, not the retired frozen-goods slide.
  assert.equal(config.seo.ogImageUrl, null);
  const defaultOgImage = seoMetadataSource.match(/DEFAULT_OG_IMAGE_PATH = '([^']+)'/)?.[1];
  assert.ok(
    heroBlock.slides.some((slide) => slide.enabled !== false && slide.imageUrl === defaultOgImage),
    `Default og:image ${defaultOgImage} is not an enabled hero slide`,
  );
  assert.equal(categoryGridBlocks.length, 2);
  assert.deepEqual(categoryGridBlocks.map((block) => block.imageFit), ['cover', 'cover']);
  assert.ok(roundCategoryBlock);
  assert.equal(roundCategoryBlock.imageFit, undefined);

  const categoryImageUrls = config.homepage.blocks
    .filter((block) => block.type === 'grid' || block.type === 'round_grid')
    .flatMap((block) => block.items)
    .map((item) => item.imageUrl);
  const expectedCategoryImageUrls = [
    '/brand/categories/sauces-oils.webp',
    '/brand/categories/drinks.webp',
    '/brand/categories/ready-meals.webp',
    '/brand/categories/kimchi-pickles.webp',
    '/brand/categories/noodles-rice.webp',
    '/brand/categories/snacks-sweets.webp',
    '/brand/categories/sushi-seaweed.webp',
    '/brand/categories/dried-mushrooms.webp',
    '/brand/categories/kitchen-tools.webp',
  ];

  assert.deepEqual(categoryImageUrls, expectedCategoryImageUrls);
  // Two tiles on one href read as two shelves but open the same page (2026-09-28 review).
  const enabledTileHrefs = config.homepage.blocks
    .filter((block) => block.type === 'grid' || block.type === 'round_grid')
    .flatMap((block) => block.items)
    .filter((item) => item.enabled !== false)
    .map((item) => item.href);
  assert.equal(new Set(enabledTileHrefs).size, enabledTileHrefs.length, `Duplicate tile href: ${enabledTileHrefs}`);
  for (const imageUrl of categoryImageUrls) {
    const assetUrl = new URL(`../public${imageUrl}`, import.meta.url);
    assert.equal(existsSync(assetUrl), true, `Missing category asset: ${imageUrl}`);
    assert.ok(statSync(assetUrl).size <= 120 * 1024, `Category asset exceeds 120 KB: ${imageUrl}`);
    const bytes = readFileSync(assetUrl);
    assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
    assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
    assert.deepEqual(readWebpDimensions(bytes), { width: 800, height: 800 });
  }

  for (const item of config.commercial.categoryHub.items) {
    assert.equal(item.enabled, true);
    assert.match(item.categorySlug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.match(item.imageUrl, /^\/brand\/categories\/[a-z0-9-]+\.webp$/);

    const assetUrl = new URL(`../public${item.imageUrl}`, import.meta.url);
    assert.equal(existsSync(assetUrl), true, `Missing category hub asset: ${item.imageUrl}`);
    assert.ok(statSync(assetUrl).size <= 120 * 1024, `Category hub asset exceeds 120 KB: ${item.imageUrl}`);
  }

  const koreanPantryHeroUrl = new URL(`../public${koreanPantryCollection.heroImageUrl}`, import.meta.url);
  assert.equal(existsSync(koreanPantryHeroUrl), true, 'Missing Korean pantry hero asset');
  assert.ok(statSync(koreanPantryHeroUrl).size <= 120 * 1024, 'Korean pantry hero exceeds 120 KB');
  const koreanPantryHeroBytes = readFileSync(koreanPantryHeroUrl);
  assert.equal(koreanPantryHeroBytes.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(koreanPantryHeroBytes.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.deepEqual(readWebpDimensions(koreanPantryHeroBytes), { width: 1920, height: 600 });

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

// Wave 2: the category tree (10 groups) is applied by the backend repo; the
// committed copy under tests/fixtures is what the ADG config must point at
// (hub tiles, grid links, collections). A missing fixture fails, never skips.
const RETIRED_GROUP_SLUGS = ['sosy-pasty-i-przyprawy', 'sushi-i-algi', 'grzyby-warzywa-i-tofu'];
const CATEGORY_TREE_JSON = new URL('./fixtures/adg-category-tree.json', import.meta.url);

function readAdgConfigs() {
  const envelope = JSON.parse(readFileSync(asiaDeliGoConfigUrl, 'utf8'));
  const adminEnvelope = JSON.parse(readFileSync(adminConfigUrl, 'utf8'));
  return { envelope, adminEnvelope };
}

test('ADG category hub points only at live group slugs', () => {
  const { envelope } = readAdgConfigs();
  const groupSlugs = new Set(JSON.parse(readFileSync(CATEGORY_TREE_JSON, 'utf8')).groups.map((group) => group.slug));
  for (const item of envelope.config.commercial.categoryHub.items) {
    assert.ok(!RETIRED_GROUP_SLUGS.includes(item.categorySlug), `retired slug ${item.categorySlug}`);
    assert.ok(groupSlugs.has(item.categorySlug), `unknown group slug ${item.categorySlug}`);
  }
  const json = JSON.stringify(envelope.config.homepage.blocks);
  for (const slug of RETIRED_GROUP_SLUGS) {
    assert.equal(json.includes(`/categories/${slug}`), false, `grid still links to ${slug}`);
  }
});

// Every "/categories/<slug>" link (hub, grid tiles, nav, collections, quick links)
// in the ADG configs must resolve to a live group or leaf of the wave 2 tree;
// a retired slug would 301 at best and 404 for a leaf that no longer exists.
function collectCategoryLinks(value, path = '$', out = []) {
  if (typeof value === 'string') {
    const match = value.match(/^(?:\/(?:pl|en))?\/categories\/([a-z0-9-]+)\/?$/);
    if (match) out.push({ path, slug: match[1] });
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectCategoryLinks(item, `${path}[${index}]`, out));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) collectCategoryLinks(child, `${path}.${key}`, out);
  }
  return out;
}

test('every ADG category link points at a live tree slug', () => {
  const tree = JSON.parse(readFileSync(CATEGORY_TREE_JSON, 'utf8'));
  const liveSlugs = new Set(tree.groups.flatMap((group) => [group.slug, ...(group.leaves ?? []).map((leaf) => leaf.slug)]));
  const { envelope, adminEnvelope } = readAdgConfigs();
  for (const [label, config] of [['storefront', envelope.config], ['admin', adminEnvelope.published]]) {
    const links = collectCategoryLinks(config);
    assert.ok(links.length >= 10, `${label}: expected category links in the config, found ${links.length}`);
    const dead = links.filter((link) => !liveSlugs.has(link.slug));
    assert.deepEqual(dead, [], `${label}: links to retired category slugs`);
  }
});

test('ADG showcase landing: text-free art that exists, links and rail slugs on the live tree', () => {
  const tree = JSON.parse(readFileSync(CATEGORY_TREE_JSON, 'utf8'));
  const liveSlugs = new Set(tree.groups.flatMap((group) => [group.slug, ...(group.leaves ?? []).map((leaf) => leaf.slug)]));
  const { envelope, adminEnvelope } = readAdgConfigs();
  const showcase = envelope.config.homepage.showcase;
  assert.deepEqual(adminEnvelope.published.homepage.showcase, showcase);
  assert.equal(showcase.enabled, true);
  assert.ok(showcase.heroSlides.filter((slide) => slide.enabled).length >= 3);

  const assetSize = (path) => {
    const url = new URL(`../public${path}`, import.meta.url);
    assert.equal(existsSync(url), true, `Missing showcase asset: ${path}`);
    assert.ok(statSync(url).size <= 120 * 1024, `Showcase asset exceeds 120 KB: ${path}`);
    return readWebpDimensions(readFileSync(url));
  };
  for (const slide of showcase.heroSlides) {
    const desktop = assetSize(slide.imageUrl);
    const mobile = assetSize(slide.mobileImageUrl);
    assert.equal(desktop.width / desktop.height, 3, `${slide.id}: desktop art is 3:1`);
    // The old art baked text into a 3.2:1 strip that phones shrank to 768x240.
    assert.ok(mobile.width / mobile.height <= 1.5, `${slide.id}: mobile art must be a real mobile crop`);
    assert.ok(slide.headline && slide.ctaText && slide.headlineEn && slide.ctaTextEn, `${slide.id}: copy in both languages`);
    const slug = slide.ctaLink.match(/^\/categories\/([a-z0-9-]+)$/)?.[1];
    assert.ok(slug && liveSlugs.has(slug), `${slide.id}: CTA ${slide.ctaLink} is not a live category`);
  }
  for (const cuisine of showcase.cuisines) assetSize(cuisine.imageUrl);
  for (const rail of showcase.rails) {
    const slugs = rail.source === 'categories' ? rail.values : rail.categories ?? [];
    assert.deepEqual(slugs.filter((slug) => !liveSlugs.has(slug)), [], `${rail.id}: retired slugs`);
  }
  // Placeholders the owner fills later (Google Maps, shop photo, reviews): empty until real.
  assert.deepEqual(showcase.store, { mapsUrl: null, photoUrl: null, reviews: null });
});

test('ADG trust row, featured leaves and seo text are configured in both storefront and admin copies', () => {
  const { envelope, adminEnvelope } = readAdgConfigs();
  for (const [label, config] of [
    ['storefront', envelope.config],
    ['admin published', adminEnvelope.published],
    ['admin draft', adminEnvelope.draft],
  ]) {
    assert.equal(config.commercial.trustRow?.enabled, true, `${label} trustRow.enabled`);
    assert.deepEqual(
      config.commercial.trustRow.items.map((item) => item.id),
      ['trust-pickup', 'trust-payment', 'trust-catalog', 'trust-confirmation'],
      `${label} trustRow ids`,
    );
    for (const item of config.commercial.trustRow.items) {
      assert.ok(['map-pin', 'check-circle', 'credit-card', 'package'].includes(item.icon), `${label} ${item.id} icon`);
      assert.ok(item.title && item.titleEn, `${label} ${item.id} titles`);
    }
    assert.deepEqual(
      config.homepage.featured?.categorySlugs,
      ['buldak-i-ramyun-ostre', 'kimchi', 'pocky-pepero-i-czekolada'],
      `${label} featured`,
    );
    assert.equal(config.homepage.seoText?.enabled, true, `${label} seoText.enabled`);
    assert.match(config.homepage.seoText.headline, /Asia Deli Go/, `${label} seoText.headline`);
    assert.equal(config.homepage.seoText.paragraphs.length, 2, `${label} seoText.paragraphs`);
    assert.equal(config.homepage.seoText.paragraphsEn.length, 2, `${label} seoText.paragraphsEn`);
  }
});

test('storefront and admin ADG configs agree on hub, trust row, featured and seo text', () => {
  const { envelope, adminEnvelope } = readAdgConfigs();
  for (const key of ['commercial.categoryHub', 'commercial.trustRow', 'homepage.featured', 'homepage.seoText']) {
    const pick = (config) => key.split('.').reduce((value, part) => value?.[part], config);
    assert.deepEqual(pick(adminEnvelope.published), pick(envelope.config), `${key} published`);
    assert.deepEqual(pick(adminEnvelope.draft), pick(envelope.config), `${key} draft`);
  }
});
