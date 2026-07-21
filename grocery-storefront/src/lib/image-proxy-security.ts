import { isIP } from 'node:net';

export const MAX_PROXIED_IMAGE_BYTES = 8 * 1024 * 1024;
export const IMAGE_PROXY_TIMEOUT_MS = 8_000;

const FIXED_IMAGE_HOSTS = new Set([
  'asiandeligo-admin.eshoper.pro',
  'images.unsplash.com',
  'img.zira.pl',
  'upload.wikimedia.org',
]);

const RASTER_CONTENT_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, '');
}

function configuredImageHosts(): Set<string> {
  const hosts = new Set(FIXED_IMAGE_HOSTS);
  const configApiUrl = process.env.NEXT_PUBLIC_CONFIG_API_URL?.trim();

  if (configApiUrl) {
    try {
      hosts.add(normalizeHostname(new URL(configApiUrl).hostname));
    } catch {
      // A malformed deployment URL must not broaden the proxy allowlist.
    }
  }

  for (const value of (process.env.IMAGE_PROXY_ALLOWED_HOSTS ?? '').split(',')) {
    const hostname = normalizeHostname(value);
    if (/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(hostname)) {
      hosts.add(hostname);
    }
  }

  return hosts;
}

export function isAllowedImageProxyUrl(value: string): boolean {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const hostname = normalizeHostname(url.hostname);

  return url.protocol === 'https:'
    && !url.username
    && !url.password
    && (!url.port || url.port === '443')
    && Boolean(hostname)
    && isIP(hostname) === 0
    && hostname !== 'localhost'
    && !hostname.endsWith('.localhost')
    && configuredImageHosts().has(hostname);
}

export function getAllowedRasterContentType(value: string | null): string | null {
  const contentType = value?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return RASTER_CONTENT_TYPES.has(contentType) ? contentType : null;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((byte, index) => bytes[index] === byte);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}

export function hasExpectedRasterSignature(bytes: Uint8Array, contentType: string): boolean {
  if (contentType === 'image/jpeg') {
    return startsWith(bytes, [0xff, 0xd8, 0xff]);
  }

  if (contentType === 'image/png') {
    return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  }

  if (contentType === 'image/gif') {
    const header = ascii(bytes, 0, 6);
    return header === 'GIF87a' || header === 'GIF89a';
  }

  if (contentType === 'image/webp') {
    return ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP';
  }

  if (contentType === 'image/avif') {
    if (ascii(bytes, 4, 8) !== 'ftyp') return false;
    const brand = ascii(bytes, 8, 12);
    return brand === 'avif' || brand === 'avis' || brand === 'mif1' || brand === 'msf1';
  }

  return false;
}
