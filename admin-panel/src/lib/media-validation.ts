import path from 'path';
import { imageSize } from 'image-size';

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

export function validateImageBuffer(buffer: Buffer, declaredMimeType: string): ValidatedImage {
  const detected = detectImageType(buffer);
  if (!detected) throw new Error('Unsupported or invalid image file');

  const normalizedDeclared = MIME_ALIASES[declaredMimeType] ?? declaredMimeType;
  if (normalizedDeclared !== detected.mimeType) {
    throw new Error('File content does not match its declared image type');
  }

  let dimensions: ReturnType<typeof imageSize>;
  try {
    dimensions = imageSize(buffer);
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
