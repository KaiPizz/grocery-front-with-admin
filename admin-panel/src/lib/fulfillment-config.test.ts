import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CONFIG } from './defaults';
import { auditKamitoConfig } from './kamito-config-audit';
import { withConfigDefaults } from './config-repository';
import { storefrontConfigSchema } from './validation';

import type { StorefrontConfig } from '../types/config';

function makeSchemaValidConfig(): StorefrontConfig {
  const config = structuredClone(DEFAULT_CONFIG);
  const heroBlock = config.homepage.blocks[0];

  if (heroBlock.type !== 'hero') {
    throw new Error('Expected default hero block');
  }

  heroBlock.slides[0].imageUrl = '/uploads/hero.jpg';
  return config;
}

test('default config keeps delivery/backend fulfillment behavior', () => {
  assert.deepEqual(DEFAULT_CONFIG.general.fulfillment, {
    mode: 'delivery',
    paymentPromise: 'backend',
    stockDisplayMode: 'exact_when_low',
    pickupInstructions: null,
    bankTransferInstructions: null,
  });
});

test('validation accepts pickup and bank transfer fulfillment config', () => {
  const config = makeSchemaValidConfig();

  config.general.fulfillment = {
    mode: 'pickup',
    paymentPromise: 'bank_transfer',
    stockDisplayMode: 'availability_only',
    pickupInstructions: null,
    bankTransferInstructions: null,
  };

  const result = storefrontConfigSchema.safeParse(config);

  assert.equal(result.success, true);
});

test('normalizes older stored configs without fulfillment config', () => {
  const legacyConfig = makeSchemaValidConfig() as StorefrontConfig & {
    general: Omit<StorefrontConfig['general'], 'fulfillment'>;
  };

  delete (legacyConfig.general as Partial<StorefrontConfig['general']>).fulfillment;

  const normalized = withConfigDefaults(legacyConfig as StorefrontConfig);

  assert.equal(normalized.general.fulfillment.mode, 'delivery');
  assert.equal(normalized.general.fulfillment.paymentPromise, 'backend');
  assert.equal(normalized.general.fulfillment.stockDisplayMode, 'exact_when_low');
});

test('Kamito launch audit reports localhost media and missing owner details', () => {
  const config = makeSchemaValidConfig();

  config.branding.storeName = 'Kenmito';
  config.branding.logoUrl = 'http://localhost:4100/uploads/logo.jpg';
  config.seo.canonical = '';
  config.general.email = '';
  config.general.phone = '';
  config.general.address = '';

  const issues = auditKamitoConfig(config);

  assert.ok(issues.some((issue) => issue.id === 'kamito.localhost-media'));
  assert.ok(issues.some((issue) => issue.id === 'kamito.owner-contact-missing'));
  assert.ok(issues.some((issue) => issue.id === 'kamito.canonical-missing'));
});

test('Kamito launch audit fails enabled image blocks without production media', () => {
  const config = makeSchemaValidConfig();
  const heroBlock = config.homepage.blocks[0];

  if (heroBlock.type !== 'hero') {
    throw new Error('Expected default hero block');
  }

  heroBlock.slides[0].imageUrl = null;

  const issues = auditKamitoConfig(config);

  assert.ok(issues.some((issue) => issue.id === 'kamito.enabled-image-block-missing-media'));
});
