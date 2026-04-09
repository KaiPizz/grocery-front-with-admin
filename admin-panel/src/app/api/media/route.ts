import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireApiKey } from '@/lib/auth';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

interface MediaItem {
  filename: string;
  url: string;
  size: number;
  modifiedAt: string;
}

/**
 * GET /api/media — List all uploaded media files
 */
export async function GET(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const files = await fs.readdir(UPLOAD_DIR);

    const mediaItems: MediaItem[] = [];
    for (const file of files) {
      if (file === '.gitkeep') continue;
      const filePath = path.join(UPLOAD_DIR, file);
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      const host = request.headers.get('host') || 'localhost:4100';
      const protocol = host.startsWith('localhost') ? 'http' : 'https';

      mediaItems.push({
        filename: file,
        url: `${protocol}://${host}/uploads/${file}`,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    }

    mediaItems.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return NextResponse.json({
      success: true,
      data: mediaItems,
      total: mediaItems.length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to list media files' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/media?filename=xxx — Delete a media file
 */
export async function DELETE(request: NextRequest) {
  const authError = requireApiKey(request);
  if (authError) return authError;

  const filename = request.nextUrl.searchParams.get('filename');
  if (!filename) {
    return NextResponse.json(
      { success: false, error: 'Missing filename parameter' },
      { status: 400 }
    );
  }

  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = path.join(UPLOAD_DIR, safe);

  try {
    await fs.unlink(filePath);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'File not found or could not be deleted' },
      { status: 404 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
