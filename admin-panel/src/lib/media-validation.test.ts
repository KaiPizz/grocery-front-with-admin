import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  contentTypeForStoredImage,
  createSafeImageFilename,
  isSafeStoredImageFilename,
  readAllowlistedImageDimensions,
  validateImageBuffer,
} from './media-validation';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

function buildDimensionFixtures(): Array<[Buffer, { width: number; height: number }]> {
  const jpeg = Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x02, 0x00, 0x03, 0x03,
    0x01, 0x11, 0x00, 0x02, 0x11, 0x00, 0x03, 0x11, 0x00,
    0xff, 0xd9,
  ]);
  const gif = Buffer.from([
    ...Buffer.from('GIF89a', 'ascii'),
    0x03, 0x00, 0x02, 0x00,
  ]);
  const webp = Buffer.alloc(30);
  webp.write('RIFF', 0, 'ascii');
  webp.writeUInt32LE(22, 4);
  webp.write('WEBP', 8, 'ascii');
  webp.write('VP8X', 12, 'ascii');
  webp.writeUInt32LE(10, 16);
  webp[24] = 0x02;
  webp[27] = 0x01;

  const ico = Buffer.alloc(23);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(1, 4);
  ico[6] = 16;
  ico[7] = 16;
  ico.writeUInt16LE(1, 10);
  ico.writeUInt16LE(32, 12);
  ico.writeUInt32LE(1, 14);
  ico.writeUInt32LE(22, 18);

  return [
    [ONE_PIXEL_PNG, { width: 1, height: 1 }],
    [jpeg, { width: 3, height: 2 }],
    [gif, { width: 3, height: 2 }],
    [webp, { width: 3, height: 2 }],
    [ico, { width: 16, height: 16 }],
  ];
}

test('keeps upload validation independent of vulnerable generic image parsers', () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
  ) as { dependencies?: Record<string, string> };

  assert.equal(packageJson.dependencies?.['image-size'], undefined);
});

test('accepts a real raster image whose MIME matches its magic bytes', () => {
  const image = validateImageBuffer(ONE_PIXEL_PNG, 'image/png');
  assert.deepEqual(image, {
    mimeType: 'image/png',
    extension: '.png',
    width: 1,
    height: 1,
  });
});

test('reads bounded dimensions for every allowlisted raster format', () => {
  for (const [buffer, expected] of buildDimensionFixtures()) {
    assert.deepEqual(readAllowlistedImageDimensions(buffer), expected);
  }
});

test('rejects truncated or non-advancing allowlisted image structures', () => {
  const malformedBuffers = [
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x00]),
    Buffer.from('GIF89a', 'ascii'),
    Buffer.from('RIFF\x00\x00\x00\x00WEBP', 'binary'),
    Buffer.from([0x00, 0x00, 0x01, 0x00, 0xff, 0xff]),
  ];

  for (const buffer of malformedBuffers) {
    assert.throws(() => readAllowlistedImageDimensions(buffer));
  }
});

test('rejects allowlisted headers whose declared dimensions exceed the safety cap', () => {
  const oversizedPng = Buffer.from(ONE_PIXEL_PNG);
  oversizedPng.writeUInt32BE(12_001, 16);

  assert.throws(
    () => validateImageBuffer(oversizedPng, 'image/png'),
    /too large/
  );
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

test('rejects ICNS, JXL, and HEIF signatures before dimension parsing', () => {
  const unsupportedBuffers = [
    Buffer.from('icns00000000', 'ascii'),
    Buffer.from([0xff, 0x0a, 0x00, 0x00, 0x00, 0x00]),
    Buffer.from('00000000ftypheic', 'ascii'),
  ];

  for (const buffer of unsupportedBuffers) {
    assert.throws(
      () => validateImageBuffer(buffer, 'image/x-icon'),
      /Unsupported or invalid/
    );
  }
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
