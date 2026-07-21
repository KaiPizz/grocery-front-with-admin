import { expect, test } from '@playwright/test';

import {
  getAllowedRasterContentType,
  hasExpectedRasterSignature,
  isAllowedImageProxyUrl,
} from '../src/lib/image-proxy-security';

test.describe('image proxy security boundary', () => {
  test('allows only explicit HTTPS image hosts', () => {
    expect(isAllowedImageProxyUrl('https://images.unsplash.com/photo-example')).toBe(true);
    expect(isAllowedImageProxyUrl('https://img.zira.pl/asiandeligo/products/example.webp')).toBe(true);
    expect(isAllowedImageProxyUrl('https://asiandeligo-admin.eshoper.pro/uploads/example.webp')).toBe(true);

    for (const url of [
      'http://images.unsplash.com/photo-example',
      'https://example.com/image.webp',
      'https://127.0.0.1/internal',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/internal',
      'https://localhost/internal',
      'https://user:password@images.unsplash.com/image.webp',
      'https://images.unsplash.com:8443/image.webp',
    ]) {
      expect(isAllowedImageProxyUrl(url), url).toBe(false);
    }
  });

  test('accepts only raster MIME types whose bytes match the declaration', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const html = new TextEncoder().encode('<html><script>alert(1)</script></html>');

    expect(getAllowedRasterContentType('image/png; charset=binary')).toBe('image/png');
    expect(getAllowedRasterContentType('image/svg+xml')).toBeNull();
    expect(getAllowedRasterContentType('text/html')).toBeNull();
    expect(hasExpectedRasterSignature(png, 'image/png')).toBe(true);
    expect(hasExpectedRasterSignature(html, 'image/png')).toBe(false);
  });

  test('rejects private and unapproved targets before proxying', async ({ request }) => {
    for (const target of [
      'http://127.0.0.1:3000/internal',
      'http://169.254.169.254/latest/meta-data',
      'https://example.com/not-approved.png',
    ]) {
      const response = await request.get(`/api/image?url=${encodeURIComponent(target)}&fallback=error`);
      expect(response.status(), target).toBe(404);
      expect(response.headers()['x-image-fallback'], target).toBe('true');
    }
  });

  test('keeps the legacy visual placeholder inert for ordinary image failures', async ({ request }) => {
    const response = await request.get('/api/image?url=not-an-image-url');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('image/svg+xml');
    expect(response.headers()['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });
});
