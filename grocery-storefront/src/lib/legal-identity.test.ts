import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { StorefrontConfig } from '../types/storefront-config';
import * as shared from './storefront-config-shared';

function liveConfig(): StorefrontConfig {
  const envelope = JSON.parse(
    readFileSync(new URL('../../public/config/asiandeligo.json', import.meta.url), 'utf8')
  );
  return structuredClone(envelope.config) as StorefrontConfig;
}

test('legacy storefront config receives empty legal identity defaults', () => {
  const config = liveConfig();
  delete (config.general as unknown as { legalIdentity?: unknown }).legalIdentity;

  const normalized = shared.withStorefrontConfigDefaults(config);

  assert.deepEqual(normalized?.general.legalIdentity, {
    legalName: '',
    registrationType: '',
    nip: '',
    regon: '',
    krs: '',
    registeredAddress: '',
    complaintAddress: '',
  });
});

test('public legal identity never substitutes the storefront brand for a missing legal name', () => {
  const config = liveConfig();
  config.branding.storeName = 'Asia Deli Go';
  (config.general as StorefrontConfig['general'] & { legalIdentity?: unknown }).legalIdentity = {
    legalName: '',
    registrationType: '',
    nip: '1234567890',
    regon: '',
    krs: '',
    registeredAddress: '',
    complaintAddress: '',
  };

  const getPublicLegalIdentity = (
    shared as unknown as Record<string, (value: StorefrontConfig | null) => unknown>
  ).getPublicLegalIdentity;
  assert.equal(typeof getPublicLegalIdentity, 'function');
  assert.equal(getPublicLegalIdentity(config), null);
});

test('public legal identity trims and exposes only configured legal data', () => {
  const config = liveConfig();
  (config.general as StorefrontConfig['general'] & { legalIdentity?: unknown }).legalIdentity = {
    legalName: '  Example Foods sp. z o.o.  ',
    registrationType: 'krs',
    nip: ' 1234567890 ',
    regon: '',
    krs: ' 0000123456 ',
    registeredAddress: ' ul. Przykładowa 1, Warszawa ',
    complaintAddress: '',
  };

  const getPublicLegalIdentity = (
    shared as unknown as Record<string, (value: StorefrontConfig | null) => unknown>
  ).getPublicLegalIdentity;
  assert.equal(typeof getPublicLegalIdentity, 'function');
  assert.deepEqual(getPublicLegalIdentity(config), {
    legalName: 'Example Foods sp. z o.o.',
    registrationType: 'krs',
    nip: '1234567890',
    regon: '',
    krs: '0000123456',
    registeredAddress: 'ul. Przykładowa 1, Warszawa',
    complaintAddress: '',
  });
});

test('storefront legal messages provide honest seller and controller fallbacks in PL and EN', () => {
  for (const locale of ['pl', 'en']) {
    const messages = JSON.parse(
      readFileSync(new URL(`../messages/${locale}.json`, import.meta.url), 'utf8')
    );
    assert.ok(messages.legal.termsSellerUnavailable?.trim());
    assert.ok(messages.legal.privacyControllerTitle?.trim());
    assert.ok(messages.legal.privacyControllerUnavailable?.trim());
    assert.ok(messages.legal.registeredAddressLabel?.trim());
    assert.ok(messages.legal.complaintAddressLabel?.trim());
  }
});
