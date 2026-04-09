import { NextRequest, NextResponse } from 'next/server';
import { requireApiKey } from '@/lib/auth';
import { publishConfig } from '@/lib/config-repository';

interface RouteParams {
  params: { slug: string };
}

/**
 * POST /api/config/:slug/publish
 * Admin-only: copies draft → published, making it live for the storefront.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { slug } = params;

  const authError = requireApiKey(request);
  if (authError) return authError;

  if (!slug || slug.length > 200) {
    return NextResponse.json(
      { success: false, error: 'Invalid slug' },
      { status: 400 }
    );
  }

  const stored = await publishConfig(slug);

  return NextResponse.json({
    success: true,
    data: {
      slug: stored.slug,
      config: stored.published,
      version: stored.version,
      updatedAt: stored.updatedAt,
    },
    message: 'Config published successfully. Storefront will pick up changes within cache TTL.',
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
