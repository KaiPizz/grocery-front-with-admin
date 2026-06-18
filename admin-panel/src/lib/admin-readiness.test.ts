import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CONFIG } from './defaults';
import { getAdminReadiness, getPublishBlockerMessage } from './admin-readiness';
import { storefrontConfigSchema } from './validation';

import type { StorefrontConfig } from '../types/config';

function cloneConfig(): StorefrontConfig {
  return structuredClone(DEFAULT_CONFIG);
}

function makePublishableConfig(): StorefrontConfig {
  const config = cloneConfig();
  const heroBlock = config.homepage.blocks[0];

  if (heroBlock.type !== 'hero') {
    throw new Error('Expected default hero block');
  }

  heroBlock.slides[0].imageUrl = '/uploads/hero.jpg';
  return config;
}

test('allows publish when enabled banner assets are valid', () => {
  const readiness = getAdminReadiness(makePublishableConfig());

  assert.equal(readiness.canPublish, true);
  assert.deepEqual(readiness.blockingIssues, []);
});

test('blocks publish when an enabled hero slide is missing its desktop image', () => {
  const readiness = getAdminReadiness(cloneConfig());

  assert.equal(readiness.canPublish, false);
  assert.equal(readiness.blockingIssues[0]?.id, 'homepage.hero-slide-image-missing');
  assert.equal(readiness.firstBlockingSection?.id, 'homepage');
});

test('allows draft validation for incomplete banner blocks so editors can save work in progress', () => {
  const config = cloneConfig();
  const result = storefrontConfigSchema.safeParse(config);

  assert.equal(result.success, true);
});

test('reports both sticky banner image blockers when required images are missing', () => {
  const config = makePublishableConfig();
  config.homepage.blocks.push({
    id: 'sticky-1',
    type: 'small_sticky',
    enabled: true,
    order: 1,
    desktopImageUrl: null,
    mobileImageUrl: null,
    title: 'Promo',
    ctaText: 'Shop now',
    ctaLink: '/products',
    position: 'top',
    dismissible: true,
  });

  const readiness = getAdminReadiness(config);

  assert.deepEqual(
    readiness.blockingIssues.map((issue) => issue.id),
    ['homepage.sticky-desktop-image-missing', 'homepage.sticky-mobile-image-missing']
  );
});

test('ignores missing images on disabled banner blocks', () => {
  const config = makePublishableConfig();
  const heroBlock = config.homepage.blocks[0];

  if (heroBlock.type !== 'hero') {
    throw new Error('Expected default hero block');
  }

  heroBlock.enabled = false;
  heroBlock.slides[0].imageUrl = null;

  const readiness = getAdminReadiness(config);

  assert.equal(readiness.canPublish, true);
  assert.deepEqual(readiness.blockingIssues, []);
});

test('keeps disabled tracking optional instead of blocking first publish', () => {
  const readiness = getAdminReadiness(makePublishableConfig());

  assert.equal(readiness.blockingIssues.some((issue) => issue.sectionId === 'tracking'), false);
  assert.equal(readiness.optionalIssues[0]?.id, 'tracking.disabled');
});

test('blocks publish when an enabled tracker is missing its required id', () => {
  const config = makePublishableConfig();
  config.tracking.googleAnalytics.enabled = true;
  config.tracking.googleAnalytics.measurementId = '';

  const readiness = getAdminReadiness(config);

  assert.equal(readiness.canPublish, false);
  assert.equal(readiness.blockingIssues[0]?.id, 'tracking.google-analytics-id-missing');
});

test('reports default branding, contact, and seo as recommendations only', () => {
  const readiness = getAdminReadiness(makePublishableConfig());

  assert.deepEqual(
    readiness.recommendedIssues.map((issue) => issue.id),
    [
      'branding.logo-missing',
      'branding.store-name-default',
      'general.contact-incomplete',
      'seo.defaults-incomplete',
    ]
  );
  assert.equal(readiness.canPublish, true);
});

test('keeps checklist order deterministic and points to the first blocking setup step', () => {
  const readiness = getAdminReadiness(cloneConfig());

  assert.deepEqual(
    readiness.sections.map((section) => section.id),
    ['branding', 'homepage', 'layout', 'general', 'seo', 'tracking']
  );
  assert.equal(readiness.firstBlockingSection?.id, 'homepage');
});

test('returns a human-readable publish blocker message for the first issue', () => {
  const readiness = getAdminReadiness(cloneConfig());

  assert.equal(
    getPublishBlockerMessage(readiness.blockingIssues[0]),
    'Cannot publish: a hero slide is missing its desktop image.'
  );
});
