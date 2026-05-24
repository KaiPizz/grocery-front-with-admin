import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const serverConfigSource = readFileSync(new URL('../src/lib/storefront-config.ts', import.meta.url), 'utf8');
const clientProviderSource = readFileSync(new URL('../src/components/ConfigProvider.tsx', import.meta.url), 'utf8');
const staticConfigUrl = new URL('../public/config/kamito.json', import.meta.url);

test('storefront can load a static config source when no admin config API is configured', () => {
  assert.match(serverConfigSource, /NEXT_PUBLIC_STATIC_CONFIG_URL/);
  assert.match(clientProviderSource, /getStorefrontConfigUrls/);
  assert.match(serverConfigSource, /extractStorefrontConfig/);
  assert.match(clientProviderSource, /extractStorefrontConfig/);
});

test('tracked Kamito static config carries launch fulfillment truth', () => {
  assert.equal(existsSync(staticConfigUrl), true, 'Missing public/config/kamito.json');

  const raw = readFileSync(staticConfigUrl, 'utf8');
  assert.doesNotMatch(raw, /localhost|alo123|Chesaigon|BasenGreen/i);

  const envelope = JSON.parse(raw);
  const config = envelope.config;

  assert.equal(config.branding.storeName, 'Kamito');
  assert.equal(config.general.fulfillment.mode, 'pickup');
  assert.equal(config.general.fulfillment.paymentPromise, 'bank_transfer');
  assert.equal(config.general.fulfillment.stockDisplayMode, 'availability_only');
  assert.match(config.seo.defaultTitle, /^Kamito\b/);
});
