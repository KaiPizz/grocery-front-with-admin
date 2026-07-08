import fs from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UPLOAD_DIR = process.env.ADMIN_UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');

interface RouteParams {
  params: { filename: string };
}

const CONTENT_TYPES: Record<string, string> = {
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.jfif': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function safeFilename(value: string): string | null {
  if (!/^[a-zA-Z0-9._-]+$/.test(value)) return null;
  return value;
}

async function readUpload(filename: string): Promise<NextResponse> {
  const safe = safeFilename(filename);
  if (!safe) {
    return new NextResponse('Not found', { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, safe);
  const resolved = path.resolve(filePath);
  const uploadRoot = path.resolve(UPLOAD_DIR);

  if (!resolved.startsWith(`${uploadRoot}${path.sep}`)) {
    return new NextResponse('Not found', { status: 404 });
  }

  try {
    const file = await fs.readFile(resolved);
    const ext = path.extname(safe).toLowerCase();

    return new NextResponse(file, {
      headers: {
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Type': CONTENT_TYPES[ext] ?? 'application/octet-stream',
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  return readUpload(params.filename);
}

export async function HEAD(_request: Request, { params }: RouteParams) {
  const response = await readUpload(params.filename);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
