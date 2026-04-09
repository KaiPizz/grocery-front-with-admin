import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { imageSize } from 'image-size';
import { requireApiKey } from '@/lib/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/gif',
]);

async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch {
    // directory already exists
  }
}

/**
 * POST /api/media/upload
 * Admin-only: upload an image file.
 * Expects multipart/form-data with a "file" field.
 * Returns the public URL path.
 */
export async function POST(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Expected multipart/form-data' },
      { status: 400 }
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { success: false, error: 'Missing "file" field in form data' },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: `File too large. Maximum size is ${MAX_SIZE / 1024 / 1024}MB` },
      { status: 413 }
    );
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { success: false, error: `File type "${file.type}" not allowed. Accepted: ${Array.from(ALLOWED_TYPES).join(', ')}` },
      { status: 415 }
    );
  }

  const originalName = (file as File).name || 'upload';
  const ext = path.extname(originalName) || mimeToExt(file.type);
  const safeName = originalName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 100);
  const timestamp = Date.now();
  const filename = `${timestamp}-${safeName}${ext ? '' : ext}`;

  await ensureUploadDir();

  const buffer = Buffer.from(await file.arrayBuffer());

  const expectedWidth = Number(formData.get('expectedWidth') ?? 0) || 0;
  const expectedHeight = Number(formData.get('expectedHeight') ?? 0) || 0;

  if (expectedWidth > 0 && expectedHeight > 0 && file.type !== 'image/svg+xml') {
    try {
      const dims = imageSize(buffer);
      const w = dims.width ?? 0;
      const h = dims.height ?? 0;
      const tolerance = 0.05;
      const wOk = w >= expectedWidth * (1 - tolerance) && w <= expectedWidth * (1 + tolerance);
      const hOk = h >= expectedHeight * (1 - tolerance) && h <= expectedHeight * (1 + tolerance);
      if (!wOk || !hOk) {
        return NextResponse.json(
          {
            success: false,
            error: `Image dimensions ${w}×${h} px do not match the required ${expectedWidth}×${expectedHeight} px (±5% allowed).`,
          },
          { status: 422 }
        );
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Could not read image dimensions. Ensure the file is a valid image.' },
        { status: 422 }
      );
    }
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, buffer);

  // Return absolute URL so images work cross-origin (storefront on different port)
  const host = request.headers.get('host') || 'localhost:4100';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  const publicUrl = `${protocol}://${host}/uploads/${filename}`;

  return NextResponse.json({
    success: true,
    data: {
      url: publicUrl,
      filename,
      size: file.size,
      type: file.type,
    },
  });
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'image/x-icon': '.ico',
    'image/gif': '.gif',
  };
  return map[mime] || '';
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
