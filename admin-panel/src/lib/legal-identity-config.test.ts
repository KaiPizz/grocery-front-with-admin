import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { en } from '../i18n/translations/en';
import { pl } from '../i18n/translations/pl';
import { vi } from '../i18n/translations/vi';
import type { StorefrontConfig } from '../types/config';
import { patchDraftConfig, saveDraftConfig, withConfigDefaults } from './config-repository';
import { DEFAULT_CONFIG } from './defaults';
import { partialStorefrontConfigSchema, storefrontConfigSchema } from './validation';

const LEGAL_IDENTITY = {
  legalName: 'Example Foods sp. z o.o.',
  registrationType: 'krs' as const,
  nip: '1234567890',
  regon: '123456789',
  krs: '0000123456',
  registeredAddress: 'ul. Przykładowa 1, 00-001 Warszawa',
  complaintAddress: 'ul. Reklamacyjna 2, 00-002 Warszawa',
};

test('legacy configs receive an empty legal identity without inventing a legal name', () => {
  const legacy = structuredClone(DEFAULT_CONFIG) as StorefrontConfig;
  delete (legacy.general as unknown as { legalIdentity?: unknown }).legalIdentity;

  const normalized = withConfigDefaults(legacy);

  assert.deepEqual(normalized.general.legalIdentity, {
    legalName: '',
    registrationType: '',
    nip: '',
    regon: '',
    krs: '',
    registeredAddress: '',
    complaintAddress: '',
  });
  assert.notEqual(normalized.general.legalIdentity.legalName, normalized.branding.storeName);
});

test('validation keeps valid legal identity data and rejects unsupported registration types', () => {
  const valid = structuredClone(DEFAULT_CONFIG);
  valid.general.legalIdentity = LEGAL_IDENTITY;

  const parsed = storefrontConfigSchema.parse(valid);
  assert.deepEqual(parsed.general.legalIdentity, LEGAL_IDENTITY);

  const invalid = structuredClone(valid) as StorefrontConfig;
  (invalid.general.legalIdentity as { registrationType: string }).registrationType = 'vat-register';
  assert.equal(storefrontConfigSchema.safeParse(invalid).success, false);
});

test('partial legal identity patches preserve existing sibling fields', async (context) => {
  const previousDataDir = process.env.ADMIN_DATA_DIR;
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'admin-legal-identity-test-'));
  process.env.ADMIN_DATA_DIR = dataDir;
  context.after(async () => {
    if (previousDataDir === undefined) delete process.env.ADMIN_DATA_DIR;
    else process.env.ADMIN_DATA_DIR = previousDataDir;
    await fs.rm(dataDir, { recursive: true, force: true });
  });

  const config = structuredClone(DEFAULT_CONFIG);
  config.general.legalIdentity = LEGAL_IDENTITY;
  await saveDraftConfig('asiadeligo', config, 0);

  const patched = await patchDraftConfig(
    'asiadeligo',
    { general: { legalIdentity: { nip: '9876543210' } } } as never,
    1
  );

  assert.deepEqual(patched.draft.general.legalIdentity, {
    ...LEGAL_IDENTITY,
    nip: '9876543210',
  });
});

test('partial config validation accepts one legal identity field without defaulting siblings', () => {
  const result = partialStorefrontConfigSchema.parse({
    general: { legalIdentity: { nip: '9876543210' } },
  });

  assert.deepEqual(result, {
    general: { legalIdentity: { nip: '9876543210' } },
  });
});

test('admin legal identity labels and guidance exist in English, Polish, and Vietnamese', () => {
  const keys = [
    'legalIdentityTitle',
    'legalIdentityDescription',
    'legalName',
    'legalNameHint',
    'registrationType',
    'registrationNone',
    'registrationCeidg',
    'registrationKrs',
    'nip',
    'regon',
    'krs',
    'registeredAddress',
    'registeredAddressHint',
    'complaintAddress',
    'complaintAddressHint',
  ];

  for (const [locale, translations] of Object.entries({ en, pl, vi })) {
    const general = translations.general as Record<string, string>;
    for (const key of keys) {
      assert.ok(general[key]?.trim(), `${locale} is missing general.${key}`);
    }
  }
});
