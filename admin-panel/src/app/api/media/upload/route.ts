import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdminSession } from '@/lib/auth';
import {
  AdminStorageConfigurationError,
  getAdminPublicOrigin,
  getAdminUploadDir,
} from '@/lib/admin-storage';
import { createSafeImageFilename, validateImageBuffer } from '@/lib/media-validation';

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_EXPECTED_DIMENSION = 12_000;

function parseExpectedDimension(value: FormDataEntryValue | null): number | null {
  if (value === null || value === '') return 0;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_EXPECTED_DIMENSION) return null;
  return parsed;
}

function storageUnavailable(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Media storage is unavailable' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}

/** Session- and same-origin-protected raster image upload. */
export async function POST(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Expected multipart/form-data' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { success: false, error: 'Missing "file" field in form data' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }
  if (file.size < 1 || file.size > MAX_SIZE) {
    return NextResponse.json(
      { success: false, error: `File size must be between 1 byte and ${MAX_SIZE / 1024 / 1024}MB` },
      { status: file.size > MAX_SIZE ? 413 : 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const expectedWidth = parseExpectedDimension(formData.get('expectedWidth'));
  const expectedHeight = parseExpectedDimension(formData.get('expectedHeight'));
  if (
    expectedWidth === null
    || expectedHeight === null
    || (expectedWidth === 0) !== (expectedHeight === 0)
  ) {
    return NextResponse.json(
      { success: false, error: 'Expected dimensions must be valid width and height values' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let image;
  try {
    image = validateImageBuffer(buffer, file.type);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid image file';
    return NextResponse.json(
      { success: false, error: message },
      { status: 415, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (expectedWidth && expectedHeight) {
    const tolerance = 0.05;
    const widthMatches = image.width >= expectedWidth * (1 - tolerance)
      && image.width <= expectedWidth * (1 + tolerance);
    const heightMatches = image.height >= expectedHeight * (1 - tolerance)
      && image.height <= expectedHeight * (1 + tolerance);
    if (!widthMatches || !heightMatches) {
      return NextResponse.json(
        {
          success: false,
          error: `Image dimensions ${image.width}×${image.height} px do not match the required ${expectedWidth}×${expectedHeight} px (±5% allowed).`,
        },
        { status: 422, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }

  const originalName = typeof (file as File).name === 'string'
    ? (file as File).name
    : 'image';
  const filename = createSafeImageFilename(originalName, image.extension, randomUUID());

  try {
    const uploadDir = getAdminUploadDir();
    const publicOrigin = getAdminPublicOrigin(request);
    await fs.mkdir(uploadDir, { recursive: true, mode: 0o750 });
    await fs.writeFile(path.join(
      /* turbopackIgnore: true */ uploadDir,
      filename
    ), buffer, {
      flag: 'wx',
      mode: 0o640,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: `${publicOrigin}/uploads/${encodeURIComponent(filename)}`,
        filename,
        size: file.size,
        type: image.mimeType,
      },
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof AdminStorageConfigurationError) return storageUnavailable();
    console.error('[media] Failed to persist uploaded image');
    return NextResponse.json(
      { success: false, error: 'Could not save uploaded image' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
