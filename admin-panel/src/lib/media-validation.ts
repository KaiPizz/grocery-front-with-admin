import path from 'path';

const MAX_DIMENSION = 12_000;
const MAX_PIXELS = 80_000_000;

const MIME_ALIASES: Record<string, string> = {
  'image/jpg': 'image/jpeg',
  'image/vnd.microsoft.icon': 'image/x-icon',
};

export interface ValidatedImage {
  mimeType: string;
  extension: '.gif' | '.ico' | '.jpg' | '.png' | '.webp';
  width: number;
  height: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const JPEG_START_OF_FRAME_MARKERS = new Set([
  0xc0, 0xc1, 0xc2, 0xc3,
  0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb,
  0xcd, 0xce, 0xcf,
]);

function hasPrefix(buffer: Buffer, signature: number[]): boolean {
  return signature.every((value, index) => buffer[index] === value);
}

function detectImageType(buffer: Buffer): Pick<ValidatedImage, 'mimeType' | 'extension'> | null {
  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) {
    return { mimeType: 'image/jpeg', extension: '.jpg' };
  }
  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: '.png' };
  }
  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mimeType: 'image/webp', extension: '.webp' };
  }
  if (
    buffer.length >= 6
    && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))
  ) {
    return { mimeType: 'image/gif', extension: '.gif' };
  }
  if (hasPrefix(buffer, [0x00, 0x00, 0x01, 0x00])) {
    return { mimeType: 'image/x-icon', extension: '.ico' };
  }
  return null;
}

function readPngDimensions(buffer: Buffer): ImageDimensions {
  if (
    buffer.length < 24
    || buffer.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error('Invalid PNG header');
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

function readGifDimensions(buffer: Buffer): ImageDimensions {
  if (buffer.length < 10) throw new Error('Invalid GIF header');
  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  };
}

function readJpegDimensions(buffer: Buffer): ImageDimensions {
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) throw new Error('Invalid JPEG marker');
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset += 1;

    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) continue;
    if (offset + 2 > buffer.length) throw new Error('Invalid JPEG segment');

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      throw new Error('Invalid JPEG segment length');
    }

    if (JPEG_START_OF_FRAME_MARKERS.has(marker)) {
      if (segmentLength < 7) throw new Error('Invalid JPEG frame');
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }

    offset += segmentLength;
  }

  throw new Error('JPEG dimensions not found');
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset]
    | (buffer[offset + 1] << 8)
    | (buffer[offset + 2] << 16);
}

function readWebpDimensions(buffer: Buffer): ImageDimensions {
  if (buffer.length < 20) throw new Error('Invalid WebP header');

  const declaredEnd = buffer.readUInt32LE(4) + 8;
  if (declaredEnd < 20 || declaredEnd > buffer.length) {
    throw new Error('Invalid WebP container length');
  }

  let offset = 12;
  while (offset + 8 <= declaredEnd) {
    const chunkType = buffer.subarray(offset, offset + 4).toString('ascii');
    const chunkLength = buffer.readUInt32LE(offset + 4);
    const dataOffset = offset + 8;
    const chunkEnd = dataOffset + chunkLength;
    if (chunkEnd > declaredEnd) throw new Error('Invalid WebP chunk length');

    if (chunkType === 'VP8X') {
      if (chunkLength < 10) throw new Error('Invalid WebP VP8X header');
      return {
        width: readUInt24LE(buffer, dataOffset + 4) + 1,
        height: readUInt24LE(buffer, dataOffset + 7) + 1,
      };
    }

    if (chunkType === 'VP8L') {
      if (chunkLength < 5 || buffer[dataOffset] !== 0x2f) {
        throw new Error('Invalid WebP VP8L header');
      }
      const dimensionBits = buffer.readUInt32LE(dataOffset + 1);
      return {
        width: (dimensionBits & 0x3fff) + 1,
        height: ((dimensionBits >>> 14) & 0x3fff) + 1,
      };
    }

    if (chunkType === 'VP8 ') {
      if (
        chunkLength < 10
        || !hasPrefix(buffer.subarray(dataOffset + 3), [0x9d, 0x01, 0x2a])
      ) {
        throw new Error('Invalid WebP VP8 header');
      }
      return {
        width: buffer.readUInt16LE(dataOffset + 6) & 0x3fff,
        height: buffer.readUInt16LE(dataOffset + 8) & 0x3fff,
      };
    }

    offset = chunkEnd + (chunkLength % 2);
  }

  throw new Error('WebP dimensions not found');
}

function readIcoDimensions(buffer: Buffer): ImageDimensions {
  if (buffer.length < 22) throw new Error('Invalid ICO header');

  const imageCount = buffer.readUInt16LE(4);
  const directoryEnd = 6 + (imageCount * 16);
  if (imageCount < 1 || directoryEnd > buffer.length) {
    throw new Error('Invalid ICO directory');
  }

  let largest: ImageDimensions | null = null;
  for (let index = 0; index < imageCount; index += 1) {
    const entryOffset = 6 + (index * 16);
    const width = buffer[entryOffset] || 256;
    const height = buffer[entryOffset + 1] || 256;
    const imageLength = buffer.readUInt32LE(entryOffset + 8);
    const imageOffset = buffer.readUInt32LE(entryOffset + 12);

    if (
      imageLength < 1
      || imageOffset < directoryEnd
      || imageOffset + imageLength > buffer.length
    ) {
      throw new Error('Invalid ICO image entry');
    }

    if (!largest || width * height > largest.width * largest.height) {
      largest = { width, height };
    }
  }

  if (!largest) throw new Error('ICO dimensions not found');
  return largest;
}

function readDetectedImageDimensions(
  buffer: Buffer,
  extension: ValidatedImage['extension']
): ImageDimensions {
  switch (extension) {
    case '.png':
      return readPngDimensions(buffer);
    case '.gif':
      return readGifDimensions(buffer);
    case '.jpg':
      return readJpegDimensions(buffer);
    case '.webp':
      return readWebpDimensions(buffer);
    case '.ico':
      return readIcoDimensions(buffer);
  }
}

export function readAllowlistedImageDimensions(buffer: Buffer): ImageDimensions {
  const detected = detectImageType(buffer);
  if (!detected) throw new Error('Unsupported or invalid image file');
  return readDetectedImageDimensions(buffer, detected.extension);
}

export function validateImageBuffer(buffer: Buffer, declaredMimeType: string): ValidatedImage {
  const detected = detectImageType(buffer);
  if (!detected) throw new Error('Unsupported or invalid image file');

  const normalizedDeclared = MIME_ALIASES[declaredMimeType] ?? declaredMimeType;
  if (normalizedDeclared !== detected.mimeType) {
    throw new Error('File content does not match its declared image type');
  }

  let dimensions: ImageDimensions;
  try {
    dimensions = readDetectedImageDimensions(buffer, detected.extension);
  } catch {
    throw new Error('Could not read image dimensions');
  }

  const width = dimensions.width ?? 0;
  const height = dimensions.height ?? 0;
  if (
    width < 1
    || height < 1
    || width > MAX_DIMENSION
    || height > MAX_DIMENSION
    || width * height > MAX_PIXELS
  ) {
    throw new Error('Image dimensions are invalid or too large');
  }

  return { ...detected, width, height };
}

export function createSafeImageFilename(originalName: string, extension: ValidatedImage['extension'], id: string): string {
  const originalBase = path.basename(originalName, path.extname(originalName));
  const safeBase = originalBase
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 64) || 'image';

  const safeId = id.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 64);
  if (!safeId) throw new Error('Invalid upload identifier');
  return `${safeId}-${safeBase}${extension}`;
}

export function isSafeStoredImageFilename(filename: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,180}\.(?:gif|ico|jfif|jpe?g|png|webp)$/i.test(filename);
}

export function contentTypeForStoredImage(filename: string): string | null {
  const extension = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.jfif': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  return types[extension] ?? null;
}
