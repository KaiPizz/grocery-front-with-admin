import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CONFIG } from './defaults';
import { auditKenmitoConfig } from './kenmito-config-audit';
import { getAdminReadiness } from './admin-readiness';
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
    pickupAddress: null,
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
    pickupAddress: {
      streetAddress1: 'Zamieniecka 80/12',
      city: 'Warszawa',
      postalCode: '04-158',
      country: 'PL',
    },
    pickupInstructions: null,
    bankTransferInstructions: null,
  };

  const result = storefrontConfigSchema.safeParse(config);

  assert.equal(result.success, true);
});

test('admin readiness blocks pickup publishing without a structured store address', () => {
  const config = makeSchemaValidConfig();
  config.general.fulfillment.mode = 'pickup';
  config.general.fulfillment.pickupAddress = null;

  const readiness = getAdminReadiness(config);

  assert.equal(readiness.canPublish, false);
  assert.ok(readiness.blockingIssues.some((issue) => issue.id === 'general.pickup-address-missing'));
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
  assert.equal(normalized.general.fulfillment.pickupAddress, null);
});

test('Kenmito launch audit reports localhost media and missing owner details', () => {
  const config = makeSchemaValidConfig();

  config.branding.storeName = 'Kenmito';
  config.branding.logoUrl = 'http://localhost:4100/uploads/logo.jpg';
  config.seo.canonical = '';
  config.general.email = '';
  config.general.phone = '';
  config.general.address = '';

  const issues = auditKenmitoConfig(config);

  assert.ok(issues.some((issue) => issue.id === 'kenmito.localhost-media'));
  assert.ok(issues.some((issue) => issue.id === 'kenmito.owner-contact-missing'));
  assert.ok(issues.some((issue) => issue.id === 'kenmito.canonical-missing'));
});

test('Kenmito launch audit fails enabled image blocks without production media', () => {
  const config = makeSchemaValidConfig();
  const heroBlock = config.homepage.blocks[0];

  if (heroBlock.type !== 'hero') {
    throw new Error('Expected default hero block');
  }

  heroBlock.slides[0].imageUrl = null;

  const issues = auditKenmitoConfig(config);

  assert.ok(issues.some((issue) => issue.id === 'kenmito.enabled-image-block-missing-media'));
});
