import assert from 'node:assert/strict';
import test from 'node:test';

import {
  contentTypeForStoredImage,
  createSafeImageFilename,
  isSafeStoredImageFilename,
  validateImageBuffer,
} from './media-validation';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

test('accepts a real raster image whose MIME matches its magic bytes', () => {
  const image = validateImageBuffer(ONE_PIXEL_PNG, 'image/png');
  assert.deepEqual(image, {
    mimeType: 'image/png',
    extension: '.png',
    width: 1,
    height: 1,
  });
});

test('rejects MIME-spoofed and SVG uploads', () => {
  assert.throws(
    () => validateImageBuffer(ONE_PIXEL_PNG, 'image/jpeg'),
    /does not match/
  );
  assert.throws(
    () => validateImageBuffer(Buffer.from('<svg><script>alert(1)</script></svg>'), 'image/svg+xml'),
    /Unsupported or invalid/
  );
});

test('generates a single server-controlled extension', () => {
  const filename = createSafeImageFilename('banner.svg.png', '.jpg', 'safe-id');
  assert.equal(filename, 'safe-id-banner-svg.jpg');
  assert.equal(filename.endsWith('.svg.png'), false);
});

test('public upload serving only accepts raster image filenames', () => {
  assert.equal(isSafeStoredImageFilename('safe-photo.webp'), true);
  assert.equal(isSafeStoredImageFilename('unsafe.svg'), false);
  assert.equal(isSafeStoredImageFilename('../photo.jpg'), false);
  assert.equal(contentTypeForStoredImage('photo.jfif'), 'image/jpeg');
  assert.equal(contentTypeForStoredImage('unsafe.svg'), null);
});
