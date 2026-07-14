import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

import {
  AdminStorageConfigurationError,
  getAdminUploadDir,
} from '@/lib/admin-storage';
import {
  contentTypeForStoredImage,
  isSafeStoredImageFilename,
} from '@/lib/media-validation';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ filename: string }>;
}

const IMAGE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
  'Content-Security-Policy': "default-src 'none'; sandbox",
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'X-Content-Type-Options': 'nosniff',
};

async function readUpload(filename: string): Promise<NextResponse> {
  if (!isSafeStoredImageFilename(filename)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const contentType = contentTypeForStoredImage(filename);
  if (!contentType) return new NextResponse('Not found', { status: 404 });

  try {
    const uploadRoot = path.resolve(
      /* turbopackIgnore: true */ getAdminUploadDir()
    );
    const resolved = path.resolve(
      /* turbopackIgnore: true */ uploadRoot,
      filename
    );
    if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) {
      return new NextResponse('Not found', { status: 404 });
    }

    const file = await fs.readFile(resolved);
    return new NextResponse(file, {
      headers: {
        ...IMAGE_HEADERS,
        'Content-Length': String(file.byteLength),
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    if (error instanceof AdminStorageConfigurationError) {
      return new NextResponse('Media storage unavailable', {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return new NextResponse('Not found', { status: 404 });
    }
    console.error('[uploads] Failed to read image');
    return new NextResponse('Media unavailable', {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { filename } = await params;
  return readUpload(filename);
}

export async function HEAD(_request: Request, { params }: RouteParams) {
  const { filename } = await params;
  const response = await readUpload(filename);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
