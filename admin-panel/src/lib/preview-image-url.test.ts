import assert from 'node:assert/strict';
import test from 'node:test';

import { resolvePreviewImageUrl } from './preview-image-url';

function onAdminHost(host: string, run: () => void) {
  const previous = (globalThis as { window?: unknown }).window;
  (globalThis as { window?: unknown }).window = { location: { protocol: 'https:', host } };
  try {
    run();
  } finally {
    (globalThis as { window?: unknown }).window = previous;
  }
}

test('production admin previews storefront art from asiadeligo.com, not the retired eshoper host', () => {
  onAdminHost('asiandeligo-admin.eshoper.pro', () => {
    assert.equal(resolvePreviewImageUrl('/brand/showcase/hero-sushi.webp'), 'https://asiadeligo.com/brand/showcase/hero-sushi.webp');
  });
});

test('dev admin previews from the dev storefront', () => {
  onAdminHost('adg-dev-admin.159.195.47.45.sslip.io', () => {
    assert.equal(resolvePreviewImageUrl('/brand/x.webp'), 'https://adg-dev.159.195.47.45.sslip.io/brand/x.webp');
  });
});

test('uploads and absolute URLs stay as they are', () => {
  onAdminHost('asiandeligo-admin.eshoper.pro', () => {
    assert.equal(resolvePreviewImageUrl('/uploads/a.webp'), '/uploads/a.webp');
    assert.equal(resolvePreviewImageUrl('https://cdn.example/a.webp'), 'https://cdn.example/a.webp');
    assert.equal(resolvePreviewImageUrl(''), null);
  });
});
