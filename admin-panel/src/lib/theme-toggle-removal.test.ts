import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_CONFIG } from './defaults';
import { storefrontConfigSchema } from './validation';

function makeSchemaValidConfig() {
  const config = structuredClone(DEFAULT_CONFIG) as Record<string, any>;

  config.homepage.blocks[0].slides[0].imageUrl = '/uploads/hero.jpg';
  return config;
}

test('default header config no longer exposes a theme toggle flag', () => {
  assert.equal(Object.hasOwn(DEFAULT_CONFIG.layout.header, 'showThemeToggle'), false);
});

test('validation drops legacy theme toggle flags from stored configs', () => {
  const legacyConfig = makeSchemaValidConfig();

  legacyConfig.layout.header.showThemeToggle = true;

  const parsed = storefrontConfigSchema.parse(legacyConfig);

  assert.equal(Object.hasOwn(parsed.layout.header, 'showThemeToggle'), false);
});
