import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const serverConfigSource = readFileSync(new URL('../src/lib/storefront-config.ts', import.meta.url), 'utf8');
const clientProviderSource = readFileSync(new URL('../src/components/ConfigProvider.tsx', import.meta.url), 'utf8');
const staticConfigUrl = new URL('../public/config/kenmito.json', import.meta.url);
const asiaDeliGoConfigUrl = new URL('../public/config/asiandeligo.json', import.meta.url);
const plMessages = readFileSync(new URL('../src/messages/pl.json', import.meta.url), 'utf8');
const enMessages = readFileSync(new URL('../src/messages/en.json', import.meta.url), 'utf8');

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
  assert.ok(heroBlock);
  assert.equal(heroBlock.id, 'asiandeligo-drive-hero-20260713');
  assert.equal(heroBlock.slides.length, 6);

  for (const [index, slide] of heroBlock.slides.entries()) {
    const number = String(index + 1).padStart(2, '0');
    assert.equal(slide.imageUrl, `/brand/hero/asia-deli-go-hero-${number}.webp`);
    assert.equal(slide.mobileImageUrl, `/brand/hero/asia-deli-go-hero-${number}-mobile.webp`);
    assert.equal(slide.title, '');
    assert.equal(slide.ctaText, '');

    for (const imageUrl of [slide.imageUrl, slide.mobileImageUrl]) {
      const assetUrl = new URL(`../public${imageUrl}`, import.meta.url);
      assert.equal(existsSync(assetUrl), true, `Missing hero asset: ${imageUrl}`);
      const bytes = readFileSync(assetUrl);
      assert.equal(bytes.subarray(0, 4).toString('ascii'), 'RIFF');
      assert.equal(bytes.subarray(8, 12).toString('ascii'), 'WEBP');
    }
  }
});

test('homepage campaign copy uses Asia Deli Go branding', () => {
  assert.match(plMessages, /Wybór Asia Deli Go/);
  assert.match(enMessages, /Asia Deli Go picks/);
  assert.doesNotMatch(plMessages, /Wybór Kenmito/);
  assert.doesNotMatch(enMessages, /Kenmito picks/);
});
