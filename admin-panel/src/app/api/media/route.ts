import fs from 'fs/promises';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

import { requireAdminSession } from '@/lib/auth';
import {
  AdminStorageConfigurationError,
  getAdminPublicOrigin,
  getAdminUploadDir,
} from '@/lib/admin-storage';
import { isSafeStoredImageFilename } from '@/lib/media-validation';

interface MediaItem {
  filename: string;
  url: string;
  size: number;
  modifiedAt: string;
}

function storageUnavailable(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Media storage is unavailable' },
    { status: 503, headers: { 'Cache-Control': 'no-store' } }
  );
}

/** Session-protected media listing. */
export async function GET(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  try {
    const uploadDir = getAdminUploadDir();
    const publicOrigin = getAdminPublicOrigin(request);
    await fs.mkdir(uploadDir, { recursive: true, mode: 0o750 });
    const files = await fs.readdir(uploadDir);

    const mediaItems: MediaItem[] = [];
    for (const file of files) {
      if (!isSafeStoredImageFilename(file)) continue;
      const filePath = path.join(
        /* turbopackIgnore: true */ uploadDir,
        file
      );
      let stat;
      try {
        stat = await fs.lstat(filePath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
        throw error;
      }
      if (!stat.isFile()) continue;

      mediaItems.push({
        filename: file,
        url: `${publicOrigin}/uploads/${encodeURIComponent(file)}`,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    }

    mediaItems.sort((a, b) => (
      new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime()
    ));

    return NextResponse.json(
      { success: true, data: mediaItems, total: mediaItems.length },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (error instanceof AdminStorageConfigurationError) return storageUnavailable();
    console.error('[media] Failed to list media files');
    return NextResponse.json(
      { success: false, error: 'Failed to list media files' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

/** Session- and same-origin-protected media deletion. */
export async function DELETE(request: NextRequest) {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const filename = request.nextUrl.searchParams.get('filename');
  if (!filename || !isSafeStoredImageFilename(filename)) {
    return NextResponse.json(
      { success: false, error: 'Invalid filename parameter' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const filePath = path.join(
      /* turbopackIgnore: true */ getAdminUploadDir(),
      filename
    );
    await fs.unlink(filePath);
    return NextResponse.json(
      { success: true },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    if (error instanceof AdminStorageConfigurationError) return storageUnavailable();
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.error('[media] Failed to delete media file');
    return NextResponse.json(
      { success: false, error: 'Could not delete media file' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
