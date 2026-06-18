import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const serverConfigSource = readFileSync(new URL('../src/lib/storefront-config.ts', import.meta.url), 'utf8');
const clientProviderSource = readFileSync(new URL('../src/components/ConfigProvider.tsx', import.meta.url), 'utf8');
const staticConfigUrl = new URL('../public/config/kenmito.json', import.meta.url);

test('storefront can load a static config source when no admin config API is configured', () => {
  assert.match(serverConfigSource, /NEXT_PUBLIC_STATIC_CONFIG_URL/);
  assert.match(clientProviderSource, /getStorefrontConfigUrls/);
  assert.match(serverConfigSource, /extractStorefrontConfig/);
  assert.match(clientProviderSource, /extractStorefrontConfig/);
});

test('tracked Kenmito static config carries Kenmito launch truth', () => {
  assert.equal(existsSync(staticConfigUrl), true, 'Missing public/config/kenmito.json');

  const raw = readFileSync(staticConfigUrl, 'utf8');
  assert.doesNotMatch(raw, /localhost|alo123|Chesaigon|BasenGreen/i);

  const envelope = JSON.parse(raw);
  const config = envelope.config;
  const dealsSection = config.homepage.sections.find((section) => section.id === 'deals');
  const categorySection = config.homepage.sections.find((section) => section.id === 'shopByZone');
  const koreanPantryBanner = config.homepage.promoBanners.find((banner) => banner.id === 'banner-korean-pantry');
  const footerLinks = config.layout.footer.columns.flatMap((column) => column.links);

  assert.equal(config.branding.storeName, 'Kenmito');
  assert.equal(config.homepage.hero.headline, 'Azjatyckie składniki na codzienny stół');
  assert.equal(config.general.fulfillment.mode, 'pickup');
  assert.equal(config.general.fulfillment.paymentPromise, 'backend');
  assert.equal(config.general.fulfillment.stockDisplayMode, 'availability_only');
  assert.match(config.seo.defaultTitle, /^Kenmito\b/);
  assert.equal(categorySection?.enabled, true);
  assert.equal(dealsSection?.enabled, false);
  assert.equal(koreanPantryBanner?.enabled, false);
  assert.equal(config.commercial.outlet.enabled, false);
  assert.equal(config.commercial.outlet.collectionSlug, null);
  assert.equal(config.commercial.quickLinks.some((link) => link.kind === 'outlet' && link.enabled), false);
  assert.equal(footerLinks.some((link) => link.label === 'Kontakt' && link.href === '/privacy'), false);
  assert.equal(footerLinks.some((link) => link.label === 'Dostawa' && link.href === '/terms'), false);
});
